import { vWorkflowId, WorkflowManager } from "@convex-dev/workflow";
import { vResultValidator } from "@convex-dev/workpool";
import { generateText, Output } from "ai";
import { v, type Infer } from "convex/values";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { toSaoPauloDate } from "./lib/connectionStatus";
import { requireUserId } from "./lib/identity";
import { getProfile } from "./lib/profile";
import { taxAgentModelFor } from "./lib/taxAgentModel";
import { meiActivity, situation } from "./schema";

const workflow = new WorkflowManager(components.workflow);

const proposalInput = v.object({
  readUpTo: v.number(),
  situations: v.array(situation),
  notes: v.array(v.object({ noteId: v.id("profileNotes"), text: v.string() })),
  transactions: v.array(
    v.object({
      transactionId: v.id("transactions"),
      postedOn: v.string(),
      direction: v.union(v.literal("credit"), v.literal("debit")),
      description: v.string(),
      amountCents: v.number(),
      currency: v.string(),
    }),
  ),
});

const meiProposal = v.object({
  activity: v.optional(meiActivity),
  evidence: v.string(),
  noteId: v.optional(v.id("profileNotes")),
  transactionIds: v.array(v.id("transactions")),
});

const proposals = z.object({
  mei: z
    .object({
      activity: z.enum(["comercioIndustria", "servicos", "comercioIndustriaServicos"]).nullable(),
      evidence: z.string(),
      noteId: z.string().nullable(),
      transactionIds: z.array(z.string()),
    })
    .nullable(),
  foreignIncomeTransactionIds: z.array(z.string()),
});

const instructions = [
  "Você lê o que um usuário brasileiro contou sobre a vida fiscal dele e as entradas na conta bancária, e propõe fatos para o perfil fiscal. O usuário confirma cada fato antes de ele valer.",
  "Proponha um MEI só se o texto disser que o usuário tem um MEI ou se houver débitos de DAS-MEI. Se a atividade (comércio ou indústria, serviços, ou os dois) não estiver clara, deixe activity como null. Nunca proponha MEI Caminhoneiro.",
  "Em evidence, escreva uma frase curta em português do Brasil dizendo de onde veio o fato, sem valores, CPF, CNPJ ou nomes de terceiros.",
  "Em noteId, use o noteId do texto que mencionou o MEI. Em transactionIds, os ids das transações que indicam o MEI.",
  "Em foreignIncomeTransactionIds, liste só créditos (direction credit) que parecem vir do exterior: remessas, câmbio, Wise, Payoneer, Deel, Remessa Online, pagamentos em moeda estrangeira. Não decida se é renda; o usuário responde depois.",
  "Use só ids que aparecem na entrada. Na dúvida, não proponha.",
].join("\n");

export const run = workflow
  .define({ args: { userId: v.string(), rereadAll: v.boolean() } })
  .handler(async (step, args): Promise<void> => {
    await step.runAction(internal.setup.proposeFacts, args, { retry: true });
  });

export const refresh = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await startSetup(ctx, await requireUserId(ctx), { rereadAll: true });
    return null;
  },
});

type MeiProposal = Infer<typeof meiProposal>;

export const proposeFacts = internalAction({
  args: { userId: v.string(), rereadAll: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, rereadAll }) => {
    const input = await ctx.runQuery(internal.setup.inputs, { userId, rereadAll });
    if (input.notes.length === 0 && input.transactions.length === 0) {
      await ctx.runMutation(internal.setup.saveProposals, {
        userId,
        readUpTo: input.readUpTo,
        foreignIncomeTransactionIds: [],
      });
      return null;
    }

    const model = await taxAgentModelFor(ctx, userId);
    if (model === null) {
      throw new Error("ChatGPT login expired");
    }
    const { output } = await generateText({
      model,
      system: instructions,
      prompt: JSON.stringify({
        situations: input.situations,
        notes: input.notes,
        transactions: input.transactions,
      }),
      output: Output.object({ schema: proposals }),
    });

    const transactionIdOf = new Map<string, Id<"transactions">>(
      input.transactions.map(({ transactionId }) => [transactionId, transactionId]),
    );
    const knownTransactions = (ids: string[]) => ids.flatMap((id) => transactionIdOf.get(id) ?? []);

    await ctx.runMutation(internal.setup.saveProposals, {
      userId,
      readUpTo: input.readUpTo,
      mei:
        output.mei === null
          ? undefined
          : {
              activity: output.mei.activity ?? undefined,
              evidence: output.mei.evidence,
              noteId: input.notes.find((note) => note.noteId === output.mei?.noteId)?.noteId,
              transactionIds: knownTransactions(output.mei.transactionIds),
            },
      foreignIncomeTransactionIds: knownTransactions(output.foreignIncomeTransactionIds),
    });
    return null;
  },
});

export const inputs = internalQuery({
  args: { userId: v.string(), rereadAll: v.boolean() },
  returns: proposalInput,
  handler: async (ctx, { userId, rereadAll }) => {
    const readUpTo = Date.now();
    const since = rereadAll ? 0 : await lastReadUpTo(ctx, userId);
    const profile = await getProfile(ctx, userId);

    const notes = await ctx.db
      .query("profileNotes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const transactions = await newTransactions(ctx, userId, since);

    return {
      readUpTo,
      situations: profile === null ? [] : profile.situations,
      notes: notes
        .filter((note) => note._creationTime > since)
        .map((note) => ({ noteId: note._id, text: note.text })),
      transactions: transactions.map((transaction) => ({
        transactionId: transaction._id,
        postedOn: postedOn(transaction),
        direction: transaction.direction,
        description: transaction.description,
        amountCents: transaction.amountCents,
        currency: transaction.currency,
      })),
    };
  },
});

export const saveProposals = internalMutation({
  args: {
    userId: v.string(),
    readUpTo: v.number(),
    mei: v.optional(meiProposal),
    foreignIncomeTransactionIds: v.array(v.id("transactions")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, readUpTo, mei, foreignIncomeTransactionIds }) => {
    if (mei !== undefined) {
      await proposeMei(ctx, userId, mei);
    }
    await askAboutForeignIncome(ctx, userId, foreignIncomeTransactionIds);

    const run = await latestRun(ctx, userId);
    if (run === null || run.status !== "running") {
      throw new Error(`No running setup for ${userId}`);
    }
    await ctx.db.replace(run._id, {
      userId,
      workflowId: run.workflowId,
      startedAt: run.startedAt,
      status: "done",
      readUpTo,
    });

    if ((await newTransactions(ctx, userId, readUpTo)).length > 0) {
      await startSetup(ctx, userId, { rereadAll: false });
    }
    return null;
  },
});

export const finish = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ userId: v.string() }),
  },
  returns: v.null(),
  handler: async (ctx, { workflowId, result, context }) => {
    if (result.kind === "success") return null;

    const runs = await ctx.db
      .query("setupRuns")
      .withIndex("by_user", (q) => q.eq("userId", context.userId))
      .collect();
    const run = runs.find((candidate) => candidate.workflowId === workflowId);
    if (run === undefined || run.status !== "running") return null;

    await ctx.db.replace(run._id, {
      userId: run.userId,
      workflowId,
      startedAt: run.startedAt,
      status: "failed",
    });
    return null;
  },
});

export async function startSetup(
  ctx: MutationCtx,
  userId: string,
  { rereadAll }: { rereadAll: boolean },
) {
  const latest = await latestRun(ctx, userId);
  if (latest?.status === "running") return;

  const workflowId = await workflow.start(
    ctx,
    internal.setup.run,
    { userId, rereadAll },
    { onComplete: internal.setup.finish, context: { userId } },
  );
  await ctx.db.insert("setupRuns", {
    userId,
    workflowId,
    startedAt: Date.now(),
    status: "running",
  });
}

export async function latestRun(ctx: QueryCtx, userId: string) {
  return ctx.db
    .query("setupRuns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
}

export function postedOn(transaction: Doc<"transactions">) {
  return toSaoPauloDate(Date.parse(transaction.postedAt));
}

async function lastReadUpTo(ctx: QueryCtx, userId: string) {
  const runs = await ctx.db
    .query("setupRuns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .collect();
  for (const run of runs) {
    if (run.status === "done") return run.readUpTo;
  }
  return 0;
}

async function newTransactions(ctx: QueryCtx, userId: string, since: number) {
  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_user_postedAt", (q) => q.eq("userId", userId))
    .collect();
  return transactions.filter(
    (transaction) => transaction._creationTime > since && transaction.status === "posted",
  );
}

async function proposeMei(ctx: MutationCtx, userId: string, mei: MeiProposal) {
  const facts = await ctx.db
    .query("profileFacts")
    .withIndex("by_user_status", (q) => q.eq("userId", userId))
    .collect();
  if (facts.some((fact) => fact.status !== "rejected")) return;
  const rejectedNoteIds = facts.flatMap((fact) =>
    fact.source.type === "note" ? [fact.source.noteId] : [],
  );
  const isNewNote = mei.noteId !== undefined && !rejectedNoteIds.includes(mei.noteId);
  if (facts.length > 0 && !isNewNote) return;

  const source =
    mei.noteId === undefined
      ? { type: "transactions" as const, transactionIds: mei.transactionIds }
      : { type: "note" as const, noteId: mei.noteId };
  if (source.type === "transactions" && source.transactionIds.length === 0) return;

  await ctx.db.insert("profileFacts", {
    userId,
    status: "proposed",
    suggestion: { kind: "mei", activity: mei.activity },
    source,
    evidence: mei.evidence,
  });
}

async function askAboutForeignIncome(
  ctx: MutationCtx,
  userId: string,
  transactionIds: Id<"transactions">[],
) {
  const transactions = await Promise.all(transactionIds.map((id) => ctx.db.get(id)));
  for (const transaction of transactions) {
    if (transaction === null || transaction.userId !== userId) continue;
    if (transaction.direction !== "credit") continue;
    const [year, month] = postedOn(transaction).split("-").map(Number);
    const connection = await ctx.db.get(transaction.connectionId);
    if (connection === null) continue;

    const questions = await ctx.db
      .query("foreignIncomeQuestions")
      .withIndex("by_connection", (q) => q.eq("connectionId", transaction.connectionId))
      .collect();
    if (questions.some((candidate) => candidate.transactionIds.includes(transaction._id))) continue;
    const question = questions.find(
      (candidate) =>
        candidate.status === "open" &&
        candidate.anoCalendario === year &&
        candidate.month === month &&
        candidate.currency === transaction.currency,
    );
    if (question === undefined) {
      await ctx.db.insert("foreignIncomeQuestions", {
        userId,
        connectionId: transaction.connectionId,
        institution: connection.institution,
        anoCalendario: year,
        month,
        transactionIds: [transaction._id],
        amountCents: transaction.amountCents,
        currency: transaction.currency,
        status: "open",
      });
      continue;
    }
    await ctx.db.patch(question._id, {
      transactionIds: [...question.transactionIds, transaction._id],
      amountCents: question.amountCents + transaction.amountCents,
    });
  }
}
