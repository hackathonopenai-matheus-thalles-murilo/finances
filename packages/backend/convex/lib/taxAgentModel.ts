import { createChatGPT } from "@opencoredev/loginwithchatgpt-ai";
import {
  type ChatGPTTokens,
  ensureFreshTokens,
  isRefreshTokenInvalid,
  resolveConfig,
} from "@opencoredev/loginwithchatgpt-core";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { seal, unseal } from "./sealed";

const OPENAI_MODEL = "gpt-5.5";

const chatgptTokens = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  idToken: z.string().optional(),
  accountId: z.string().optional(),
  expiresAt: z.number().optional(),
});

export function openRouterModel() {
  return createOpenRouter()(`openai/${OPENAI_MODEL}`, {
    provider: { data_collection: "deny", zdr: true },
  });
}

export async function sealTokens(tokens: ChatGPTTokens) {
  return seal(JSON.stringify(tokens));
}

export async function taxAgentModelFor(ctx: ActionCtx, userId: string) {
  const account = await ctx.runQuery(internal.chatgpt.forUser, { userId });
  if (account === null || account.status === "pending") return openRouterModel();
  if (account.status === "expired") return null;

  async function saveTokens(tokens: ChatGPTTokens) {
    await ctx.runMutation(internal.chatgpt.saveTokens, {
      userId,
      tokens: await sealTokens(tokens),
    });
  }

  const stored = chatgptTokens.parse(JSON.parse(await unseal(account.tokens)));
  try {
    const credentials = await ensureFreshTokens(resolveConfig(), stored, { onRefresh: saveTokens });
    return createChatGPT({ credentials, onRefresh: saveTokens })(OPENAI_MODEL);
  } catch (error) {
    if (!isRefreshTokenInvalid(error)) throw error;
    await ctx.runMutation(internal.chatgpt.expire, { userId });
    return null;
  }
}
