import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import {
  currentAnoCalendario,
  ensureObligation,
  obligationsOf,
  removeIfUntouched,
} from "./lib/deriveObligations";
import { requireUserId } from "./lib/identity";
import { meiActivity } from "./schema";

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const confirm = mutation({
  args: { factId: v.id("profileFacts"), activity: meiActivity },
  returns: v.null(),
  handler: async (ctx, { factId, activity }) => {
    const userId = await requireUserId(ctx);
    const fact = await getOwnedFact(ctx, userId, factId);
    if (fact.status !== "proposed") {
      throw new Error(`Fact ${factId} is ${fact.status}`);
    }

    await ctx.db.replace(factId, {
      userId,
      source: fact.source,
      evidence: fact.evidence,
      status: "confirmed",
      fact: { kind: "mei", activity },
      confirmedAt: Date.now(),
      channel: "web",
    });

    const anoCalendario = currentAnoCalendario();
    for (const month of MONTHS) {
      await ensureObligation(ctx, userId, "dasMei", anoCalendario, month, {
        kind: "dasMei",
        activity,
      });
    }
    return null;
  },
});

export const reject = mutation({
  args: { factId: v.id("profileFacts") },
  returns: v.null(),
  handler: async (ctx, { factId }) => {
    const userId = await requireUserId(ctx);
    const fact = await getOwnedFact(ctx, userId, factId);
    if (fact.status === "rejected") return null;

    const suggestion = fact.status === "confirmed" ? fact.fact : fact.suggestion;
    await ctx.db.replace(factId, {
      userId,
      source: fact.source,
      evidence: fact.evidence,
      status: "rejected",
      suggestion,
    });

    if (fact.status === "confirmed") {
      const obligations = await obligationsOf(ctx, userId, "dasMei", currentAnoCalendario());
      for (const obligation of obligations) {
        await removeIfUntouched(ctx, obligation);
      }
    }
    return null;
  },
});

async function getOwnedFact(ctx: MutationCtx, userId: string, factId: Id<"profileFacts">) {
  const fact = await ctx.db.get(factId);
  if (fact === null || fact.userId !== userId) {
    throw new Error(`Fact ${factId} not found`);
  }
  return fact;
}
