import {
  exchangeDeviceAuthorization,
  parseUser,
  pollDeviceCode,
  requestDeviceCode,
  resolveConfig,
} from "@opencoredev/loginwithchatgpt-core";
import { v, type Infer } from "convex/values";

import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/identity";
import { seal, unseal } from "./lib/sealed";
import { sealTokens } from "./lib/taxAgentModel";
import { sealed } from "./schema";

const accountView = v.union(
  v.object({ status: v.literal("disconnected") }),
  v.object({
    status: v.literal("pending"),
    userCode: v.string(),
    verificationUrl: v.string(),
    expiresAt: v.number(),
  }),
  v.object({ status: v.literal("connected"), email: v.optional(v.string()) }),
  v.object({ status: v.literal("expired") }),
);

export type ChatgptAccount = Infer<typeof accountView>;

export const account = query({
  args: {},
  returns: accountView,
  handler: async (ctx): Promise<ChatgptAccount> => {
    const userId = await requireUserId(ctx);
    const account = await findAccount(ctx, userId);
    if (account === null) return { status: "disconnected" };
    if (account.status === "pending") {
      const { userCode, verificationUrl, expiresAt } = account;
      return { status: "pending", userCode, verificationUrl, expiresAt };
    }
    if (account.status === "connected") return { status: "connected", email: account.email };
    return { status: "expired" };
  },
});

export const startLogin = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const device = await requestDeviceCode(resolveConfig());
    const intervalMs = device.interval * 1000;
    await ctx.runMutation(internal.chatgpt.savePending, {
      userId,
      userCode: device.userCode,
      verificationUrl: device.verificationUrl,
      expiresAt: device.expiresAt,
      deviceAuthId: await seal(device.deviceAuthId),
    });
    await ctx.scheduler.runAfter(intervalMs, internal.chatgpt.pollLogin, {
      userId,
      userCode: device.userCode,
      intervalMs,
    });
    return null;
  },
});

export const disconnect = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await removeAccount(ctx, userId);
    return null;
  },
});

export const pollLogin = internalAction({
  args: { userId: v.string(), userCode: v.string(), intervalMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId, userCode } = args;
    const login = await ctx.runQuery(internal.chatgpt.pendingLogin, { userId, userCode });
    if (login === null) return null;
    if (Date.now() > login.expiresAt) {
      await ctx.runMutation(internal.chatgpt.remove, { userId });
      return null;
    }

    try {
      const config = resolveConfig();
      const deviceAuthId = await unseal(login.deviceAuthId);
      const poll = await pollDeviceCode(config, { deviceAuthId, userCode });
      if (poll.status === "pending") {
        await ctx.scheduler.runAfter(args.intervalMs, internal.chatgpt.pollLogin, args);
        return null;
      }

      const tokens = await exchangeDeviceAuthorization(config, poll);
      await ctx.runMutation(internal.chatgpt.saveConnected, {
        userId,
        userCode,
        email: parseUser(tokens.idToken)?.email,
        tokens: await sealTokens(tokens),
      });
      return null;
    } catch (error) {
      await ctx.runMutation(internal.chatgpt.remove, { userId });
      throw error;
    }
  },
});

export const forUser = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => findAccount(ctx, userId),
});

export const pendingLogin = internalQuery({
  args: { userId: v.string(), userCode: v.string() },
  handler: async (ctx, { userId, userCode }) => {
    const account = await findAccount(ctx, userId);
    if (account === null || account.status !== "pending" || account.userCode !== userCode) {
      return null;
    }
    return account;
  },
});

export const savePending = internalMutation({
  args: {
    userId: v.string(),
    userCode: v.string(),
    verificationUrl: v.string(),
    expiresAt: v.number(),
    deviceAuthId: sealed,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await removeAccount(ctx, args.userId);
    await ctx.db.insert("chatgptAccounts", {
      ...args,
      status: "pending",
      consentedAt: Date.now(),
    });
    return null;
  },
});

export const saveConnected = internalMutation({
  args: {
    userId: v.string(),
    userCode: v.string(),
    email: v.optional(v.string()),
    tokens: sealed,
  },
  returns: v.null(),
  handler: async (ctx, { userId, userCode, email, tokens }) => {
    const account = await findAccount(ctx, userId);
    if (account === null || account.status !== "pending" || account.userCode !== userCode) {
      return null;
    }
    await ctx.db.replace(account._id, {
      userId,
      consentedAt: account.consentedAt,
      status: "connected",
      email,
      tokens,
    });
    return null;
  },
});

export const saveTokens = internalMutation({
  args: { userId: v.string(), tokens: sealed },
  returns: v.null(),
  handler: async (ctx, { userId, tokens }) => {
    const account = await findAccount(ctx, userId);
    if (account === null || account.status !== "connected") return null;
    await ctx.db.patch(account._id, { tokens });
    return null;
  },
});

export const expire = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    const account = await findAccount(ctx, userId);
    if (account === null) return null;
    await ctx.db.replace(account._id, {
      userId,
      consentedAt: account.consentedAt,
      status: "expired",
    });
    return null;
  },
});

export const remove = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId }) => {
    await removeAccount(ctx, userId);
    return null;
  },
});

function findAccount(ctx: QueryCtx, userId: string) {
  return ctx.db
    .query("chatgptAccounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function removeAccount(ctx: MutationCtx, userId: string) {
  const account = await findAccount(ctx, userId);
  if (account === null) return;
  await ctx.db.delete(account._id);
}
