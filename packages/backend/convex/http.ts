import { httpRouter } from "convex/server";
import { z } from "zod";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const pluggyEvent = z.object({ event: z.string(), itemId: z.string().optional() });

const http = httpRouter();

http.route({
  path: "/pluggy/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = pluggyEvent.safeParse(await request.json());
    if (!body.success) return new Response(null, { status: 400 });
    if (body.data.itemId === undefined) return new Response(null, { status: 204 });

    await ctx.runMutation(internal.connectionSync.onItemEvent, { externalId: body.data.itemId });
    return new Response(null, { status: 204 });
  }),
});

http.route({
  path: "/webhook/evolution",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (!secret || request.headers.get("x-webhook-secret") !== secret) {
      return new Response(null, { status: 401 });
    }

    const body: unknown = await request.json();
    if (typeof body !== "object" || body === null || !("data" in body)) {
      return new Response(null, { status: 204 });
    }

    const event =
      "event" in body && typeof body.event === "string"
        ? body.event.toLowerCase().replaceAll("_", ".")
        : "";
    const data = body.data;
    if (event !== "messages.upsert" || typeof data !== "object" || data === null) {
      return new Response(null, { status: 204 });
    }

    const key = "key" in data ? data.key : null;
    if (typeof key !== "object" || key === null || ("fromMe" in key && key.fromMe === true)) {
      return new Response(null, { status: 204 });
    }

    const remoteJid = "remoteJid" in key && typeof key.remoteJid === "string" ? key.remoteJid : "";
    const remoteJidAlt =
      "remoteJidAlt" in key && typeof key.remoteJidAlt === "string" ? key.remoteJidAlt : "";
    if (remoteJid.endsWith("@g.us")) return new Response(null, { status: 204 });
    const addressingMode =
      "addressingMode" in key && typeof key.addressingMode === "string" ? key.addressingMode : "";
    const isLid = addressingMode === "lid" || remoteJid.endsWith("@lid");
    const phone = isLid && remoteJidAlt ? remoteJidAlt : remoteJid;
    const message =
      "message" in data && typeof data.message === "object" && data.message !== null
        ? data.message
        : null;
    if (!phone || !message) return new Response(null, { status: 204 });

    let text: string | undefined;
    if ("conversation" in message && typeof message.conversation === "string") {
      text = message.conversation;
    }
    if (
      "extendedTextMessage" in message &&
      typeof message.extendedTextMessage === "object" &&
      message.extendedTextMessage !== null &&
      "text" in message.extendedTextMessage &&
      typeof message.extendedTextMessage.text === "string"
    ) {
      text = message.extendedTextMessage.text;
    }

    const audioBase64 =
      "base64" in data && typeof data.base64 === "string"
        ? data.base64
        : "base64" in message && typeof message.base64 === "string"
          ? message.base64
          : undefined;

    if (text || audioBase64) {
      await ctx.runAction(internal.whatsapp.handleIncomingMessage, { phone, text, audioBase64 });
    }
    return new Response(null, { status: 204 });
  }),
});

export default http;
