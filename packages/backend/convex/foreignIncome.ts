import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { ensureObligation } from "./lib/deriveObligations";
import { requireUserId } from "./lib/identity";

export const answer = mutation({
  args: { questionId: v.id("foreignIncomeQuestions"), isIncome: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { questionId, isIncome }) => {
    const userId = await requireUserId(ctx);
    const question = await ctx.db.get(questionId);
    if (question === null || question.userId !== userId) {
      throw new Error(`Question ${questionId} not found`);
    }
    if (question.status !== "open") {
      throw new Error(`Question ${questionId} was already answered`);
    }

    await ctx.db.replace(questionId, {
      userId,
      connectionId: question.connectionId,
      institution: question.institution,
      anoCalendario: question.anoCalendario,
      month: question.month,
      transactionIds: question.transactionIds,
      amountCents: question.amountCents,
      currency: question.currency,
      status: "answered",
      isIncome,
      answeredAt: Date.now(),
      channel: "web",
    });

    if (isIncome) {
      await ensureObligation(
        ctx,
        userId,
        "carneLeao",
        question.anoCalendario,
        question.month,
        undefined,
      );
    }
    return null;
  },
});
