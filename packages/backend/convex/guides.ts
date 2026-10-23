import { v, type Infer } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { toSaoPauloDate } from "./lib/connectionStatus";
import { requireUserId } from "./lib/identity";
import { formatBrl } from "./lib/money";
import {
  currentGuide,
  getOwnedGuide,
  getOwnedObligation,
  guideFields,
  obligationFields,
  obligationIdFrom,
} from "./lib/obligation";
import { payGuide } from "./lib/payment";
import { issueGuide } from "./lib/receita";
import { calculate } from "./lib/rules/calculate";
import { calculation } from "./lib/rules/calculation";
import { obligationSummary, summarize } from "./overview";
import { receitaDocument } from "./schema";

const guideRowFields = {
  guideId: v.id("guides"),
  obligation: obligationSummary,
  amountCentavos: v.number(),
  preparedAt: v.number(),
};

const guideRow = v.union(
  v.object({ ...guideRowFields, status: v.literal("awaitingApproval") }),
  v.object({ ...guideRowFields, status: v.literal("scheduled"), debitOn: v.string() }),
  v.object({ ...guideRowFields, status: v.literal("paid"), paidOn: v.string() }),
);

export type GuideRow = Infer<typeof guideRow>;

const prepareResult = v.union(
  v.object({ status: v.literal("preparing") }),
  v.object({ status: v.literal("needsUser"), reason: v.string() }),
);

export const list = query({
  args: {},
  returns: v.array(guideRow),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const guides = await ctx.db
      .query("guides")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect();

    const rows = await Promise.all(
      guides.map(async (guide): Promise<GuideRow[]> => {
        if (guide.status === "canceled") return [];
        const obligation = await ctx.db.get(guide.obligationId);
        if (obligation === null) {
          throw new Error(`Obligation ${guide.obligationId} not found`);
        }
        const fields = {
          guideId: guide._id,
          obligation: summarize(obligation),
          amountCentavos: guide.amountCentavos,
          preparedAt: guide.preparedAt,
        };
        if (guide.status === "scheduled") {
          return [{ ...fields, status: guide.status, debitOn: guide.debitOn }];
        }
        if (guide.status === "paid") {
          return [{ ...fields, status: guide.status, paidOn: guide.paidOn }];
        }
        return [{ ...fields, status: guide.status }];
      }),
    );

    return rows.flat().sort((a, b) => b.preparedAt - a.preparedAt);
  },
});

export const prepare = mutation({
  args: { obligationId: v.id("obligations") },
  returns: prepareResult,
  handler: async (ctx, { obligationId }) =>
    prepareGuide(ctx, await requireUserId(ctx), obligationId),
});

export const prepareFor = internalMutation({
  args: { userId: v.string(), obligationId: v.string() },
  returns: prepareResult,
  handler: async (ctx, { userId, obligationId }) =>
    prepareGuide(ctx, userId, obligationIdFrom(ctx, obligationId)),
});

export const issue = internalAction({
  args: {
    obligationId: v.id("obligations"),
    calculation,
    idempotencyKey: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { obligationId, calculation, idempotencyKey }) => {
    const request = await ctx.runQuery(internal.guides.guideRequest, { obligationId });
    try {
      const document = await issueGuide({
        ...request,
        amountCentavos: calculation.amountCentavos,
        dueOn: calculation.dueOn,
        idempotencyKey,
      });
      await ctx.runMutation(internal.guides.saveIssued, { obligationId, calculation, document });
    } catch (error) {
      await ctx.runMutation(internal.guides.failIssue, {
        obligationId,
        evidence: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});

export const guideRequest = internalQuery({
  args: { obligationId: v.id("obligations") },
  returns: v.object({
    kind: v.union(v.literal("dasMei"), v.literal("dasSimples"), v.literal("carneLeao")),
    anoCalendario: v.number(),
    month: v.number(),
  }),
  handler: async (ctx, { obligationId }) => {
    const obligation = await ctx.db.get(obligationId);
    if (obligation === null) {
      throw new Error(`Obligation ${obligationId} not found`);
    }
    const { kind, anoCalendario, month } = obligation;
    if (kind === "dirpf" || month === undefined) {
      throw new Error(`Obligation ${obligationId} has no monthly guide`);
    }
    return { kind, anoCalendario, month };
  },
});

export const saveIssued = internalMutation({
  args: { obligationId: v.id("obligations"), calculation, document: receitaDocument },
  returns: v.null(),
  handler: async (ctx, { obligationId, calculation, document }) => {
    const obligation = await ctx.db.get(obligationId);
    if (obligation === null || obligation.status !== "preparing") return null;

    if (document.amountCentavos !== calculation.amountCentavos) {
      await ctx.db.replace(obligationId, {
        ...obligationFields(obligation),
        status: "needsUser",
        reason: `A Receita emitiu a guia com ${formatBrl(document.amountCentavos)}, mas o nosso cálculo deu ${formatBrl(calculation.amountCentavos)}. Não vamos pagar até entender a diferença.`,
      });
      return null;
    }

    await ctx.db.insert("guides", {
      userId: obligation.userId,
      obligationId,
      amountCentavos: document.amountCentavos,
      calculation,
      document,
      preparedAt: Date.now(),
      status: "awaitingApproval",
    });
    await ctx.db.replace(obligationId, {
      ...obligationFields(obligation),
      dueOn: document.dueOn,
      status: "upcoming",
    });
    return null;
  },
});

export const failIssue = internalMutation({
  args: { obligationId: v.id("obligations"), evidence: v.string() },
  returns: v.null(),
  handler: async (ctx, { obligationId, evidence }) => {
    const obligation = await ctx.db.get(obligationId);
    if (obligation === null || obligation.status !== "preparing") return null;
    await ctx.db.replace(obligationId, {
      ...obligationFields(obligation),
      status: "needsUser",
      reason: `A Receita não emitiu a guia: ${evidence}. Tente de novo mais tarde ou siga o passo a passo para emitir por conta própria.`,
    });
    return null;
  },
});

export const approve = mutation({
  args: { guideId: v.id("guides"), documentHash: v.string() },
  returns: v.null(),
  handler: async (ctx, { guideId, documentHash }) => {
    const guide = await getOwnedGuide(ctx, await requireUserId(ctx), guideId);
    if (guide.status !== "awaitingApproval") {
      throw new Error(`Guide ${guideId} is ${guide.status}, not awaiting approval`);
    }
    if (guide.document.hash !== documentHash) {
      throw new Error(`Guide ${guideId} changed since it was reviewed`);
    }
    const debitOn = guide.document.dueOn;
    if (debitOn < toSaoPauloDate(Date.now())) {
      throw new Error(`Guide ${guideId} expired on ${debitOn}`);
    }

    const paymentJobId = await ctx.scheduler.runAt(
      Date.parse(`${debitOn}T09:00:00-03:00`),
      internal.guides.pay,
      { guideId },
    );
    await ctx.db.replace(guideId, {
      ...guideFields(guide),
      status: "scheduled",
      approval: { approvedAt: Date.now(), channel: "web", documentHash },
      debitOn,
      paymentJobId,
    });
    return null;
  },
});

export const revoke = mutation({
  args: { guideId: v.id("guides") },
  returns: v.null(),
  handler: async (ctx, { guideId }) => {
    const guide = await getOwnedGuide(ctx, await requireUserId(ctx), guideId);
    if (guide.status !== "scheduled") {
      throw new Error(`Guide ${guideId} is ${guide.status}, not scheduled`);
    }
    await ctx.scheduler.cancel(guide.paymentJobId);
    await ctx.db.replace(guideId, { ...guideFields(guide), status: "awaitingApproval" });
    return null;
  },
});

export const pay = internalAction({
  args: { guideId: v.id("guides") },
  returns: v.null(),
  handler: async (ctx, { guideId }) => {
    const guide = await ctx.runQuery(internal.guides.scheduledGuide, { guideId });
    if (guide === null) return null;
    const { paymentProof } = await payGuide({ ...guide, idempotencyKey: guideId });
    await ctx.runMutation(internal.guides.markPaid, { guideId, paymentProof });
    return null;
  },
});

export const scheduledGuide = internalQuery({
  args: { guideId: v.id("guides") },
  returns: v.union(v.null(), v.object({ barcode: v.string(), amountCentavos: v.number() })),
  handler: async (ctx, { guideId }) => {
    const guide = await ctx.db.get(guideId);
    if (guide === null || guide.status !== "scheduled") return null;
    return { barcode: guide.document.barcode, amountCentavos: guide.amountCentavos };
  },
});

export const markPaid = internalMutation({
  args: { guideId: v.id("guides"), paymentProof: v.string() },
  returns: v.null(),
  handler: async (ctx, { guideId, paymentProof }) => {
    const guide = await ctx.db.get(guideId);
    if (guide === null || guide.status !== "scheduled") return null;
    await ctx.db.replace(guideId, {
      ...guideFields(guide),
      status: "paid",
      approval: guide.approval,
      paidOn: toSaoPauloDate(Date.now()),
      paymentProof,
    });
    return null;
  },
});

async function prepareGuide(
  ctx: MutationCtx,
  userId: string,
  obligationId: Id<"obligations">,
): Promise<Infer<typeof prepareResult>> {
  const obligation = await getOwnedObligation(ctx, userId, obligationId);
  if (obligation.status === "preparing" || obligation.status === "doneByUser") {
    throw new Error(`Obligation ${obligationId} is ${obligation.status}`);
  }

  const guide = await currentGuide(ctx, obligationId);
  if (guide !== null && guide.status !== "awaitingApproval") {
    throw new Error(`Obligation ${obligationId} already has a ${guide.status} guide`);
  }

  const result = calculate(obligation);
  if (result.status === "unsupported") {
    await ctx.db.replace(obligationId, {
      ...obligationFields(obligation),
      status: "needsUser",
      reason: result.reason,
    });
    return { status: "needsUser", reason: result.reason };
  }

  if (guide !== null) {
    await ctx.db.replace(guide._id, {
      ...guideFields(guide),
      status: "canceled",
      canceledAt: Date.now(),
    });
  }
  await ctx.db.replace(obligationId, { ...obligationFields(obligation), status: "preparing" });
  await ctx.scheduler.runAfter(0, internal.guides.issue, {
    obligationId,
    calculation: result.calculation,
    idempotencyKey: `${obligationId}-${Date.now()}`,
  });
  return { status: "preparing" };
}
