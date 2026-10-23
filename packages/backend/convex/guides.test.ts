import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const userId = "synthetic|user-dani";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T12:00:00-03:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function setup(
  obligation: Pick<Doc<"obligations">, "kind" | "month" | "facts"> = {
    kind: "dasMei",
    month: 10,
    facts: { kind: "dasMei", activity: "servicos" },
  },
) {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ tokenIdentifier: userId });
  const obligationId = await t.run((ctx) =>
    ctx.db.insert("obligations", {
      userId,
      anoCalendario: 2026,
      status: "upcoming",
      ...obligation,
    }),
  );
  return { t, user, obligationId };
}

async function runIssue(t: ReturnType<typeof convexTest>) {
  vi.runAllTimers();
  await t.finishInProgressScheduledFunctions();
}

async function prepared() {
  const context = await setup();
  await context.user.mutation(api.guides.prepare, { obligationId: context.obligationId });
  await runIssue(context.t);
  const detail = await context.user.query(api.obligations.get, {
    obligationId: context.obligationId,
  });
  if (detail.guide === null) throw new Error("Guide was not issued");
  return { ...context, guide: detail.guide };
}

describe("prepare", () => {
  test("issues a guide with our calculation, waiting for approval", async () => {
    const { user, obligationId } = await prepared();

    const detail = await user.query(api.obligations.get, { obligationId });

    expect(detail.status).toBe("awaitingApproval");
    expect(detail.dueOn).toBe("2026-11-23");
    expect(detail.guide).toMatchObject({
      status: "awaitingApproval",
      amountCentavos: 8605,
      document: { amountCentavos: 8605, dueOn: "2026-11-23" },
    });
  });

  test("asks the user when the obligation can't be calculated", async () => {
    const { user, obligationId } = await setup({
      kind: "dirpf",
      month: undefined,
      facts: undefined,
    });

    const result = await user.mutation(api.guides.prepare, { obligationId });

    expect(result.status).toBe("needsUser");
    const detail = await user.query(api.obligations.get, { obligationId });
    expect(detail.state.status).toBe("needsUser");
    expect(detail.guide).toBeNull();
  });

  test("replaces a guide still waiting for approval", async () => {
    const { t, user, obligationId, guide } = await prepared();

    await user.mutation(api.guides.prepare, { obligationId });
    await runIssue(t);

    const detail = await user.query(api.obligations.get, { obligationId });
    expect(detail.guide?.guideId).not.toBe(guide.guideId);
    await expect(
      user.mutation(api.guides.approve, {
        guideId: guide.guideId,
        documentHash: guide.document.hash,
      }),
    ).rejects.toThrow();
  });
});

describe("approve", () => {
  test("schedules the payment for the due date and pays it then", async () => {
    const { t, user, obligationId, guide } = await prepared();

    await user.mutation(api.guides.approve, {
      guideId: guide.guideId,
      documentHash: guide.document.hash,
    });

    const scheduled = await user.query(api.obligations.get, { obligationId });
    expect(scheduled.guide).toMatchObject({ status: "scheduled", debitOn: "2026-11-23" });

    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const paid = await user.query(api.obligations.get, { obligationId });
    expect(paid.guide).toMatchObject({ status: "paid", paymentProof: `SANDBOX-${guide.guideId}` });
  });

  test("refuses a document the user did not review", async () => {
    const { user, obligationId, guide } = await prepared();

    await expect(
      user.mutation(api.guides.approve, { guideId: guide.guideId, documentHash: "other" }),
    ).rejects.toThrow();

    const detail = await user.query(api.obligations.get, { obligationId });
    expect(detail.guide?.status).toBe("awaitingApproval");
  });

  test("refuses a guide past its due date", async () => {
    const { user, guide } = await prepared();
    vi.setSystemTime(new Date("2026-11-24T12:00:00-03:00"));

    await expect(
      user.mutation(api.guides.approve, {
        guideId: guide.guideId,
        documentHash: guide.document.hash,
      }),
    ).rejects.toThrow();
  });

  test("only the owner can approve", async () => {
    const { t, guide } = await prepared();
    const stranger = t.withIdentity({ tokenIdentifier: "synthetic|user-eva" });

    await expect(
      stranger.mutation(api.guides.approve, {
        guideId: guide.guideId,
        documentHash: guide.document.hash,
      }),
    ).rejects.toThrow();
  });
});

describe("revoke", () => {
  test("cancels the scheduled payment and waits for approval again", async () => {
    const { t, user, obligationId, guide } = await prepared();
    await user.mutation(api.guides.approve, {
      guideId: guide.guideId,
      documentHash: guide.document.hash,
    });

    await user.mutation(api.guides.revoke, { guideId: guide.guideId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const detail = await user.query(api.obligations.get, { obligationId });
    expect(detail.guide?.status).toBe("awaitingApproval");
  });
});

describe("done by the user", () => {
  test("voids the guide waiting for approval", async () => {
    const { user, obligationId } = await prepared();

    await user.mutation(api.obligations.markDone, { obligationId, doneOn: "2026-10-22" });

    const detail = await user.query(api.obligations.get, { obligationId });
    expect(detail.status).toBe("doneByUser");
    expect(detail.state).toEqual({ status: "doneByUser", doneOn: "2026-10-22", proofUrl: null });
    expect(detail.guide).toBeNull();
  });

  test("can be undone, and the obligation can be prepared again", async () => {
    const { t, user, obligationId } = await prepared();
    await user.mutation(api.obligations.markDone, { obligationId, doneOn: "2026-10-22" });

    await user.mutation(api.obligations.undoDone, { obligationId });
    await user.mutation(api.guides.prepare, { obligationId });
    await runIssue(t);

    const detail = await user.query(api.obligations.get, { obligationId });
    expect(detail.status).toBe("awaitingApproval");
  });

  test("is refused while we are paying it", async () => {
    const { user, obligationId, guide } = await prepared();
    await user.mutation(api.guides.approve, {
      guideId: guide.guideId,
      documentHash: guide.document.hash,
    });

    await expect(
      user.mutation(api.obligations.markDone, { obligationId, doneOn: "2026-10-22" }),
    ).rejects.toThrow();
  });

  test("is refused for a future date", async () => {
    const { user, obligationId } = await setup();

    await expect(
      user.mutation(api.obligations.markDone, { obligationId, doneOn: "2026-10-24" }),
    ).rejects.toThrow();
  });
});

describe("instructions", () => {
  test("list the DIRPF documents for the user's situations", async () => {
    const { user, obligationId } = await setup({
      kind: "dirpf",
      month: undefined,
      facts: undefined,
    });
    await user.mutation(api.profile.saveSituations, { situations: ["salary", "dependents"] });

    const { instructions } = await user.query(api.obligations.get, { obligationId });

    expect(instructions.documents).toContain(
      "Informe de rendimentos de cada empregador, entregue até o fim de fevereiro",
    );
    expect(instructions.documents).toContain("CPF de cada dependente");
    expect(instructions.documents).not.toContain("Contratos e recibos de aluguel");
  });
});
