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

export const situation = v.union(
  v.literal("salary"),
  v.literal("foreignIncome"),
  v.literal("company"),
  v.literal("investments"),
  v.literal("rent"),
  v.literal("dependents"),
);

export const channel = v.union(v.literal("web"), v.literal("whatsapp"));

export const syncStatus = v.union(v.literal("syncing"), v.literal("synced"), v.literal("failed"));

const connectionFields = {
  userId: v.string(),
  externalId: v.string(),
  institution: v.string(),
  situations: v.array(situation),
  sync: syncStatus,
  syncedAt: v.optional(v.number()),
};

export const sealed = v.object({ iv: v.string(), ciphertext: v.string() });

const chatgptAccountFields = {
  userId: v.string(),
  consentedAt: v.number(),
};

const guideFields = {
  userId: v.string(),
  obligationId: v.id("obligations"),
  amountCentavos: v.number(),
  preparedAt: v.number(),
};

export default defineSchema({
  fiscalProfiles: defineTable({
    userId: v.string(),
    situations: v.array(situation),
    onboardedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  profileNotes: defineTable({
    userId: v.string(),
    channel,
    text: v.string(),
  }).index("by_user", ["userId"]),

  connections: defineTable(
    v.union(
      v.object({
        ...connectionFields,
        status: v.union(v.literal("active"), v.literal("revoked")),
        expiresOn: v.optional(v.string()),
      }),
      v.object({
        ...connectionFields,
        status: v.union(v.literal("expiring"), v.literal("expired")),
        expiresOn: v.string(),
      }),
    ),
  )
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_externalId", ["externalId"]),

  accounts: defineTable({
    userId: v.string(),
    connectionId: v.id("connections"),
    externalId: v.string(),
    name: v.string(),
    type: v.union(v.literal("bank"), v.literal("credit")),
    currency: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_connection", ["connectionId"])
    .index("by_externalId", ["externalId"]),

  transactions: defineTable({
    userId: v.string(),
    connectionId: v.id("connections"),
    accountId: v.id("accounts"),
    externalId: v.string(),
    postedAt: v.string(),
    description: v.string(),
    amountCents: v.number(),
    direction: v.union(v.literal("credit"), v.literal("debit")),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("posted")),
    syncedAt: v.number(),
  })
    .index("by_user_postedAt", ["userId", "postedAt"])
    .index("by_connection", ["connectionId"])
    .index("by_account_syncedAt", ["accountId", "syncedAt"])
    .index("by_externalId", ["externalId"]),

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

  chatgptAccounts: defineTable(
    v.union(
      v.object({
        ...chatgptAccountFields,
        status: v.literal("pending"),
        userCode: v.string(),
        verificationUrl: v.string(),
        expiresAt: v.number(),
        deviceAuthId: sealed,
      }),
      v.object({
        ...chatgptAccountFields,
        status: v.literal("connected"),
        email: v.optional(v.string()),
        tokens: sealed,
      }),
      v.object({ ...chatgptAccountFields, status: v.literal("expired") }),
    ),
  ).index("by_user", ["userId"]),
});
