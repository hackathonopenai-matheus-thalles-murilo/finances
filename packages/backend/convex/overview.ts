import { v, type Infer } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/identity";
import { currentGuide } from "./lib/obligation";
import { getProfile } from "./lib/profile";
import { factSuggestion, obligationKind } from "./schema";
import { latestRun } from "./setup";

export const obligationSummary = v.object({
  kind: obligationKind,
  anoCalendario: v.number(),
  month: v.optional(v.number()),
});

const pendencia = v.union(
  v.object({
    type: v.literal("approval"),
    guideId: v.id("guides"),
    obligationId: v.id("obligations"),
    obligation: obligationSummary,
    amountCentavos: v.number(),
    dueOn: v.optional(v.string()),
    preparedAt: v.number(),
  }),
  v.object({
    type: v.literal("foreignIncome"),
    questionId: v.id("foreignIncomeQuestions"),
    institution: v.string(),
    anoCalendario: v.number(),
    month: v.number(),
    transactionCount: v.number(),
    amountCents: v.number(),
    currency: v.string(),
  }),
  v.object({
    type: v.literal("connection"),
    connectionId: v.id("connections"),
    institution: v.string(),
    status: v.union(v.literal("expiring"), v.literal("expired")),
    expiresOn: v.string(),
  }),
  v.object({
    type: v.literal("onboarding"),
  }),
  v.object({
    type: v.literal("fact"),
    factId: v.id("profileFacts"),
    suggestion: factSuggestion,
    evidence: v.string(),
  }),
  v.object({
    type: v.literal("setupFailed"),
  }),
);

const scheduledGuide = v.object({
  guideId: v.id("guides"),
  obligation: obligationSummary,
  amountCentavos: v.number(),
  approvedAt: v.number(),
  debitOn: v.string(),
});

const paidGuide = v.object({
  guideId: v.id("guides"),
  obligation: obligationSummary,
  amountCentavos: v.number(),
  paidOn: v.string(),
});

const dueObligation = v.object({
  obligationId: v.id("obligations"),
  obligation: obligationSummary,
  dueOn: v.optional(v.string()),
  status: v.union(
    v.literal("upcoming"),
    v.literal("preparing"),
    v.literal("needsUser"),
    v.literal("awaitingApproval"),
    v.literal("scheduled"),
  ),
});

export type ObligationSummary = Infer<typeof obligationSummary>;
export type Pendencia = Infer<typeof pendencia>;
export type ScheduledGuide = Infer<typeof scheduledGuide>;
export type PaidGuide = Infer<typeof paidGuide>;
export type DueObligation = Infer<typeof dueObligation>;

export const get = query({
  args: { anoCalendario: v.number() },
  returns: v.object({
    hasFiscalProfile: v.boolean(),
    isPreparing: v.boolean(),
    pendencias: v.array(pendencia),
    scheduled: v.array(scheduledGuide),
    paid: v.array(paidGuide),
    dueSoon: v.array(dueObligation),
  }),
  handler: async (ctx, { anoCalendario }) => {
    const userId = await requireUserId(ctx);
    const profile = await getProfile(ctx, userId);

    const run = await latestRun(ctx, userId);

    const pendencias: Pendencia[] = [
      ...(await factPendencias(ctx, userId)),
      ...(await approvalPendencias(ctx, userId)),
      ...(await foreignIncomePendencias(ctx, userId)),
      ...(await connectionPendencias(ctx, userId, "expired")),
      ...(await connectionPendencias(ctx, userId, "expiring")),
    ];
    if (profile !== null && profile.onboardedAt === undefined) {
      pendencias.push({ type: "onboarding" });
    }
    if (run?.status === "failed") {
      pendencias.push({ type: "setupFailed" });
    }

    const obligations = await ctx.db
      .query("obligations")
      .withIndex("by_user_anoCalendario", (q) =>
        q.eq("userId", userId).eq("anoCalendario", anoCalendario),
      )
      .collect();

    const scheduled: ScheduledGuide[] = [];
    const paid: PaidGuide[] = [];
    const dueSoon: DueObligation[] = [];

    for (const obligation of obligations) {
      if (obligation.status === "doneByUser") continue;
      const guide = await currentGuide(ctx, obligation._id);
      const summary = summarize(obligation);

      if (guide?.status === "paid") {
        paid.push({
          guideId: guide._id,
          obligation: summary,
          amountCentavos: guide.amountCentavos,
          paidOn: guide.paidOn,
        });
        continue;
      }

      dueSoon.push({
        obligationId: obligation._id,
        obligation: summary,
        dueOn: obligation.dueOn,
        status: guide === null ? obligation.status : guide.status,
      });

      if (guide?.status === "scheduled") {
        scheduled.push({
          guideId: guide._id,
          obligation: summary,
          amountCentavos: guide.amountCentavos,
          approvedAt: guide.approval.approvedAt,
          debitOn: guide.debitOn,
        });
      }
    }

    return {
      hasFiscalProfile: profile !== null,
      isPreparing: run?.status === "running",
      pendencias,
      scheduled,
      paid: paid.sort((a, b) => b.paidOn.localeCompare(a.paidOn)).slice(0, 3),
      dueSoon: dueSoon.sort(byDueOn).slice(0, 5),
    };
  },
});

export function summarize(obligation: Doc<"obligations">) {
  return {
    kind: obligation.kind,
    anoCalendario: obligation.anoCalendario,
    month: obligation.month,
  };
}

function byDueOn(a: DueObligation, b: DueObligation) {
  if (a.dueOn === undefined) return 1;
  if (b.dueOn === undefined) return -1;
  return a.dueOn.localeCompare(b.dueOn);
}

async function getObligation(ctx: QueryCtx, obligationId: Id<"obligations">) {
  const obligation = await ctx.db.get(obligationId);
  if (obligation === null) {
    throw new Error(`Obligation ${obligationId} not found`);
  }
  return obligation;
}

async function approvalPendencias(ctx: QueryCtx, userId: string): Promise<Pendencia[]> {
  const guides = await ctx.db
    .query("guides")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "awaitingApproval"))
    .collect();

  return Promise.all(
    guides.map(async (guide) => {
      const obligation = await getObligation(ctx, guide.obligationId);
      return {
        type: "approval",
        guideId: guide._id,
        obligationId: obligation._id,
        obligation: summarize(obligation),
        amountCentavos: guide.amountCentavos,
        dueOn: obligation.dueOn,
        preparedAt: guide.preparedAt,
      };
    }),
  );
}

async function factPendencias(ctx: QueryCtx, userId: string): Promise<Pendencia[]> {
  const facts = await ctx.db
    .query("profileFacts")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "proposed"))
    .collect();

  return facts.flatMap((fact): Pendencia[] => {
    if (fact.status !== "proposed") return [];
    return [
      { type: "fact", factId: fact._id, suggestion: fact.suggestion, evidence: fact.evidence },
    ];
  });
}

async function foreignIncomePendencias(ctx: QueryCtx, userId: string): Promise<Pendencia[]> {
  const questions = await ctx.db
    .query("foreignIncomeQuestions")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "open"))
    .collect();

  return questions.map((question) => ({
    type: "foreignIncome",
    questionId: question._id,
    institution: question.institution,
    anoCalendario: question.anoCalendario,
    month: question.month,
    transactionCount: question.transactionIds.length,
    amountCents: question.amountCents,
    currency: question.currency,
  }));
}

async function connectionPendencias(
  ctx: QueryCtx,
  userId: string,
  status: "expiring" | "expired",
): Promise<Pendencia[]> {
  const connections = await ctx.db
    .query("connections")
    .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", status))
    .collect();

  return connections.flatMap((connection): Pendencia[] => {
    if (connection.status === "expiring" || connection.status === "expired") {
      return [
        {
          type: "connection",
          connectionId: connection._id,
          institution: connection.institution,
          status,
          expiresOn: connection.expiresOn,
        },
      ];
    }
    return [];
  });
}
