import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { calculation } from "./lib/rules/calculation";
import { carneLeaoFacts } from "./lib/rules/carneLeao";
import { dasMeiFacts } from "./lib/rules/dasMei";
import { dasSimplesFacts } from "./lib/rules/dasSimples";

export const obligationKind = v.union(
  v.literal("carneLeao"),
  v.literal("dasMei"),
  v.literal("dasSimples"),
  v.literal("dirpf"),
);

export const obligationFacts = v.union(dasMeiFacts, dasSimplesFacts, carneLeaoFacts);

export const receitaDocument = v.object({
  number: v.string(),
  barcode: v.string(),
  amountCentavos: v.number(),
  dueOn: v.string(),
  hash: v.string(),
});

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

export const approval = v.object({
  approvedAt: v.number(),
  channel,
  documentHash: v.string(),
});

export const syncStatus = v.union(v.literal("syncing"), v.literal("synced"), v.literal("failed"));

const connectionFields = {
  userId: v.string(),
  externalId: v.string(),
  institutionId: v.string(),
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

const obligationFields = {
  userId: v.string(),
  kind: obligationKind,
  anoCalendario: v.number(),
  month: v.optional(v.number()),
  dueOn: v.optional(v.string()),
  facts: v.optional(obligationFacts),
};

const guideFields = {
  userId: v.string(),
  obligationId: v.id("obligations"),
  amountCentavos: v.number(),
  calculation,
  document: receitaDocument,
  preparedAt: v.number(),
};

const foreignIncomeQuestionFields = {
  userId: v.string(),
  connectionId: v.id("connections"),
  institution: v.string(),
  anoCalendario: v.number(),
  month: v.number(),
  transactionIds: v.array(v.id("transactions")),
  amountCents: v.number(),
  currency: v.string(),
};

export const meiActivity = dasMeiFacts.fields.activity;

export const profileFact = v.object({ kind: v.literal("mei"), activity: meiActivity });

export const factSuggestion = v.object({
  kind: v.literal("mei"),
  activity: v.optional(meiActivity),
});

export const factSource = v.union(
  v.object({ type: v.literal("note"), noteId: v.id("profileNotes") }),
  v.object({ type: v.literal("transactions"), transactionIds: v.array(v.id("transactions")) }),
);

const profileFactFields = {
  userId: v.string(),
  source: factSource,
  evidence: v.string(),
};

const setupRunFields = {
  userId: v.string(),
  workflowId: v.string(),
  startedAt: v.number(),
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
    .index("by_user_institutionId", ["userId", "institutionId"])
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

  obligations: defineTable(
    v.union(
      v.object({
        ...obligationFields,
        status: v.union(v.literal("upcoming"), v.literal("preparing")),
      }),
      v.object({ ...obligationFields, status: v.literal("needsUser"), reason: v.string() }),
      v.object({
        ...obligationFields,
        status: v.literal("doneByUser"),
        doneOn: v.string(),
        proofId: v.optional(v.id("_storage")),
      }),
    ),
  ).index("by_user_anoCalendario", ["userId", "anoCalendario"]),

  guides: defineTable(
    v.union(
      v.object({ ...guideFields, status: v.literal("awaitingApproval") }),
      v.object({
        ...guideFields,
        status: v.literal("scheduled"),
        approval,
        debitOn: v.string(),
        paymentJobId: v.id("_scheduled_functions"),
      }),
      v.object({
        ...guideFields,
        status: v.literal("paid"),
        approval,
        paidOn: v.string(),
        paymentProof: v.string(),
      }),
      v.object({ ...guideFields, status: v.literal("canceled"), canceledAt: v.number() }),
    ),
  )
    .index("by_user_status", ["userId", "status"])
    .index("by_obligation", ["obligationId"]),

  foreignIncomeQuestions: defineTable(
    v.union(
      v.object({ ...foreignIncomeQuestionFields, status: v.literal("open") }),
      v.object({
        ...foreignIncomeQuestionFields,
        status: v.literal("answered"),
        isIncome: v.boolean(),
        answeredAt: v.number(),
        channel,
      }),
    ),
  )
    .index("by_user_status", ["userId", "status"])
    .index("by_connection", ["connectionId"]),

  profileFacts: defineTable(
    v.union(
      v.object({
        ...profileFactFields,
        status: v.union(v.literal("proposed"), v.literal("rejected")),
        suggestion: factSuggestion,
      }),
      v.object({
        ...profileFactFields,
        status: v.literal("confirmed"),
        fact: profileFact,
        confirmedAt: v.number(),
        channel,
      }),
    ),
  ).index("by_user_status", ["userId", "status"]),

  setupRuns: defineTable(
    v.union(
      v.object({ ...setupRunFields, status: v.literal("running") }),
      v.object({ ...setupRunFields, status: v.literal("done"), readUpTo: v.number() }),
      v.object({ ...setupRunFields, status: v.literal("failed") }),
    ),
  ).index("by_user", ["userId"]),

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
