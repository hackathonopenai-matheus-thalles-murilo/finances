import agentTest from "@convex-dev/agent/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

function setup() {
  const t = convexTest(schema, modules);
  agentTest.register(t);
  return {
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
