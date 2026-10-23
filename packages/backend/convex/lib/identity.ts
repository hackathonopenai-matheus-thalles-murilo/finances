import type { Auth } from "convex/server";

export async function requireUserId(ctx: { auth: Auth }) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return identity.tokenIdentifier;
}
