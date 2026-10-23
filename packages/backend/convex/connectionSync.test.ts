import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "./_generated/api";
import { consentState } from "./lib/connectionStatus";
import { toBankTransaction } from "./lib/pluggy";
import schema from "./schema";
import { modules } from "./test.setup";

const NOW = Date.parse("2026-10-23T15:00:00-03:00");

const pluggyTransaction = {
  id: "tx-1",
  description: "PIX RECEBIDO",
  amount: 0.29,
  currencyCode: "BRL",
  date: "2026-10-01T00:00:00.000Z",
  type: "CREDIT" as const,
  status: "POSTED" as const,
};

function bankTransaction(externalId: string, amountCents: number) {
  return {
    externalId,
    postedAt: "2026-10-01T00:00:00.000Z",
    description: "PIX ENVIADO",
    amountCents,
    direction: "debit" as const,
    currency: "BRL",
    status: "posted" as const,
  };
}

async function setupAccount() {
  const t = convexTest(schema, modules);
  const connectionId = await t.run((ctx) =>
    ctx.db.insert("connections", {
      userId: "user-1",
      externalId: "item-1",
      institutionId: "2",
      institution: "Pluggy Bank",
      situations: [],
      status: "active",
      sync: "syncing",
    }),
  );
  const accountId = await t.mutation(internal.connectionSync.saveAccount, {
    connectionId,
    account: { externalId: "account-1", name: "Conta corrente", type: "bank", currency: "BRL" },
  });
  return { t, connectionId, accountId };
}

describe("toBankTransaction", () => {
  test("converts decimal reais to integer centavos without float drift", () => {
    expect(toBankTransaction(pluggyTransaction).amountCents).toBe(29);
    expect(toBankTransaction({ ...pluggyTransaction, amount: 1234.56 }).amountCents).toBe(123456);
  });

  test("takes the direction from the type, not the sign", () => {
    const cardCharge = toBankTransaction({ ...pluggyTransaction, amount: 80.5, type: "DEBIT" });
    const accountDebit = toBankTransaction({ ...pluggyTransaction, amount: -80.5, type: "DEBIT" });

    expect(cardCharge).toMatchObject({ amountCents: 8050, direction: "debit" });
    expect(accountDebit).toMatchObject({ amountCents: 8050, direction: "debit" });
  });

  test("keeps the provider timestamp untouched", () => {
    expect(toBankTransaction(pluggyTransaction).postedAt).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("consentState", () => {
  test("a consent without expiry stays active", () => {
    expect(consentState({ isRevoked: false, expiresOn: undefined }, NOW).status).toBe("active");
  });

  test("expiring within 7 days in São Paulo, expired after the day passes", () => {
    expect(consentState({ isRevoked: false, expiresOn: "2026-10-30" }, NOW).status).toBe(
      "expiring",
    );
    expect(consentState({ isRevoked: false, expiresOn: "2026-10-31" }, NOW).status).toBe("active");
    expect(consentState({ isRevoked: false, expiresOn: "2026-10-23" }, NOW).status).toBe(
      "expiring",
    );
    expect(consentState({ isRevoked: false, expiresOn: "2026-10-22" }, NOW).status).toBe("expired");
  });

  test("revoked wins over any expiry", () => {
    expect(consentState({ isRevoked: true, expiresOn: "2027-10-01" }, NOW).status).toBe("revoked");
  });
});

describe("transaction sync", () => {
  test("syncing the same transactions twice does not duplicate them", async () => {
    const { t, accountId } = await setupAccount();
    const transactions = [bankTransaction("tx-1", 1000), bankTransaction("tx-2", 2000)];

    await t.mutation(internal.connectionSync.saveTransactions, {
      accountId,
      transactions,
      syncedAt: 1,
    });
    await t.mutation(internal.connectionSync.saveTransactions, {
      accountId,
      transactions: [bankTransaction("tx-1", 1500), transactions[1]],
      syncedAt: 2,
    });

    const saved = await t.run((ctx) => ctx.db.query("transactions").collect());
    expect(saved.map(({ externalId, amountCents }) => ({ externalId, amountCents }))).toEqual([
      { externalId: "tx-1", amountCents: 1500 },
      { externalId: "tx-2", amountCents: 2000 },
    ]);
  });

  test("transactions the bank no longer returns are swept", async () => {
    const { t, accountId } = await setupAccount();
    await t.mutation(internal.connectionSync.saveTransactions, {
      accountId,
      transactions: [bankTransaction("tx-1", 1000), bankTransaction("tx-2", 2000)],
      syncedAt: 1,
    });
    await t.mutation(internal.connectionSync.saveTransactions, {
      accountId,
      transactions: [bankTransaction("tx-2", 2000)],
      syncedAt: 2,
    });

    await t.mutation(internal.connectionSync.sweepTransactions, { accountId, syncedBefore: 2 });

    const saved = await t.run((ctx) => ctx.db.query("transactions").collect());
    expect(saved.map(({ externalId }) => externalId)).toEqual(["tx-2"]);
  });

  test("disconnecting deletes the connection, its accounts and its transactions", async () => {
    const { t, connectionId, accountId } = await setupAccount();
    await t.mutation(internal.connectionSync.saveTransactions, {
      accountId,
      transactions: [bankTransaction("tx-1", 1000)],
      syncedAt: 1,
    });

    await t.mutation(internal.connections.remove, { connectionId });

    const remaining = await t.run(async (ctx) => [
      ...(await ctx.db.query("connections").collect()),
      ...(await ctx.db.query("accounts").collect()),
      ...(await ctx.db.query("transactions").collect()),
    ]);
    expect(remaining).toEqual([]);
  });
});

describe("reconnecting the same bank", () => {
  function saveItem(userId: string, externalId: string, situation: "salary" | "foreignIncome") {
    return {
      userId,
      externalId,
      institutionId: "2",
      institution: "Pluggy Bank",
      situations: [situation],
    };
  }

  test("upserts into the existing connection and reports the replaced item", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(
      internal.connections.save,
      saveItem("user-1", "item-1", "salary"),
    );
    const second = await t.mutation(
      internal.connections.save,
      saveItem("user-1", "item-2", "foreignIncome"),
    );

    expect(second).toEqual({ connectionId: first.connectionId, replacedExternalId: "item-1" });
    const connections = await t.run((ctx) => ctx.db.query("connections").collect());
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      externalId: "item-2",
      situations: ["salary", "foreignIncome"],
    });
  });

  test("another user's connection to the same bank is left alone", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.connections.save, saveItem("user-1", "item-1", "salary"));
    const other = await t.mutation(
      internal.connections.save,
      saveItem("user-2", "item-2", "salary"),
    );

    expect(other.replacedExternalId).toBeUndefined();
    expect(await t.run((ctx) => ctx.db.query("connections").collect())).toHaveLength(2);
  });

  test("clearing data drops the replaced item's accounts and transactions, keeping the connection", async () => {
    const { t, connectionId, accountId } = await setupAccount();
    await t.mutation(internal.connectionSync.saveTransactions, {
      accountId,
      transactions: [bankTransaction("old-tx", 1000)],
      syncedAt: 1,
    });

    while (await t.mutation(internal.connections.clearData, { connectionId }));

    const remaining = await t.run(async (ctx) => ({
      connections: (await ctx.db.query("connections").collect()).length,
      accounts: (await ctx.db.query("accounts").collect()).length,
      transactions: (await ctx.db.query("transactions").collect()).length,
    }));
    expect(remaining).toEqual({ connections: 1, accounts: 0, transactions: 0 });
  });
});
