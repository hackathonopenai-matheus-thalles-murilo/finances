import { v, type Infer } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/identity";
import { Pluggy } from "./lib/pluggy";
import { connectionStatus, situation, syncStatus } from "./schema";

const DELETE_BATCH_SIZE = 500;

const connectionRow = v.object({
  connectionId: v.id("connections"),
  institution: v.string(),
  status: connectionStatus,
  expiresOn: v.optional(v.string()),
  sync: syncStatus,
  syncedAt: v.optional(v.number()),
});

export type ConnectionRow = Infer<typeof connectionRow>;

export const list = query({
  args: {},
  returns: v.array(connectionRow),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect();

    return connections
      .map((connection) => ({
        connectionId: connection._id,
        institution: connection.institution,
        status: connection.status,
        expiresOn: connection.expiresOn,
        sync: connection.sync,
        syncedAt: connection.syncedAt,
      }))
      .sort((a, b) => a.institution.localeCompare(b.institution));
  },
});

export const createConnectToken = action({
  args: { connectionId: v.optional(v.id("connections")) },
  returns: v.object({ connectToken: v.string(), updateItem: v.optional(v.string()) }),
  handler: async (
    ctx,
    { connectionId },
  ): Promise<{ connectToken: string; updateItem?: string }> => {
    const userId = await requireUserId(ctx);
    const updateItem =
      connectionId === undefined
        ? undefined
        : (await ctx.runQuery(internal.connections.getOwned, { connectionId, userId })).externalId;
    const siteUrl = process.env.CONVEX_SITE_URL;
    const pluggy = await Pluggy.connect();
    const connectToken = await pluggy.createConnectToken({
      clientUserId: userId,
      itemId: updateItem,
      webhookUrl: siteUrl?.startsWith("https://") ? `${siteUrl}/pluggy/webhook` : undefined,
    });

    return { connectToken, updateItem };
  },
});

export const connect = action({
  args: { itemId: v.string(), situation: v.optional(situation) },
  returns: v.id("connections"),
  handler: async (ctx, { itemId, situation }): Promise<Id<"connections">> => {
    const userId = await requireUserId(ctx);
    const pluggy = await Pluggy.connect();
    const item = await pluggy.getItem(itemId);
    if (item === null || item.clientUserId !== userId) {
      throw new Error(`Item ${itemId} not found`);
    }

    const connectionId = await ctx.runMutation(internal.connections.save, {
      userId,
      externalId: itemId,
      institution: item.institution,
      situations: situation === undefined ? [] : [situation],
    });
    await ctx.scheduler.runAfter(0, internal.connectionSync.run, { connectionId, attempt: 0 });
    return connectionId;
  },
});

export const refresh = mutation({
  args: { connectionId: v.id("connections") },
  returns: v.null(),
  handler: async (ctx, { connectionId }) => {
    const userId = await requireUserId(ctx);
    const connection = await ctx.db.get(connectionId);
    if (connection === null || connection.userId !== userId) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    await ctx.db.patch(connectionId, { sync: "syncing" });
    await ctx.scheduler.runAfter(0, internal.connectionSync.run, { connectionId, attempt: 0 });
    return null;
  },
});

export const disconnect = action({
  args: { connectionId: v.id("connections") },
  returns: v.null(),
  handler: async (ctx, { connectionId }) => {
    const userId = await requireUserId(ctx);
    const connection = await ctx.runQuery(internal.connections.getOwned, { connectionId, userId });
    const pluggy = await Pluggy.connect();
    await pluggy.deleteItem(connection.externalId);
    await ctx.runMutation(internal.connections.remove, { connectionId });
    return null;
  },
});

export const getOwned = internalQuery({
  args: { connectionId: v.id("connections"), userId: v.string() },
  handler: async (ctx, { connectionId, userId }) => {
    const connection = await ctx.db.get(connectionId);
    if (connection === null || connection.userId !== userId) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    return connection;
  },
});

export const save = internalMutation({
  args: {
    userId: v.string(),
    externalId: v.string(),
    institution: v.string(),
    situations: v.array(situation),
  },
  returns: v.id("connections"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existing === null) {
      return ctx.db.insert("connections", { ...args, status: "active", sync: "syncing" });
    }

    await ctx.db.patch(existing._id, {
      situations: [...new Set([...existing.situations, ...args.situations])],
      sync: "syncing",
    });
    return existing._id;
  },
});

export const remove = internalMutation({
  args: { connectionId: v.id("connections") },
  returns: v.null(),
  handler: async (ctx, { connectionId }) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_connection", (q) => q.eq("connectionId", connectionId))
      .take(DELETE_BATCH_SIZE);
    await Promise.all(transactions.map((transaction) => ctx.db.delete(transaction._id)));

    if (transactions.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.connections.remove, { connectionId });
      return null;
    }

    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_connection", (q) => q.eq("connectionId", connectionId))
      .collect();
    await Promise.all(accounts.map((account) => ctx.db.delete(account._id)));
    await ctx.db.delete(connectionId);
    return null;
  },
});
