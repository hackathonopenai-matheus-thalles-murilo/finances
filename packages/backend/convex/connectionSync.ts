import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { consentState, toSaoPauloDate } from "./lib/connectionStatus";
import { Pluggy } from "./lib/pluggy";
import { syncStatus } from "./schema";

const MAX_WAIT_ATTEMPTS = 20;
const SWEEP_BATCH_SIZE = 500;

const bankAccount = v.object({
  externalId: v.string(),
  name: v.string(),
  type: v.union(v.literal("bank"), v.literal("credit")),
  currency: v.string(),
});

const bankTransaction = v.object({
  externalId: v.string(),
  postedAt: v.string(),
  description: v.string(),
  amountCents: v.number(),
  direction: v.union(v.literal("credit"), v.literal("debit")),
  currency: v.string(),
  status: v.union(v.literal("pending"), v.literal("posted")),
});

export const run = internalAction({
  args: { connectionId: v.id("connections"), attempt: v.number() },
  returns: v.null(),
  handler: async (ctx, { connectionId, attempt }) => {
    const connection = await ctx.runQuery(internal.connectionSync.getConnection, { connectionId });
    if (connection === null) return null;

    const pluggy = await Pluggy.connect();
    const item = await pluggy.getItem(connection.externalId);
    if (item === null) {
      await ctx.runMutation(internal.connectionSync.saveConsent, {
        connectionId,
        isRevoked: true,
        sync: "failed",
      });
      return null;
    }

    const consent = {
      connectionId,
      isRevoked: item.isRevoked,
      expiresOn: item.expiresAt === null ? undefined : toSaoPauloDate(Date.parse(item.expiresAt)),
    };

    if (item.sync === "syncing" && attempt < MAX_WAIT_ATTEMPTS) {
      await ctx.runMutation(internal.connectionSync.saveConsent, { ...consent, sync: "syncing" });
      await ctx.scheduler.runAfter(15_000, internal.connectionSync.run, {
        connectionId,
        attempt: attempt + 1,
      });
      return null;
    }

    if (item.sync !== "synced" || item.isRevoked) {
      await ctx.runMutation(internal.connectionSync.saveConsent, { ...consent, sync: "failed" });
      return null;
    }

    await ctx.runMutation(internal.connectionSync.saveConsent, { ...consent, sync: "syncing" });
    const syncedAt = Date.now();
    for (const account of await pluggy.listAccounts(connection.externalId)) {
      const accountId = await ctx.runMutation(internal.connectionSync.saveAccount, {
        connectionId,
        account,
      });

      let cursor: string | null = null;
      do {
        const page = await pluggy.listTransactions(account.externalId, cursor);
        await ctx.runMutation(internal.connectionSync.saveTransactions, {
          accountId,
          transactions: page.transactions,
          syncedAt,
        });
        cursor = page.cursor;
      } while (cursor !== null);

      let swept = SWEEP_BATCH_SIZE;
      while (swept === SWEEP_BATCH_SIZE) {
        swept = await ctx.runMutation(internal.connectionSync.sweepTransactions, {
          accountId,
          syncedBefore: syncedAt,
        });
      }
    }

    await ctx.runMutation(internal.connectionSync.markSynced, { connectionId, syncedAt });
    return null;
  },
});

export const getConnection = internalQuery({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, { connectionId }) => ctx.db.get(connectionId),
});

export const saveConsent = internalMutation({
  args: {
    connectionId: v.id("connections"),
    isRevoked: v.boolean(),
    expiresOn: v.optional(v.string()),
    sync: syncStatus,
  },
  returns: v.null(),
  handler: async (ctx, { connectionId, isRevoked, expiresOn, sync }) => {
    await ctx.db.patch(connectionId, {
      ...consentState({ isRevoked, expiresOn }, Date.now()),
      sync,
    });
    return null;
  },
});

export const saveAccount = internalMutation({
  args: { connectionId: v.id("connections"), account: bankAccount },
  returns: v.id("accounts"),
  handler: async (ctx, { connectionId, account }) => {
    const connection = await ctx.db.get(connectionId);
    if (connection === null) throw new Error(`Connection ${connectionId} not found`);

    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_externalId", (q) => q.eq("externalId", account.externalId))
      .unique();
    if (existing !== null) {
      await ctx.db.patch(existing._id, account);
      return existing._id;
    }
    return ctx.db.insert("accounts", { ...account, userId: connection.userId, connectionId });
  },
});

export const saveTransactions = internalMutation({
  args: {
    accountId: v.id("accounts"),
    transactions: v.array(bankTransaction),
    syncedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { accountId, transactions, syncedAt }) => {
    const account = await ctx.db.get(accountId);
    if (account === null) throw new Error(`Account ${accountId} not found`);

    for (const transaction of transactions) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_externalId", (q) => q.eq("externalId", transaction.externalId))
        .unique();
      if (existing !== null) {
        await ctx.db.patch(existing._id, { ...transaction, syncedAt });
        continue;
      }
      await ctx.db.insert("transactions", {
        ...transaction,
        syncedAt,
        userId: account.userId,
        connectionId: account.connectionId,
        accountId,
      });
    }
    return null;
  },
});

export const sweepTransactions = internalMutation({
  args: { accountId: v.id("accounts"), syncedBefore: v.number() },
  returns: v.number(),
  handler: async (ctx, { accountId, syncedBefore }) => {
    const stale = await ctx.db
      .query("transactions")
      .withIndex("by_account_syncedAt", (q) =>
        q.eq("accountId", accountId).lt("syncedAt", syncedBefore),
      )
      .take(SWEEP_BATCH_SIZE);
    await Promise.all(stale.map((transaction) => ctx.db.delete(transaction._id)));
    return stale.length;
  },
});

export const markSynced = internalMutation({
  args: { connectionId: v.id("connections"), syncedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { connectionId, syncedAt }) => {
    await ctx.db.patch(connectionId, { sync: "synced", syncedAt });
    return null;
  },
});

export const onItemEvent = internalMutation({
  args: { externalId: v.string() },
  returns: v.null(),
  handler: async (ctx, { externalId }) => {
    const connection = await ctx.db
      .query("connections")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .unique();
    if (connection === null) return null;
    await ctx.scheduler.runAfter(0, internal.connectionSync.run, {
      connectionId: connection._id,
      attempt: 0,
    });
    return null;
  },
});

export const syncLive = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const connections = [
      ...(await ctx.db
        .query("connections")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect()),
      ...(await ctx.db
        .query("connections")
        .withIndex("by_status", (q) => q.eq("status", "expiring"))
        .collect()),
    ];
    for (const connection of connections) {
      await ctx.scheduler.runAfter(0, internal.connectionSync.run, {
        connectionId: connection._id,
        attempt: 0,
      });
    }
    return null;
  },
});
