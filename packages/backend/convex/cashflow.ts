import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { requireUserId } from "./lib/identity";

const transactionValidator = v.object({
  description: v.string(),
  amountCentavos: v.number(),
  type: v.union(v.literal("in"), v.literal("out")),
  date: v.string(),
  editable: v.boolean(),
});

type DemoTransaction = {
  description: string;
  amountCentavos: number;
  type: "in" | "out";
  date: string;
  editable: boolean;
};

const demoTransactions: DemoTransaction[] = [
  {
    description: "Saldo inicial",
    amountCentavos: 200000,
    type: "in",
    date: "2026-11-01",
    editable: false,
  },
  {
    description: "Venda balcão · Semana 1",
    amountCentavos: 180000,
    type: "in",
    date: "2026-11-05",
    editable: true,
  },
  {
    description: "Energia e internet",
    amountCentavos: 60000,
    type: "out",
    date: "2026-11-08",
    editable: false,
  },
  {
    description: "Padaria Central",
    amountCentavos: 500000,
    type: "in",
    date: "2026-11-12",
    editable: true,
  },
  {
    description: "Folha de pagamento",
    amountCentavos: 420000,
    type: "out",
    date: "2026-11-15",
    editable: false,
  },
  {
    description: "Fornecedor de embalagens",
    amountCentavos: 150000,
    type: "out",
    date: "2026-11-18",
    editable: false,
  },
  {
    description: "Mercado do Bairro",
    amountCentavos: 350000,
    type: "in",
    date: "2026-11-22",
    editable: true,
  },
  {
    description: "Aluguel do galpão",
    amountCentavos: 220000,
    type: "out",
    date: "2026-11-25",
    editable: false,
  },
  {
    description: "Fechamento mensal",
    amountCentavos: 400000,
    type: "in",
    date: "2026-11-28",
    editable: true,
  },
];

const MAX_TRANSACTIONS = 1000;

function isNovemberDate(date: string) {
  return /^2026-11-(0[1-9]|[12]\d|30)$/.test(date);
}

function validateTransactions(transactions: DemoTransaction[]) {
  if (transactions.length === 0) throw new Error("O CSV não tem movimentações.");
  for (const transaction of transactions) {
    if (!Number.isSafeInteger(transaction.amountCentavos)) {
      throw new Error("Os valores precisam estar em centavos inteiros.");
    }
    if (!isNovemberDate(transaction.date)) {
      throw new Error("As movimentações precisam estar em novembro de 2026.");
    }
  }
}

async function clearUserCashflow(ctx: MutationCtx, userId: string) {
  const transactions = await ctx.db
    .query("cashflowTransactions")
    .withIndex("by_user_date", (index) => index.eq("userId", userId))
    .take(MAX_TRANSACTIONS);
  for (const transaction of transactions) await ctx.db.delete(transaction._id);

  const pendingChanges = await ctx.db
    .query("pendingCashflowChanges")
    .withIndex("by_user_status", (index) => index.eq("userId", userId))
    .take(MAX_TRANSACTIONS);
  for (const change of pendingChanges) await ctx.db.delete(change._id);
}

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const transactions = await ctx.db
      .query("cashflowTransactions")
      .withIndex("by_user_date", (index) => index.eq("userId", userId))
      .take(MAX_TRANSACTIONS);
    transactions.sort((left, right) => left.date.localeCompare(right.date));

    const timeline = [];
    let balance = 0;
    let totalIn = 0;
    let totalOut = 0;
    let transactionIndex = 0;
    for (let day = 1; day <= 30; day += 1) {
      const date = `2026-11-${String(day).padStart(2, "0")}`;
      while (transactions[transactionIndex]?.date === date) {
        const transaction = transactions[transactionIndex];
        if (!transaction) break;
        if (transaction.type === "in") {
          balance += transaction.amountCentavos;
          totalIn += transaction.amountCentavos;
        } else {
          balance -= transaction.amountCentavos;
          totalOut += transaction.amountCentavos;
        }
        transactionIndex += 1;
      }
      timeline.push({ date, balanceCentavos: balance });
    }

    const negativeDays = timeline.filter((day) => day.balanceCentavos < 0);
    const pendingChanges = await ctx.db
      .query("pendingCashflowChanges")
      .withIndex("by_user_status", (index) =>
        index.eq("userId", userId).eq("status", "awaiting_confirmation"),
      )
      .collect();

    return {
      transactions,
      timeline,
      totalInCentavos: totalIn,
      totalOutCentavos: totalOut,
      projectedBalanceCentavos: balance,
      affectedPeriod:
        negativeDays.length > 0
          ? {
              start: negativeDays[0]?.date ?? "",
              end: negativeDays[negativeDays.length - 1]?.date ?? "",
              lowestBalanceCentavos: Math.min(...negativeDays.map((day) => day.balanceCentavos)),
            }
          : null,
      pendingChanges: pendingChanges.map(({ _id, description, oldDate, newDate, status }) => ({
        _id,
        description,
        oldDate,
        newDate,
        status,
      })),
    };
  },
});

export const importTransactions = mutation({
  args: { transactions: v.array(transactionValidator) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    validateTransactions(args.transactions);
    if (args.transactions.length > MAX_TRANSACTIONS) {
      throw new Error("Importe até 1.000 movimentações por vez.");
    }
    await clearUserCashflow(ctx, userId);
    for (const transaction of args.transactions) {
      await ctx.db.insert("cashflowTransactions", { ...transaction, userId });
    }
    return args.transactions.length;
  },
});

export const loadDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await clearUserCashflow(ctx, userId);
    for (const transaction of demoTransactions) {
      await ctx.db.insert("cashflowTransactions", { ...transaction, userId });
    }
  },
});

export const updateDate = mutation({
  args: { id: v.id("cashflowTransactions"), newDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!isNovemberDate(args.newDate)) throw new Error("Escolha uma data de novembro de 2026.");
    const transaction = await ctx.db.get(args.id);
    if (
      !transaction ||
      transaction.userId !== userId ||
      !transaction.editable ||
      transaction.type !== "in"
    )
      return;
    await ctx.db.patch(transaction._id, {
      originalDate: transaction.originalDate ?? transaction.date,
      date: args.newDate,
    });
    const pendingChanges = await ctx.db
      .query("pendingCashflowChanges")
      .withIndex("by_user_phone", (index) => index.eq("userId", userId))
      .take(MAX_TRANSACTIONS);
    for (const change of pendingChanges) {
      if (change.transactionId === transaction._id) await ctx.db.delete(change._id);
    }
  },
});

export const getEditableTransactions = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("cashflowTransactions")
      .withIndex("by_user_date", (index) => index.eq("userId", userId))
      .take(MAX_TRANSACTIONS);
  },
});

export const savePendingChange = internalMutation({
  args: {
    userId: v.string(),
    phone: v.string(),
    transactionId: v.id("cashflowTransactions"),
    description: v.string(),
    oldDate: v.string(),
    newDate: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isNovemberDate(args.newDate)) throw new Error("Escolha uma data de novembro de 2026.");
    const transaction = await ctx.db.get(args.transactionId);
    if (
      !transaction ||
      transaction.userId !== args.userId ||
      transaction.date !== args.oldDate ||
      !transaction.editable ||
      transaction.type !== "in"
    ) {
      throw new Error("Recebimento inválido para alteração.");
    }
    const pendingChanges = await ctx.db
      .query("pendingCashflowChanges")
      .withIndex("by_user_phone", (index) =>
        index.eq("userId", args.userId).eq("phone", args.phone),
      )
      .collect();
    for (const change of pendingChanges) await ctx.db.delete(change._id);
    return await ctx.db.insert("pendingCashflowChanges", {
      ...args,
      status: "awaiting_confirmation",
    });
  },
});

export const confirmPendingChange = internalMutation({
  args: { userId: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingCashflowChanges")
      .withIndex("by_user_phone", (index) =>
        index.eq("userId", args.userId).eq("phone", args.phone),
      )
      .first();
    if (!pending) return null;
    const transaction = await ctx.db.get(pending.transactionId);
    await ctx.db.delete(pending._id);
    if (
      !transaction ||
      transaction.userId !== args.userId ||
      transaction.date !== pending.oldDate ||
      !transaction.editable ||
      transaction.type !== "in"
    ) {
      return null;
    }
    await ctx.db.patch(transaction._id, {
      originalDate: transaction.originalDate ?? transaction.date,
      date: pending.newDate,
    });
    return pending;
  },
});

export const discardPendingChange = internalMutation({
  args: { userId: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pendingCashflowChanges")
      .withIndex("by_user_phone", (index) =>
        index.eq("userId", args.userId).eq("phone", args.phone),
      )
      .first();
    if (!pending) return false;
    await ctx.db.delete(pending._id);
    return true;
  },
});
