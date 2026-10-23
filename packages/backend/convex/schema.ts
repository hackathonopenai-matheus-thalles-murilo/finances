import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const obligationKind = v.union(
  v.literal("carneLeao"),
  v.literal("dasMei"),
  v.literal("dirpf"),
);

export const connectionStatus = v.union(
  v.literal("active"),
  v.literal("expiring"),
  v.literal("expired"),
  v.literal("revoked"),
);

const guideFields = {
  userId: v.string(),
  obligationId: v.id("obligations"),
  amountCentavos: v.number(),
  preparedAt: v.number(),
};

export default defineSchema({
  connections: defineTable({
    userId: v.string(),
    institution: v.string(),
    status: connectionStatus,
    expiresOn: v.string(),
  }).index("by_user_status", ["userId", "status"]),

  obligations: defineTable({
    userId: v.string(),
    kind: obligationKind,
    anoCalendario: v.number(),
    month: v.optional(v.number()),
    dueOn: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("needsUser")),
  }).index("by_user_anoCalendario", ["userId", "anoCalendario"]),

  guides: defineTable(
    v.union(
      v.object({ ...guideFields, status: v.literal("awaitingApproval") }),
      v.object({
        ...guideFields,
        status: v.literal("scheduled"),
        approvedAt: v.number(),
        debitOn: v.string(),
      }),
      v.object({
        ...guideFields,
        status: v.literal("paid"),
        approvedAt: v.number(),
        paidOn: v.string(),
      }),
    ),
  )
    .index("by_user_status", ["userId", "status"])
    .index("by_obligation", ["obligationId"]),

  foreignIncomeQuestions: defineTable({
    userId: v.string(),
    institution: v.string(),
    anoCalendario: v.number(),
    month: v.number(),
    transactionCount: v.number(),
    amountCents: v.number(),
    currency: v.string(),
    status: v.union(v.literal("open"), v.literal("answered")),
  }).index("by_user_status", ["userId", "status"]),
});
