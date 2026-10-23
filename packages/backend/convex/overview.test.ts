import workflowTest from "@convex-dev/workflow/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const anoCalendario = 2026;

function setup() {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  return t.withIdentity({ tokenIdentifier: "synthetic|user-bruno" });
}

describe("hasFiscalProfile", () => {
  test("is false before the user picks any situation", async () => {
    const user = setup();

    const overview = await user.query(api.overview.get, { anoCalendario });

    expect(overview.hasFiscalProfile).toBe(false);
  });

  test("is true once situations are saved", async () => {
    const user = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["salary"] });

    const overview = await user.query(api.overview.get, { anoCalendario });

    expect(overview.hasFiscalProfile).toBe(true);
  });
});

describe("onboarding pendência", () => {
  test("is absent without a fiscal profile", async () => {
    const user = setup();

    const { pendencias } = await user.query(api.overview.get, { anoCalendario });

    expect(pendencias).not.toContainEqual({ type: "onboarding" });
  });

  test("shows while onboarding is unfinished", async () => {
    const user = setup();
    await user.mutation(api.profile.postponeOnboarding, {});

    const { pendencias } = await user.query(api.overview.get, { anoCalendario });

    expect(pendencias).toContainEqual({ type: "onboarding" });
  });

  test("goes away after onboarding finishes", async () => {
    const user = setup();
    await user.mutation(api.profile.saveSituations, { situations: ["salary"] });

    await user.mutation(api.profile.finishOnboarding, { note: "" });

    const { pendencias } = await user.query(api.overview.get, { anoCalendario });
    expect(pendencias).not.toContainEqual({ type: "onboarding" });
  });
});
