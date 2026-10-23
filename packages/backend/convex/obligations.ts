import { v, type Infer } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { toSaoPauloDate } from "./lib/connectionStatus";
import { requireUserId } from "./lib/identity";
import { instructions, instructionsFor } from "./lib/instructions";
import {
  currentGuide,
  displayStatus,
  getOwnedObligation,
  guideFields,
  obligationFields,
  obligationIdFrom,
} from "./lib/obligation";
import { calculate } from "./lib/rules/calculate";
import { calculation } from "./lib/rules/calculation";
import { obligationSummary, summarize } from "./overview";
import { situationsOf } from "./profile";
import { receitaDocument } from "./schema";

const status = v.union(
  v.literal("upcoming"),
  v.literal("preparing"),
  v.literal("needsUser"),
  v.literal("doneByUser"),
  v.literal("awaitingApproval"),
  v.literal("scheduled"),
  v.literal("paid"),
);

const obligationRow = v.object({
  obligationId: v.id("obligations"),
  obligation: obligationSummary,
  dueOn: v.optional(v.string()),
  amountCentavos: v.optional(v.number()),
  status,
});

const guideDetailFields = {
  guideId: v.id("guides"),
  amountCentavos: v.number(),
  document: receitaDocument,
  preparedAt: v.number(),
};

const obligationDetail = v.object({
  obligationId: v.id("obligations"),
  obligation: obligationSummary,
  dueOn: v.optional(v.string()),
  status,
  state: v.union(
    v.object({ status: v.union(v.literal("upcoming"), v.literal("preparing")) }),
    v.object({ status: v.literal("needsUser"), reason: v.string() }),
    v.object({
      status: v.literal("doneByUser"),
      doneOn: v.string(),
      proofUrl: v.union(v.null(), v.string()),
    }),
  ),
  guide: v.union(
    v.null(),
    v.object({ ...guideDetailFields, status: v.literal("awaitingApproval") }),
    v.object({
      ...guideDetailFields,
      status: v.literal("scheduled"),
      approvedAt: v.number(),
      debitOn: v.string(),
    }),
    v.object({
      ...guideDetailFields,
      status: v.literal("paid"),
      approvedAt: v.number(),
      paidOn: v.string(),
      paymentProof: v.string(),
    }),
  ),
  calculation: v.union(
    v.object({ status: v.literal("calculated"), calculation }),
    v.object({ status: v.literal("unsupported"), reason: v.string() }),
  ),
  instructions,
});

export type ObligationRow = Infer<typeof obligationRow>;
export type ObligationDetail = Infer<typeof obligationDetail>;

export const list = query({
  args: { anoCalendario: v.number() },
  returns: v.array(obligationRow),
  handler: async (ctx, { anoCalendario }) =>
    obligationsOf(ctx, await requireUserId(ctx), anoCalendario),
});

export const listFor = internalQuery({
  args: { userId: v.string(), anoCalendario: v.number() },
  returns: v.array(obligationRow),
  handler: async (ctx, { userId, anoCalendario }) => obligationsOf(ctx, userId, anoCalendario),
});

export const get = query({
  args: { obligationId: v.id("obligations") },
  returns: obligationDetail,
  handler: async (ctx, { obligationId }) => detailOf(ctx, await requireUserId(ctx), obligationId),
});

export const getFor = internalQuery({
  args: { userId: v.string(), obligationId: v.string() },
  returns: obligationDetail,
  handler: async (ctx, { userId, obligationId }) =>
    detailOf(ctx, userId, obligationIdFrom(ctx, obligationId)),
});

export const generateProofUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireUserId(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const markDone = mutation({
  args: {
    obligationId: v.id("obligations"),
    doneOn: v.string(),
    proofId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, { obligationId, doneOn, proofId }) => {
    const obligation = await getOwnedObligation(ctx, await requireUserId(ctx), obligationId);
    if (obligation.status === "preparing" || obligation.status === "doneByUser") {
      throw new Error(`Obligation ${obligationId} is ${obligation.status}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doneOn) || doneOn > toSaoPauloDate(Date.now())) {
      throw new Error(`Invalid doneOn ${doneOn}`);
    }

    const guide = await currentGuide(ctx, obligationId);
    if (guide?.status === "scheduled" || guide?.status === "paid") {
      throw new Error(`Obligation ${obligationId} already has a ${guide.status} guide`);
    }
    if (guide !== null) {
      await ctx.db.replace(guide._id, {
        ...guideFields(guide),
        status: "canceled",
        canceledAt: Date.now(),
      });
    }

    await ctx.db.replace(obligationId, {
      ...obligationFields(obligation),
      status: "doneByUser",
      doneOn,
      proofId,
    });
    return null;
  },
});

export const undoDone = mutation({
  args: { obligationId: v.id("obligations") },
  returns: v.null(),
  handler: async (ctx, { obligationId }) => {
    const obligation = await getOwnedObligation(ctx, await requireUserId(ctx), obligationId);
    if (obligation.status !== "doneByUser") {
      throw new Error(`Obligation ${obligationId} is ${obligation.status}, not done by the user`);
    }
    if (obligation.proofId !== undefined) {
      await ctx.storage.delete(obligation.proofId);
    }
    await ctx.db.replace(obligationId, { ...obligationFields(obligation), status: "upcoming" });
    return null;
  },
});

async function obligationsOf(ctx: QueryCtx, userId: string, anoCalendario: number) {
  const obligations = await ctx.db
    .query("obligations")
    .withIndex("by_user_anoCalendario", (q) =>
      q.eq("userId", userId).eq("anoCalendario", anoCalendario),
    )
    .collect();

  const rows = await Promise.all(
    obligations.map(async (obligation) => {
      const guide = await currentGuide(ctx, obligation._id);
      return {
        obligationId: obligation._id,
        obligation: summarize(obligation),
        dueOn: obligation.dueOn,
        amountCentavos: guide?.amountCentavos,
        status: displayStatus(obligation, guide),
      };
    }),
  );

  return rows.sort(byDueOn);
}

async function detailOf(
  ctx: QueryCtx,
  userId: string,
  obligationId: Id<"obligations">,
): Promise<ObligationDetail> {
  const obligation = await getOwnedObligation(ctx, userId, obligationId);
  const guide = await currentGuide(ctx, obligationId);

  return {
    obligationId,
    obligation: summarize(obligation),
    dueOn: obligation.dueOn,
    status: displayStatus(obligation, guide),
    state: await stateOf(ctx, obligation),
    guide: guideDetailOf(guide),
    calculation:
      guide === null
        ? calculate(obligation)
        : { status: "calculated", calculation: guide.calculation },
    instructions: instructionsFor(obligation, await situationsOf(ctx, userId)),
  };
}

async function stateOf(
  ctx: QueryCtx,
  obligation: Doc<"obligations">,
): Promise<ObligationDetail["state"]> {
  if (obligation.status === "needsUser") {
    return { status: obligation.status, reason: obligation.reason };
  }
  if (obligation.status === "doneByUser") {
    return {
      status: obligation.status,
      doneOn: obligation.doneOn,
      proofUrl:
        obligation.proofId === undefined ? null : await ctx.storage.getUrl(obligation.proofId),
    };
  }
  return { status: obligation.status };
}

function guideDetailOf(guide: Doc<"guides"> | null): ObligationDetail["guide"] {
  if (guide === null || guide.status === "canceled") return null;
  const fields = {
    guideId: guide._id,
    amountCentavos: guide.amountCentavos,
    document: guide.document,
    preparedAt: guide.preparedAt,
  };
  if (guide.status === "scheduled") {
    return {
      ...fields,
      status: guide.status,
      approvedAt: guide.approval.approvedAt,
      debitOn: guide.debitOn,
    };
  }
  if (guide.status === "paid") {
    return {
      ...fields,
      status: guide.status,
      approvedAt: guide.approval.approvedAt,
      paidOn: guide.paidOn,
      paymentProof: guide.paymentProof,
    };
  }
  return { ...fields, status: guide.status };
}

function byDueOn(a: ObligationRow, b: ObligationRow) {
  if (a.dueOn === undefined) return 1;
  if (b.dueOn === undefined) return -1;
  return a.dueOn.localeCompare(b.dueOn);
}
