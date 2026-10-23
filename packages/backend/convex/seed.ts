import { v } from "convex/values";

import { internalMutation, type MutationCtx } from "./_generated/server";

export const overview = internalMutation({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, { tokenIdentifier: userId }) => {
    await clearUser(ctx, userId);

    const carneLeaoSetembro = await ctx.db.insert("obligations", {
      userId,
      kind: "carneLeao",
      anoCalendario: 2026,
      month: 9,
      dueOn: "2026-10-30",
      status: "upcoming",
    });
    await ctx.db.insert("guides", {
      userId,
      obligationId: carneLeaoSetembro,
      amountCentavos: 684217,
      preparedAt: new Date("2026-10-22T09:00:00-03:00").getTime(),
      status: "awaitingApproval",
    });

    const dasOutubro = await ctx.db.insert("obligations", {
      userId,
      kind: "dasMei",
      anoCalendario: 2026,
      month: 10,
      dueOn: "2026-11-20",
      status: "upcoming",
    });
    await ctx.db.insert("guides", {
      userId,
      obligationId: dasOutubro,
      amountCentavos: 8605,
      preparedAt: new Date("2026-10-21T09:00:00-03:00").getTime(),
      status: "scheduled",
      approvedAt: new Date("2026-10-21T18:30:00-03:00").getTime(),
      debitOn: "2026-11-20",
    });

    await ctx.db.insert("obligations", {
      userId,
      kind: "carneLeao",
      anoCalendario: 2026,
      month: 10,
      dueOn: "2026-11-30",
      status: "needsUser",
    });

    await ctx.db.insert("obligations", {
      userId,
      kind: "dirpf",
      anoCalendario: 2026,
      status: "upcoming",
    });

    const dasSetembro = await ctx.db.insert("obligations", {
      userId,
      kind: "dasMei",
      anoCalendario: 2026,
      month: 9,
      dueOn: "2026-10-20",
      status: "upcoming",
    });
    await ctx.db.insert("guides", {
      userId,
      obligationId: dasSetembro,
      amountCentavos: 8605,
      preparedAt: new Date("2026-10-15T09:00:00-03:00").getTime(),
      status: "paid",
      approvedAt: new Date("2026-10-16T12:00:00-03:00").getTime(),
      paidOn: "2026-10-20",
    });

    const carneLeaoAgosto = await ctx.db.insert("obligations", {
      userId,
      kind: "carneLeao",
      anoCalendario: 2026,
      month: 8,
      dueOn: "2026-09-30",
      status: "upcoming",
    });
    await ctx.db.insert("guides", {
      userId,
      obligationId: carneLeaoAgosto,
      amountCentavos: 611540,
      preparedAt: new Date("2026-09-24T09:00:00-03:00").getTime(),
      status: "paid",
      approvedAt: new Date("2026-09-25T10:00:00-03:00").getTime(),
      paidOn: "2026-09-30",
    });

    await ctx.db.insert("foreignIncomeQuestions", {
      userId,
      institution: "Itaú",
      anoCalendario: 2026,
      month: 10,
      transactionCount: 3,
      amountCents: 420000,
      currency: "USD",
      status: "open",
    });

    await ctx.db.insert("connections", {
      userId,
      institution: "Itaú",
      status: "expiring",
      expiresOn: "2026-10-29",
    });
  },
});

async function clearUser(ctx: MutationCtx, userId: string) {
  const rows = [
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
  ];
  await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
}
