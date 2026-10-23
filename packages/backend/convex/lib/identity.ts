import type { QueryCtx } from "../_generated/server";

export async function requireUserId(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return identity.tokenIdentifier;
}
