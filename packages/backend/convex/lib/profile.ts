import type { QueryCtx } from "../_generated/server";

export async function getProfile(ctx: QueryCtx, userId: string) {
  return ctx.db
    .query("fiscalProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}
