import agentTest from "@convex-dev/agent/test";
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const ANSWER = "Não encontrei obrigações suas no ano-calendário 2026.";

vi.mock("./lib/taxAgentModel", async () => {
  const { mockModel } = await import("@convex-dev/agent");
  const answering = () => mockModel({ content: [{ type: "text", text: ANSWER }] });
  return { openRouterModel: answering, taxAgentModelFor: async () => answering() };
});

function setup() {
  const t = convexTest(schema, modules);
  agentTest.register(t);
  return {
    t,
    ana: t.withIdentity({ tokenIdentifier: "synthetic|user-ana" }),
    bruno: t.withIdentity({ tokenIdentifier: "synthetic|user-bruno" }),
  };
}

describe("tax agent thread", () => {
  test("every message from a user lands in the same thread", async () => {
    const { ana } = setup();

    await ana.mutation(api.taxAgent.send, { text: "Quando vence meu DAS?" });
    const threadId = await ana.query(api.taxAgent.thread, {});
    await ana.mutation(api.taxAgent.send, { text: "E o carnê-leão?" });

    expect(threadId).not.toBeNull();
    expect(await ana.query(api.taxAgent.thread, {})).toBe(threadId);
  });

  test("clearing the history empties the chat and the next message starts a new thread", async () => {
    const { ana } = setup();
    await ana.mutation(api.taxAgent.send, { text: "Quando vence meu DAS?" });
    const clearedThreadId = await ana.query(api.taxAgent.thread, {});

    await ana.mutation(api.taxAgent.clearHistory, {});
    expect(await ana.query(api.taxAgent.thread, {})).toBeNull();

    await ana.mutation(api.taxAgent.send, { text: "E o carnê-leão?" });
    const threadId = await ana.query(api.taxAgent.thread, {});
    expect(threadId).not.toBeNull();
    expect(threadId).not.toBe(clearedThreadId);
  });

  test("clearing one user's history keeps everyone else's", async () => {
    const { ana, bruno } = setup();
    await ana.mutation(api.taxAgent.send, { text: "Quando vence meu DAS?" });
    await bruno.mutation(api.taxAgent.send, { text: "E o carnê-leão?" });
    const brunoThreadId = await bruno.query(api.taxAgent.thread, {});

    await ana.mutation(api.taxAgent.clearHistory, {});

    expect(await bruno.query(api.taxAgent.thread, {})).toBe(brunoThreadId);
  });

  test("a user cannot read someone else's thread", async () => {
    const { ana, bruno } = setup();
    await ana.mutation(api.taxAgent.send, { text: "Quando vence meu DAS?" });
    const threadId = await ana.query(api.taxAgent.thread, {});
    if (threadId === null) throw new Error("Expected a thread");

    await expect(
      bruno.query(api.taxAgent.messages, {
        threadId,
        paginationOpts: { numItems: 10, cursor: null },
        streamArgs: undefined,
      }),
    ).rejects.toThrow("not found");
  });
});

describe("tax agent reply", () => {
  test("a question gets an answer in the user's thread", async () => {
    const { ana } = setup();

    await ana.mutation(api.taxAgent.send, { text: "Quais obrigações eu tenho?" });
    const threadId = await ana.query(api.taxAgent.thread, {});
    if (threadId === null) throw new Error("Expected a thread");

    await vi.waitFor(async () => {
      const messages = await ana.query(api.taxAgent.messages, {
        threadId,
        paginationOpts: { numItems: 10, cursor: null },
        streamArgs: undefined,
      });
      expect(messages.page.map(({ role, text }) => ({ role, text }))).toContainEqual({
        role: "assistant",
        text: ANSWER,
      });
    });
  });
});
