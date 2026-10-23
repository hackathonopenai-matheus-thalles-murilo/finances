import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib/identity";
import { normalizeBrazilianPhone } from "./lib/whatsappPhone";

export const getLinkStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const link = await ctx.db
      .query("cashflowWhatsAppLinks")
      .withIndex("by_user", (index) => index.eq("userId", userId))
      .first();
    return { phone: link?.phone ?? null };
  },
});

export const linkPhone = action({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const userId = await requireUserId(ctx);
    const normalizedPhone = normalizeBrazilianPhone(phone);
    if (!normalizedPhone) {
      throw new Error("Informe um telefone brasileiro com DDD e 10 ou 11 dígitos.");
    }
    await ctx.runMutation(internal.cashflowWhatsApp.saveLink, {
      userId,
      phone: normalizedPhone,
    });
  },
});

export const unlinkPhone = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await ctx.runMutation(internal.cashflowWhatsApp.removeLink, { userId });
  },
});

export const resolveUserForPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const link = await ctx.db
      .query("cashflowWhatsAppLinks")
      .withIndex("by_phone", (index) => index.eq("phone", phone))
      .first();
    return link?.userId ?? null;
  },
});

export const saveLink = internalMutation({
  args: { userId: v.string(), phone: v.string() },
  handler: async (ctx, { userId, phone }) => {
    if (normalizeBrazilianPhone(phone) !== phone) {
      throw new Error("Informe um telefone brasileiro com DDD e 10 ou 11 dígitos.");
    }
    const phoneLink = await ctx.db
      .query("cashflowWhatsAppLinks")
      .withIndex("by_phone", (index) => index.eq("phone", phone))
      .first();
    if (phoneLink && phoneLink.userId !== userId) {
      throw new Error("Este número já está vinculado a outra conta.");
    }
    if (phoneLink) return;

    const userLink = await ctx.db
      .query("cashflowWhatsAppLinks")
      .withIndex("by_user", (index) => index.eq("userId", userId))
      .first();
    if (userLink) await ctx.db.delete(userLink._id);
    await ctx.db.insert("cashflowWhatsAppLinks", { userId, phone });
  },
});

export const removeLink = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const userLink = await ctx.db
      .query("cashflowWhatsAppLinks")
      .withIndex("by_user", (index) => index.eq("userId", userId))
      .first();
    if (userLink) await ctx.db.delete(userLink._id);
  },
});
