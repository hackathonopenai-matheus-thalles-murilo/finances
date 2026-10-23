import { v, type Infer } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
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

    const { connectionId, replacedExternalId } = await ctx.runMutation(internal.connections.save, {
      userId,
      externalId: itemId,
      institutionId: item.institutionId,
      institution: item.institution,
      situations: situation === undefined ? [] : [situation],
    });
    if (replacedExternalId !== undefined) {
      await pluggy.deleteItem(replacedExternalId);
      while (await ctx.runMutation(internal.connections.clearData, { connectionId }));
    }
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
    institutionId: v.string(),
    institution: v.string(),
    situations: v.array(situation),
  },
  returns: v.object({
    connectionId: v.id("connections"),
    replacedExternalId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user_institutionId", (q) =>
        q.eq("userId", args.userId).eq("institutionId", args.institutionId),
      )
      .unique();

    if (existing === null) {
      const connectionId = await ctx.db.insert("connections", {
        ...args,
        status: "active",
        sync: "syncing",
      });
      return { connectionId };
    }

    await ctx.db.patch(existing._id, {
      externalId: args.externalId,
      situations: [...new Set([...existing.situations, ...args.situations])],
      sync: "syncing",
    });
    if (existing.externalId === args.externalId) return { connectionId: existing._id };
    return { connectionId: existing._id, replacedExternalId: existing.externalId };
  },
});

export const clearData = internalMutation({
  args: { connectionId: v.id("connections") },
  returns: v.boolean(),
  handler: async (ctx, { connectionId }) => deleteDataBatch(ctx, connectionId),
});

export const remove = internalMutation({
  args: { connectionId: v.id("connections") },
  returns: v.null(),
  handler: async (ctx, { connectionId }) => {
    if (await deleteDataBatch(ctx, connectionId)) {
      await ctx.scheduler.runAfter(0, internal.connections.remove, { connectionId });
      return null;
    }
    await ctx.db.delete(connectionId);
    return null;
  },
});

async function deleteDataBatch(ctx: MutationCtx, connectionId: Id<"connections">) {
  const questions = await ctx.db
    .query("foreignIncomeQuestions")
    .withIndex("by_connection", (q) => q.eq("connectionId", connectionId))
    .collect();
  await Promise.all(
    questions
      .filter((question) => question.status === "open")
      .map((question) => ctx.db.delete(question._id)),
  );

  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_connection", (q) => q.eq("connectionId", connectionId))
    .take(DELETE_BATCH_SIZE);
  await Promise.all(transactions.map((transaction) => ctx.db.delete(transaction._id)));
  if (transactions.length === DELETE_BATCH_SIZE) return true;

  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_connection", (q) => q.eq("connectionId", connectionId))
    .collect();
  await Promise.all(accounts.map((account) => ctx.db.delete(account._id)));
  return false;
}
