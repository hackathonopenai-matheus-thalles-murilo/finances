import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const userId = "synthetic|user-ana";
const fakeSealed = { iv: "aXY=", ciphertext: "c2VjcmV0" };

function setup() {
  const t = convexTest(schema, modules);
  return { t, user: t.withIdentity({ tokenIdentifier: userId }) };
}

describe("chatgpt account", () => {
  test("a pending login shows the code but never the device auth id", async () => {
    const { t, user } = setup();
    await t.mutation(internal.chatgpt.savePending, {
      userId,
      userCode: "7B0J-DPK78",
      verificationUrl: "https://auth.openai.com/codex/device",
      expiresAt: 1_000,
      deviceAuthId: fakeSealed,
    });

    expect(await user.query(api.chatgpt.account, {})).toEqual({
      status: "pending",
      userCode: "7B0J-DPK78",
      verificationUrl: "https://auth.openai.com/codex/device",
      expiresAt: 1_000,
    });
  });

  test("a stale login poll does not connect over a newer login", async () => {
    const { t, user } = setup();
    await t.mutation(internal.chatgpt.savePending, {
      userId,
      userCode: "NEW-CODE",
      verificationUrl: "https://auth.openai.com/codex/device",
      expiresAt: 1_000,
      deviceAuthId: fakeSealed,
    });

    await t.mutation(internal.chatgpt.saveConnected, {
      userId,
      userCode: "OLD-CODE",
      tokens: fakeSealed,
    });

    const account = await user.query(api.chatgpt.account, {});
    expect(account.status).toBe("pending");
  });

  test("an expired session drops the stored tokens", async () => {
    const { t, user } = setup();
    await connect(t);

    await t.mutation(internal.chatgpt.expire, { userId });

    expect(await user.query(api.chatgpt.account, {})).toEqual({ status: "expired" });
    const stored = await t.run((ctx) => ctx.db.query("chatgptAccounts").unique());
    expect(stored).not.toHaveProperty("tokens");
  });

  test("disconnecting deletes the stored session", async () => {
    const { t, user } = setup();
    await connect(t);

    await user.mutation(api.chatgpt.disconnect, {});

    expect(await user.query(api.chatgpt.account, {})).toEqual({ status: "disconnected" });
    expect(await t.run((ctx) => ctx.db.query("chatgptAccounts").collect())).toEqual([]);
  });
});

async function connect(t: ReturnType<typeof convexTest>) {
  await t.mutation(internal.chatgpt.savePending, {
    userId,
    userCode: "7B0J-DPK78",
    verificationUrl: "https://auth.openai.com/codex/device",
    expiresAt: 1_000,
    deviceAuthId: fakeSealed,
  });
  await t.mutation(internal.chatgpt.saveConnected, {
    userId,
    userCode: "7B0J-DPK78",
    email: "ana@example.com",
    tokens: fakeSealed,
  });
}
