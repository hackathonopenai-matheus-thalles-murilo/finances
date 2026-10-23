import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { issueGuide } from "./lib/receita";
import { calculate } from "./lib/rules/calculate";
import type { CarneLeaoFacts } from "./lib/rules/carneLeao";
import type { DasMeiFacts } from "./lib/rules/dasMei";
import { dueOnFor } from "./lib/rules/dueOn";

export const overview = internalMutation({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier: userId }) => {
    await clearUser(ctx, userId);

    await ctx.db.insert("fiscalProfiles", {
      userId,
      situations: ["foreignIncome", "company"],
      onboardedAt: new Date("2026-09-01T10:00:00-03:00").getTime(),
    });

    const dasMeiFacts: DasMeiFacts = { kind: "dasMei", activity: "servicos" };

    const dasMeiSetembro = await insertObligation(ctx, userId, "dasMei", 9, dasMeiFacts);
    await insertPaidGuide(ctx, dasMeiSetembro, "2026-10-16T12:00:00-03:00", "2026-10-20");

    const dasMeiOutubro = await insertObligation(ctx, userId, "dasMei", 10, dasMeiFacts);
    await insertScheduledGuide(ctx, dasMeiOutubro, "2026-10-21T18:30:00-03:00");

    const carneLeaoAgosto = await insertObligation(
      ctx,
      userId,
      "carneLeao",
      8,
      carneLeaoFacts("2026-08-05", "2026-07-15", 53120),
    );
    await insertPaidGuide(ctx, carneLeaoAgosto, "2026-09-25T10:00:00-03:00", "2026-09-30");

    const carneLeaoSetembro = await insertObligation(
      ctx,
      userId,
      "carneLeao",
      9,
      carneLeaoFacts("2026-09-04", "2026-08-14", 54210),
    );
    await insertGuide(ctx, carneLeaoSetembro);

    const carneLeaoOutubro = await insertObligation(ctx, userId, "carneLeao", 10, undefined);
    await ctx.db.patch(carneLeaoOutubro, {
      status: "needsUser",
      reason: "Confirme se os recebimentos de outubro no Itaú são renda do exterior.",
    });

    await ctx.db.insert("obligations", {
      userId,
      kind: "dirpf",
      anoCalendario: 2026,
      status: "upcoming",
    });

    const connectionId = await ctx.db.insert("connections", {
      userId,
      institution: "Itaú",
      situations: ["foreignIncome"],
      externalId: "seed-itau",
      institutionId: "seed-itau",
      sync: "synced",
      status: "expiring",
      expiresOn: "2026-10-29",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      connectionId,
      externalId: "seed-itau-usd",
      name: "Conta Global",
      type: "bank",
      currency: "USD",
    });
    const transactionIds = await Promise.all(
      [
        { postedAt: "2026-10-03T03:00:00.000Z", amountCents: 150000 },
        { postedAt: "2026-10-10T03:00:00.000Z", amountCents: 120000 },
        { postedAt: "2026-10-17T03:00:00.000Z", amountCents: 150000 },
      ].map(({ postedAt, amountCents }, index) =>
        ctx.db.insert("transactions", {
          userId,
          connectionId,
          accountId,
          externalId: `seed-itau-usd-${index}`,
          postedAt,
          description: "WISE PAYMENTS ACME LLC",
          amountCents,
          direction: "credit",
          currency: "USD",
          status: "posted",
          syncedAt: Date.now(),
        }),
      ),
    );
    await ctx.db.insert("foreignIncomeQuestions", {
      userId,
      connectionId,
      institution: "Itaú",
      anoCalendario: 2026,
      month: 10,
      transactionIds,
      amountCents: 420000,
      currency: "USD",
      status: "open",
    });

    const noteId = await ctx.db.insert("profileNotes", {
      userId,
      channel: "web",
      text: "Trabalho para uma empresa dos EUA e tenho um MEI de design.",
    });
    await ctx.db.insert("profileFacts", {
      userId,
      source: { type: "note", noteId },
      evidence: "Você contou que tem um MEI de design.",
      status: "confirmed",
      fact: { kind: "mei", activity: "servicos" },
      confirmedAt: new Date("2026-09-01T10:05:00-03:00").getTime(),
      channel: "web",
    });
  },
});

async function clearUser(ctx: MutationCtx, userId: string) {
  const rows = [
    ...(await ctx.db
      .query("fiscalProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("profileNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("transactions")
      .withIndex("by_user_postedAt", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("connections")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("obligations")
      .withIndex("by_user_anoCalendario", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("guides")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("foreignIncomeQuestions")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("profileFacts")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect()),
    ...(await ctx.db
      .query("setupRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()),
  ];
  await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
}

const anoCalendario = 2026;

function carneLeaoFacts(
  receivedOn: string,
  ptaxOn: string,
  ptaxCompraTenThousandths: number,
): CarneLeaoFacts {
  return {
    kind: "carneLeao",
    receipts: [{ receivedOn, amountUsdCents: 300000, ptaxOn, ptaxCompraTenThousandths }],
    dependentes: 0,
    previdenciaOficialCentavos: 0,
    pensaoAlimenticiaCentavos: 0,
  };
}

async function insertObligation(
  ctx: MutationCtx,
  userId: string,
  kind: "dasMei" | "carneLeao",
  month: number,
  facts: Doc<"obligations">["facts"],
) {
  return ctx.db.insert("obligations", {
    userId,
    kind,
    anoCalendario,
    month,
    dueOn: dueOnFor(kind, anoCalendario, month),
    facts,
    status: "upcoming",
  });
}

async function insertGuide(ctx: MutationCtx, obligationId: Id<"obligations">) {
  const obligation = await ctx.db.get(obligationId);
  if (obligation === null || obligation.month === undefined || obligation.kind === "dirpf") {
    throw new Error(`Seed obligation ${obligationId} has no monthly guide`);
  }
  const result = calculate(obligation);
  if (result.status === "unsupported") {
    throw new Error(`Seed obligation ${obligationId} is unsupported: ${result.reason}`);
  }
  const { calculation } = result;
  const document = await issueGuide({
    kind: obligation.kind,
    anoCalendario: obligation.anoCalendario,
    month: obligation.month,
    amountCentavos: calculation.amountCentavos,
    dueOn: calculation.dueOn,
    idempotencyKey: `seed-${obligationId}`,
  });
  const guideId = await ctx.db.insert("guides", {
    userId: obligation.userId,
    obligationId,
    amountCentavos: document.amountCentavos,
    calculation,
    document,
    preparedAt: Date.now(),
    status: "awaitingApproval",
  });
  return { guideId, document };
}

async function insertScheduledGuide(
  ctx: MutationCtx,
  obligationId: Id<"obligations">,
  approvedAt: string,
) {
  const { guideId, document } = await insertGuide(ctx, obligationId);
  const paymentJobId = await ctx.scheduler.runAt(
    Date.parse(`${document.dueOn}T09:00:00-03:00`),
    internal.guides.pay,
    { guideId },
  );
  await ctx.db.patch(guideId, {
    status: "scheduled",
    approval: { approvedAt: Date.parse(approvedAt), channel: "web", documentHash: document.hash },
    debitOn: document.dueOn,
    paymentJobId,
  });
}

async function insertPaidGuide(
  ctx: MutationCtx,
  obligationId: Id<"obligations">,
  approvedAt: string,
  paidOn: string,
) {
  const { guideId, document } = await insertGuide(ctx, obligationId);
  await ctx.db.patch(guideId, {
    status: "paid",
    approval: { approvedAt: Date.parse(approvedAt), channel: "web", documentHash: document.hash },
    paidOn,
    paymentProof: `SANDBOX-${guideId}`,
  });
}
