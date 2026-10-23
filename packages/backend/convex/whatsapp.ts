"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { normalizeBrazilianPhone } from "./lib/whatsappPhone";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Configure ${name} no ambiente do Convex.`);
  return value;
}

async function transcribeAudio(base64: string) {
  const encodedAudio = base64.replace(/^data:audio\/[^,]+,/i, "");
  const bytes = Uint8Array.from(atob(encodedAudio), (character) => character.charCodeAt(0));
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "audio/ogg" }), "audio.ogg");
  form.append("model", "whisper-1");
  form.append("language", "pt");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${requiredEnv("OPENAI_API_KEY")}` },
    body: form,
  });
  if (!response.ok) throw new Error("Não foi possível transcrever esse áudio.");
  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("text" in result) ||
    typeof result.text !== "string"
  ) {
    throw new Error("A transcrição retornou um formato inesperado.");
  }
  return result.text;
}

async function sendReply(phone: string, text: string) {
  const baseUrl = requiredEnv("EVOLUTION_URL").replace(/\/$/, "");
  const instance = encodeURIComponent(requiredEnv("EVOLUTION_INSTANCE"));
  const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: requiredEnv("EVOLUTION_KEY"),
    },
    body: JSON.stringify({ number: phone, text }),
  });
  if (!response.ok) throw new Error("Não foi possível responder pelo WhatsApp.");
  console.info("WhatsApp reply accepted by Evolution API");
}

function normalizeMessage(message: string) {
  return message
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function confirmsChange(message: string) {
  return /^(?:sim|confirmo|confirmo a alteracao|sim confirmo(?: a alteracao)?|sim pode confirmar(?: a alteracao)?|pode confirmar(?: a alteracao)?|pode mudar)(?: por favor)?$/.test(
    normalizeMessage(message),
  );
}

function cancelsChange(message: string) {
  return /^(?:nao|cancelar|cancelo)$/.test(normalizeMessage(message));
}

export const handleIncomingMessage = internalAction({
  args: {
    phone: v.string(),
    text: v.optional(v.string()),
    audioBase64: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const address = args.phone.split("@")[0]?.split(":")[0] ?? "";
    const phone = normalizeBrazilianPhone(address);
    if (!phone) return;
    const userId = await ctx.runQuery(internal.cashflowWhatsApp.resolveUserForPhone, { phone });
    if (!userId) return;

    let message = args.text?.trim() ?? "";
    if (args.audioBase64) message = await transcribeAudio(args.audioBase64);
    if (!message) {
      console.info("WhatsApp inbound ignored: message text is empty");
      return;
    }

    if (confirmsChange(message)) {
      const confirmed = await ctx.runMutation(internal.cashflow.confirmPendingChange, {
        userId,
        phone,
      });
      await sendReply(
        phone,
        confirmed
          ? `✅ ${confirmed.description} alterado para ${confirmed.newDate}. O painel já foi atualizado.`
          : "Não há nenhuma alteração aguardando confirmação.",
      );
      return;
    }

    if (cancelsChange(message)) {
      const discarded = await ctx.runMutation(internal.cashflow.discardPendingChange, {
        userId,
        phone,
      });
      await sendReply(
        phone,
        discarded
          ? "Alteração cancelada. As datas do painel continuam como estavam."
          : "Não há nenhuma alteração aguardando confirmação.",
      );
      return;
    }

    const transactions = await ctx.runQuery(internal.cashflow.getEditableTransactions, { userId });
    const receivables = transactions.filter(
      (transaction) => transaction.editable && transaction.type === "in",
    );
    if (receivables.length === 0) {
      await sendReply(
        phone,
        "Não encontrei recebimentos editáveis no painel. Carregue a demo ou importe o CSV na mesma conta usada pelo WhatsApp e tente novamente.",
      );
      return;
    }
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requiredEnv("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cashflow_date_change",
            strict: true,
            schema: {
              type: "object",
              properties: {
                transactionId: {
                  type: "string",
                  enum: ["", ...receivables.map((transaction) => transaction._id)],
                },
                newDate: { type: "string" },
              },
              required: ["transactionId", "newDate"],
              additionalProperties: false,
            },
          },
        },
        messages: [
          {
            role: "system",
            content: `Encontre o recebimento citado e a nova data no formato YYYY-MM-DD. Considere datas de novembro de 2026. Copie transactionId exatamente da movimentação correspondente. Se não identificar com segurança, use transactionId e newDate vazios. Recebimentos disponíveis: ${JSON.stringify(receivables.map(({ _id, description, date }) => ({ transactionId: _id, description, date })))}`,
          },
          { role: "user", content: message },
        ],
      }),
    });
    if (!response.ok) throw new Error("Não foi possível interpretar a mensagem.");
    const result: unknown = await response.json();
    let content: unknown;
    if (
      typeof result === "object" &&
      result !== null &&
      "choices" in result &&
      Array.isArray(result.choices)
    ) {
      const choice = result.choices[0];
      if (
        typeof choice === "object" &&
        choice !== null &&
        "message" in choice &&
        typeof choice.message === "object" &&
        choice.message !== null &&
        "content" in choice.message
      ) {
        content = choice.message.content;
      }
    }
    if (typeof content !== "string") {
      await sendReply(
        phone,
        "Não identifiquei o recebimento e a nova data. Tente dizer, por exemplo: Padaria Central para 22 de novembro.",
      );
      return;
    }

    let parsed: { transactionId: string; newDate: string } | null = null;
    try {
      const candidate: unknown = JSON.parse(content);
      if (
        typeof candidate === "object" &&
        candidate !== null &&
        "transactionId" in candidate &&
        typeof candidate.transactionId === "string" &&
        "newDate" in candidate &&
        typeof candidate.newDate === "string"
      ) {
        parsed = { transactionId: candidate.transactionId, newDate: candidate.newDate };
      }
    } catch {
      await sendReply(
        phone,
        "Não consegui entender a data. Tente informar o dia e o mês novamente.",
      );
      return;
    }
    const target = receivables.find((transaction) => transaction._id === parsed?.transactionId);
    if (!target || !parsed || !/^2026-11-(0[1-9]|[12]\d|30)$/.test(parsed.newDate)) {
      await sendReply(
        phone,
        "Não identifiquei com segurança o recebimento e a data. Tente informar o nome e o dia desejado.",
      );
      return;
    }

    await ctx.runMutation(internal.cashflow.savePendingChange, {
      userId,
      phone,
      transactionId: target._id,
      description: target.description,
      oldDate: target.date,
      newDate: parsed.newDate,
    });
    await sendReply(
      phone,
      `📝 Entendi: alterar ${target.description} de ${target.date} para ${parsed.newDate}. Responda SIM para confirmar.`,
    );
  },
});
