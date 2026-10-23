import {
  Agent,
  createThread,
  createTool,
  getThreadMetadata,
  listUIMessages,
  saveMessage,
  stepCountIs,
  syncStreams,
  type ToolCtx,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query, type QueryCtx } from "./_generated/server";
import type { ObligationDetail, ObligationRow } from "./obligations";
import type { Situation } from "./profile";
import { requireUserId } from "./lib/identity";
import { openRouterModel, taxAgentModelFor } from "./lib/taxAgentModel";

const obligationIdSchema = z
  .string()
  .describe("O obligationId que veio da ferramenta obligations.");

const taxAgent = new Agent(components.agent, {
  name: "Agente fiscal",
  languageModel: openRouterModel(),
  stopWhen: stepCountIs(5),
  instructions: [
    "Você é o agente fiscal do Finances e ajuda brasileiros com o imposto de renda e as obrigações das empresas deles.",
    "Responda em português do Brasil, com mensagens curtas, em texto simples e sem Markdown.",
    "Nunca calcule, estime ou invente valores de imposto. Cite apenas valores que vierem das ferramentas e diga de onde vieram.",
    "Use as ferramentas para consultar o perfil fiscal e as obrigações do usuário. Se não souber, diga que não sabe.",
    "Ao falar de um ano, diga se é o ano-calendário (quando a renda aconteceu) ou o exercício (quando é declarado).",
    "Você não paga, não envia declarações e não assina nada. Isso sempre espera a aprovação do usuário no painel.",
    "Você pode preparar uma guia. Depois, diga ao usuário que ela espera a aprovação dele no painel.",
    "Se o usuário quiser fazer por conta própria, passe o passo a passo da obrigação: onde fazer, o que ter em mãos e os valores do cálculo. Depois ele marca como feito no painel.",
    "Nunca peça senhas, certificados digitais ou acesso ao gov.br. Se o usuário enviar algum, peça para não enviar.",
    "Nunca escreva um CPF ou CNPJ completo.",
  ].join("\n"),
  tools: {
    situations: createTool({
      description:
        "Lista as situações do perfil fiscal do usuário: salário, renda do exterior, empresa, investimentos, aluguel e dependentes.",
      inputSchema: z.object({}),
      execute: async (ctx): Promise<Situation[]> =>
        ctx.runQuery(internal.profile.situationsFor, { userId: toolUserId(ctx) }),
    }),
    obligations: createTool({
      description:
        "Lista as obrigações fiscais do usuário em um ano-calendário, com vencimento, status e o valor da guia quando já foi preparada.",
      inputSchema: z.object({
        anoCalendario: z.number().int().describe("Ano-calendário, por exemplo 2025."),
      }),
      execute: async (ctx, { anoCalendario }): Promise<ObligationRow[]> =>
        ctx.runQuery(internal.obligations.listFor, { userId: toolUserId(ctx), anoCalendario }),
    }),
    obligation: createTool({
      description:
        "Mostra uma obrigação: o cálculo com a origem de cada valor, a guia preparada e o passo a passo para o usuário fazer por conta própria.",
      inputSchema: z.object({ obligationId: obligationIdSchema }),
      execute: async (ctx, { obligationId }): Promise<ObligationDetail> =>
        ctx.runQuery(internal.obligations.getFor, { userId: toolUserId(ctx), obligationId }),
    }),
    prepareGuide: createTool({
      description:
        "Calcula a obrigação e pede a guia à Receita. Não paga nada: o usuário revisa e aprova a guia no painel.",
      inputSchema: z.object({ obligationId: obligationIdSchema }),
      execute: async (ctx, { obligationId }) =>
        ctx.runMutation(internal.guides.prepareFor, { userId: toolUserId(ctx), obligationId }),
    }),
  },
});

export const thread = query({
  args: {},
  returns: v.union(v.null(), v.string()),
  handler: async (ctx) => threadIdOf(ctx, await requireUserId(ctx)),
});

export const send = mutation({
  args: { text: v.string() },
  returns: v.null(),
  handler: async (ctx, { text }) => {
    const userId = await requireUserId(ctx);
    const prompt = text.trim();
    if (prompt === "") return null;

    const threadId =
      (await threadIdOf(ctx, userId)) ?? (await createThread(ctx, components.agent, { userId }));
    const { messageId } = await saveMessage(ctx, components.agent, { threadId, userId, prompt });
    await ctx.scheduler.runAfter(0, internal.taxAgent.reply, {
      userId,
      threadId,
      promptMessageId: messageId,
    });
    return null;
  },
});

export const clearHistory = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const threadId = await threadIdOf(ctx, await requireUserId(ctx));
    if (threadId === null) return null;

    await taxAgent.updateThreadMetadata(ctx, { threadId, patch: { status: "archived" } });
    await taxAgent.deleteThreadAsync(ctx, { threadId });
    return null;
  },
});

export const messages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator, streamArgs: vStreamArgs },
  handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
    const userId = await requireUserId(ctx);
    const thread = await getThreadMetadata(ctx, components.agent, { threadId });
    if (thread.userId !== userId) {
      throw new Error(`Thread ${threadId} not found`);
    }
    const page = await listUIMessages(ctx, components.agent, { threadId, paginationOpts });
    const streams = await syncStreams(ctx, components.agent, { threadId, streamArgs });
    return { ...page, streams };
  },
});

export const reply = internalAction({
  args: { userId: v.string(), threadId: v.string(), promptMessageId: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, threadId, promptMessageId }) => {
    const model = await taxAgentModelFor(ctx, userId);
    if (model === null) return null;

    const result = await taxAgent.streamText(
      ctx,
      { threadId, userId },
      { promptMessageId, model },
      { saveStreamDeltas: true },
    );
    await result.consumeStream();
    return null;
  },
});

async function threadIdOf(ctx: QueryCtx, userId: string) {
  const { page } = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
    userId,
    order: "desc",
    paginationOpts: { numItems: 1, cursor: null },
  });
  const [latest] = page;
  if (latest === undefined || latest.status === "archived") return null;
  return latest._id;
}

function toolUserId(ctx: ToolCtx) {
  if (ctx.userId === undefined) {
    throw new Error("Tax agent tool called without a user");
  }
  return ctx.userId;
}
