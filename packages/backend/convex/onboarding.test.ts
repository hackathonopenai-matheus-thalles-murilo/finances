import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const userId = "synthetic|user-carla";

function setup() {
  const t = convexTest(schema, modules);
  return { t, user: t.withIdentity({ tokenIdentifier: userId }) };
}

function insertConnection(
  t: ReturnType<typeof setup>["t"],
  institution: string,
  situations: Doc<"connections">["situations"],
  status: "active" | "revoked" = "active",
) {
  return t.run((ctx) =>
    ctx.db.insert("connections", {
      userId,
      externalId: `synthetic-item-${institution}`,
      institutionId: `synthetic-${institution}`,
      institution,
      situations,
      sync: "synced",
      status,
    }),
  );
}

describe("connections", () => {
  test("suggests one bank per situation that needs an account, in canonical order", async () => {
    const { user } = setup();
    await user.mutation(api.profile.saveSituations, {
      situations: ["dependents", "rent", "salary", "investments", "company", "foreignIncome"],
    });

    const result = await user.query(api.onboarding.connections, {});

    expect(result).toEqual({
      suggestions: [
        { situation: "salary", connection: null },
        { situation: "foreignIncome", connection: null },
        { situation: "company", connection: null },
        { situation: "investments", connection: null },
        { situation: "rent", connection: null },
      ],
      others: [],
    });
  });

  test("suggests nothing for dependents alone", async () => {
    const { user } = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["dependents"] });

    const result = await user.query(api.onboarding.connections, {});

    expect(result.suggestions).toEqual([]);
  });

  test("shows one connection on every situation it was connected for", async () => {
    const { t, user } = setup();
    await user.mutation(api.profile.saveSituations, {
      situations: ["salary", "foreignIncome", "investments"],
    });
    const connectionId = await insertConnection(t, "Itaú", ["salary", "foreignIncome"]);

    const result = await user.query(api.onboarding.connections, {});

    const itau = { connectionId, institution: "Itaú" };
    expect(result.suggestions).toEqual([
      { situation: "salary", connection: itau },
      { situation: "foreignIncome", connection: itau },
      { situation: "investments", connection: null },
    ]);
    expect(result.others).toEqual([]);
  });

  test("lists connections that match no suggestion under others", async () => {
    const { t, user } = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["salary"] });
    const nubank = await insertConnection(t, "Nubank", []);
    const xp = await insertConnection(t, "XP Investimentos", ["investments"]);

    const result = await user.query(api.onboarding.connections, {});

    expect(result.suggestions).toEqual([{ situation: "salary", connection: null }]);
    expect(result.others).toEqual([
      { connectionId: nubank, institution: "Nubank" },
      { connectionId: xp, institution: "XP Investimentos" },
    ]);
  });

  test("ignores revoked connections and other users' connections", async () => {
    const { t, user } = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["salary"] });
    await insertConnection(t, "Itaú", ["salary"], "revoked");
    await t.run((ctx) =>
      ctx.db.insert("connections", {
        userId: "synthetic|user-intruder",
        externalId: "synthetic-item-intruder",
        institutionId: "synthetic-intruder",
        institution: "Bradesco",
        situations: ["salary"],
        sync: "synced",
        status: "active",
      }),
    );

    const result = await user.query(api.onboarding.connections, {});

    expect(result).toEqual({
      suggestions: [{ situation: "salary", connection: null }],
      others: [],
    });
  });
});
