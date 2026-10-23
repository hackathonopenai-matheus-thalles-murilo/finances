import { v, type Infer } from "convex/values";

import { internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/identity";
import { getProfile } from "./lib/profile";
import { situation } from "./schema";

export type Situation = Infer<typeof situation>;

export const situations = query({
  args: {},
  returns: v.array(situation),
  handler: async (ctx) => situationsOf(ctx, await requireUserId(ctx)),
});

export const situationsFor = internalQuery({
  args: { userId: v.string() },
  returns: v.array(situation),
  handler: async (ctx, { userId }) => situationsOf(ctx, userId),
});

export const saveSituations = mutation({
  args: { situations: v.array(situation) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const situations = [...new Set(args.situations)];
    const profile = await getProfile(ctx, userId);
    if (profile === null) {
      await ctx.db.insert("fiscalProfiles", { userId, situations });
      return null;
    }
    await ctx.db.patch(profile._id, { situations });
    return null;
  },
});

export const postponeOnboarding = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const profile = await getProfile(ctx, userId);
    if (profile === null) {
      await ctx.db.insert("fiscalProfiles", { userId, situations: [] });
    }
    return null;
  },
});

export const finishOnboarding = mutation({
  args: { note: v.string() },
  returns: v.null(),
  handler: async (ctx, { note }) => {
    const userId = await requireUserId(ctx);
    const profile = await getProfile(ctx, userId);
    if (profile === null) {
      throw new Error("Fiscal profile not found");
    }
    const text = note.trim();
    if (text !== "") {
      await ctx.db.insert("profileNotes", { userId, channel: "web", text });
    }
    if (profile.onboardedAt === undefined) {
      await ctx.db.patch(profile._id, { onboardedAt: Date.now() });
    }
    return null;
  },
});

async function situationsOf(ctx: QueryCtx, userId: string) {
  const profile = await getProfile(ctx, userId);
  if (profile === null) return [];
  return profile.situations;
}
