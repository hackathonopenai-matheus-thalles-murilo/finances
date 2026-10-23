import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const userId = "synthetic|user-ana";

function setup() {
  const t = convexTest(schema, modules);
  return { t, user: t.withIdentity({ tokenIdentifier: userId }) };
}

describe("situations", () => {
  test("is empty without a fiscal profile", async () => {
    const { user } = setup();

    expect(await user.query(api.profile.situations, {})).toEqual([]);
  });

  test("returns what was saved", async () => {
    const { user } = setup();

    await user.mutation(api.profile.saveSituations, { situations: ["salary", "foreignIncome"] });

    expect(await user.query(api.profile.situations, {})).toEqual(["salary", "foreignIncome"]);
  });

  test("saving again replaces the list in the same profile", async () => {
    const { t, user } = setup();

    await user.mutation(api.profile.saveSituations, { situations: ["salary", "foreignIncome"] });
    await user.mutation(api.profile.saveSituations, { situations: ["company"] });

    expect(await user.query(api.profile.situations, {})).toEqual(["company"]);
    const profiles = await t.run((ctx) => ctx.db.query("fiscalProfiles").collect());
    expect(profiles).toHaveLength(1);
  });

  test("drops repeated situations", async () => {
    const { user } = setup();

    await user.mutation(api.profile.saveSituations, {
      situations: ["rent", "salary", "rent"],
    });

    expect(await user.query(api.profile.situations, {})).toEqual(["rent", "salary"]);
  });

  test("requires a signed-in user", async () => {
    const { t } = setup();

    await expect(t.query(api.profile.situations, {})).rejects.toThrow("Not authenticated");
  });
});

describe("postponeOnboarding", () => {
  test("creates an empty fiscal profile when there is none", async () => {
    const { t, user } = setup();

    await user.mutation(api.profile.postponeOnboarding, {});

    const profiles = await t.run((ctx) => ctx.db.query("fiscalProfiles").collect());
    expect(profiles).toMatchObject([{ userId, situations: [] }]);
  });

  test("keeps the situations of an existing profile", async () => {
    const { t, user } = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["investments"] });

    await user.mutation(api.profile.postponeOnboarding, {});

    expect(await user.query(api.profile.situations, {})).toEqual(["investments"]);
    const profiles = await t.run((ctx) => ctx.db.query("fiscalProfiles").collect());
    expect(profiles).toHaveLength(1);
  });
});

describe("finishOnboarding", () => {
  test("fails without a fiscal profile", async () => {
    const { user } = setup();

    await expect(
      user.mutation(api.profile.finishOnboarding, { note: "Tenho um MEI" }),
    ).rejects.toThrow("Fiscal profile not found");
  });

  test("stores the trimmed note from the web channel", async () => {
    const { t, user } = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["company"] });

    await user.mutation(api.profile.finishOnboarding, { note: "  Tenho um MEI de design  " });

    const notes = await t.run((ctx) => ctx.db.query("profileNotes").collect());
    expect(notes).toMatchObject([{ userId, channel: "web", text: "Tenho um MEI de design" }]);
  });

  test("stores nothing for a blank note", async () => {
    const { t, user } = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["salary"] });

    await user.mutation(api.profile.finishOnboarding, { note: " \n\t " });

    const notes = await t.run((ctx) => ctx.db.query("profileNotes").collect());
    expect(notes).toEqual([]);
  });
});
