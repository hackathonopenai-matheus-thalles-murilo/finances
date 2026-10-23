# Tax agent models

Decided by Thalles on 2026-10-23.

## OpenAI models only, through two providers

Tax agents run on `@convex-dev/agent` (AI SDK v7) and only on OpenAI models.

- **OpenRouter is the default.** Requests use our `OPENROUTER_API_KEY` with `provider: { data_collection: "deny", zdr: true }`, so OpenRouter only routes to endpoints that neither store nor train on the data. For OpenAI models that means Azure endpoints, since OpenAI's own endpoints are not on OpenRouter's zero-data-retention list.
- **Users can opt into their own ChatGPT plan.** This uses `@opencoredev/loginwithchatgpt-*` with the device-code flow, so it works without a browser redirect and from WhatsApp. The flow is not an official OpenAI integration: it reuses the public Codex CLI OAuth client and the `chatgpt.com/backend-api/codex` endpoint, and it can break or be blocked at any time. Because the data then goes to OpenAI under the user's personal account and its data settings, the user sees a consent step first, and we record `consentedAt`.

Tokens are sealed with AES-GCM using `SEALING_KEY` from the Convex environment. When a refresh token stops working, the session moves to `expired`, and the user either signs in again or disconnects. We never fall back to OpenRouter silently.

## Pinned AI SDK versions

`ai` is pinned to `7.0.140` (with `@ai-sdk/provider` `4.0.27`, `@ai-sdk/provider-utils` `5.0.59` and `@ai-sdk/openai` `4.0.93`). Starting with `@ai-sdk/provider-utils` `5.0.60` (first shipped in `ai` `7.0.141`), constructing `new Agent(...)` from `@convex-dev/agent` `0.7.8` fails to typecheck with "Expression produces a union type that is too complex to represent". Before you raise the pin, check that `new Agent(components.agent, {...})` still typechecks.
