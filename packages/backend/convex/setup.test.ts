import workflowTest from "@convex-dev/workflow/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const userId = "synthetic|user-dora";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T15:00:00-03:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function onboarded(note = "") {
  const t = convexTest(schema, modules);
  workflowTest.register(t);
  const user = t.withIdentity({ tokenIdentifier: userId });
  await user.mutation(api.profile.saveSituations, { situations: ["company", "foreignIncome"] });
  await user.mutation(api.profile.finishOnboarding, { note });
  return { t, user };
}

type Test = Awaited<ReturnType<typeof onboarded>>["t"];
type User = Awaited<ReturnType<typeof onboarded>>["user"];

async function insertTransactions(
  t: Test,
  rows: { postedAt: string; amountCents: number; direction: "credit" | "debit" }[],
) {
  return t.run(async (ctx) => {
    const connectionId = await ctx.db.insert("connections", {
      userId,
      externalId: "synthetic-item",
      institutionId: "synthetic-bank",
      institution: "Banco Sintético",
      situations: [],
      sync: "synced",
      status: "active",
    });
    const accountId = await ctx.db.insert("accounts", {
      userId,
      connectionId,
      externalId: "synthetic-account",
      name: "Conta",
      type: "bank",
      currency: "BRL",
    });
    return Promise.all(
      rows.map((row, index) =>
        ctx.db.insert("transactions", {
          ...row,
          userId,
          connectionId,
          accountId,
          externalId: `synthetic-tx-${index}`,
          description: "WISE PAYMENTS",
          currency: "BRL",
          status: "posted",
          syncedAt: Date.now(),
        }),
      ),
    );
  });
}

async function noteId(t: Test) {
  return t.run(async (ctx) => {
    const note = await ctx.db.query("profileNotes").first();
    if (note === null) throw new Error("No note");
    return note._id;
  });
}

async function proposeMei(
  t: Test,
  source: { noteId?: Id<"profileNotes">; transactionIds?: Id<"transactions">[] },
) {
  await t.mutation(internal.setup.saveProposals, {
    userId,
    readUpTo: Date.now(),
    mei: {
      evidence: "Você contou que tem um MEI.",
      noteId: source.noteId,
      transactionIds: source.transactionIds ?? [],
    },
    foreignIncomeTransactionIds: [],
  });
}

async function dasMeiDueDates(t: Test) {
  const obligations = await t.run((ctx) => ctx.db.query("obligations").collect());
  return obligations
    .filter((obligation) => obligation.kind === "dasMei")
    .map((obligation) => [obligation.month, obligation.dueOn, obligation.status]);
}

async function proposedFactId(user: User) {
  const { pendencias } = await user.query(api.overview.get, { anoCalendario: 2026 });
  const fact = pendencias.find((pendencia) => pendencia.type === "fact");
  if (fact?.type !== "fact") throw new Error("No proposed fact");
  return fact.factId;
}

describe("setup run", () => {
  test("the overview says it is preparing until the run saves its proposals", async () => {
    const { t, user } = await onboarded();

    expect((await user.query(api.overview.get, { anoCalendario: 2026 })).isPreparing).toBe(true);

    await t.mutation(internal.setup.saveProposals, {
      userId,
      readUpTo: Date.now(),
      foreignIncomeTransactionIds: [],
    });

    expect((await user.query(api.overview.get, { anoCalendario: 2026 })).isPreparing).toBe(false);
  });

  test("starts again when transactions arrived after it read its inputs", async () => {
    const { t, user } = await onboarded();
    const readUpTo = Date.now();
    vi.setSystemTime(new Date("2026-10-23T15:01:00-03:00"));
    await insertTransactions(t, [
      { postedAt: "2026-10-22T03:00:00.000Z", amountCents: 50000, direction: "credit" },
    ]);

    await t.mutation(internal.setup.saveProposals, {
      userId,
      readUpTo,
      foreignIncomeTransactionIds: [],
    });

    expect((await user.query(api.overview.get, { anoCalendario: 2026 })).isPreparing).toBe(true);
  });
});

describe("MEI", () => {
  test("confirming it creates every DAS-MEI of the ano-calendário with its due date", async () => {
    const { t, user } = await onboarded("Tenho um MEI de design");
    await proposeMei(t, { noteId: await noteId(t) });

    await user.mutation(api.facts.confirm, {
      factId: await proposedFactId(user),
      activity: "servicos",
    });

    const dueDates = await dasMeiDueDates(t);
    expect(dueDates).toHaveLength(12);
    expect(dueDates).toContainEqual([1, "2026-02-20", "upcoming"]);
    expect(dueDates).toContainEqual([5, "2026-06-22", "upcoming"]);
    expect(dueDates).toContainEqual([12, "2027-01-20", "upcoming"]);
    const { pendencias } = await user.query(api.overview.get, { anoCalendario: 2026 });
    expect(pendencias.some((pendencia) => pendencia.type === "fact")).toBe(false);
  });

  test("confirming keeps a month the user already did", async () => {
    const { t, user } = await onboarded("Tenho um MEI");
    await t.run((ctx) =>
      ctx.db.insert("obligations", {
        userId,
        kind: "dasMei",
        anoCalendario: 2026,
        month: 9,
        dueOn: "2026-10-20",
        status: "doneByUser",
        doneOn: "2026-10-15",
      }),
    );
    await proposeMei(t, { noteId: await noteId(t) });

    await user.mutation(api.facts.confirm, {
      factId: await proposedFactId(user),
      activity: "comercioIndustria",
    });

    const dueDates = await dasMeiDueDates(t);
    expect(dueDates).toHaveLength(12);
    expect(dueDates).toContainEqual([9, "2026-10-20", "doneByUser"]);
  });

  test("removing a confirmed MEI removes the DAS-MEI the user has not started", async () => {
    const { t, user } = await onboarded("Tenho um MEI");
    await proposeMei(t, { noteId: await noteId(t) });
    const factId = await proposedFactId(user);
    await user.mutation(api.facts.confirm, { factId, activity: "servicos" });
    await t.run(async (ctx) => {
      const september = (await ctx.db.query("obligations").collect()).find(
        (obligation) => obligation.month === 9,
      );
      if (september === undefined) throw new Error("No September DAS");
      await ctx.db.replace(september._id, {
        userId,
        kind: "dasMei",
        anoCalendario: 2026,
        month: 9,
        dueOn: september.dueOn,
        status: "doneByUser",
        doneOn: "2026-10-15",
      });
    });

    await user.mutation(api.facts.reject, { factId });

    expect(await dasMeiDueDates(t)).toEqual([[9, "2026-10-20", "doneByUser"]]);
  });

  test("after the user says no, only a new note asks again", async () => {
    const { t, user } = await onboarded("Tenho um MEI");
    const firstNote = await noteId(t);
    await proposeMei(t, { noteId: firstNote });
    await user.mutation(api.facts.reject, { factId: await proposedFactId(user) });
    const [dasPayment] = await insertTransactions(t, [
      { postedAt: "2026-10-20T03:00:00.000Z", amountCents: 8605, direction: "debit" },
    ]);
    const hasFact = async () =>
      (await user.query(api.overview.get, { anoCalendario: 2026 })).pendencias.some(
        (pendencia) => pendencia.type === "fact",
      );

    await user.mutation(api.setup.refresh, {});
    await proposeMei(t, { transactionIds: [dasPayment] });
    const afterTransactions = await hasFact();

    await user.mutation(api.setup.refresh, {});
    await proposeMei(t, { noteId: firstNote });
    const afterSameNote = await hasFact();

    const newNote = await t.run((ctx) =>
      ctx.db.insert("profileNotes", { userId, channel: "web", text: "Abri um MEI de novo" }),
    );
    await user.mutation(api.setup.refresh, {});
    await proposeMei(t, { noteId: newNote });

    expect([afterTransactions, afterSameNote, await hasFact()]).toEqual([false, false, true]);
  });
});

describe("re-review", () => {
  test("reads notes and transactions the last run already read", async () => {
    const { t, user } = await onboarded("Tenho um MEI");
    await insertTransactions(t, [
      { postedAt: "2026-10-10T03:00:00.000Z", amountCents: 100000, direction: "credit" },
    ]);
    vi.setSystemTime(new Date("2026-10-23T15:05:00-03:00"));
    await t.mutation(internal.setup.saveProposals, {
      userId,
      readUpTo: Date.now(),
      foreignIncomeTransactionIds: [],
    });

    const incremental = await t.query(internal.setup.inputs, { userId, rereadAll: false });
    await user.mutation(api.setup.refresh, {});
    const full = await t.query(internal.setup.inputs, { userId, rereadAll: true });

    expect([incremental.notes.length, incremental.transactions.length]).toEqual([0, 0]);
    expect([full.notes.length, full.transactions.length]).toEqual([1, 1]);
  });

  test("does not ask again about deposits the user already answered", async () => {
    const { t, user } = await onboarded();
    const transactionIds = await insertTransactions(t, [
      { postedAt: "2026-03-10T03:00:00.000Z", amountCents: 100000, direction: "credit" },
    ]);
    const propose = () =>
      t.mutation(internal.setup.saveProposals, {
        userId,
        readUpTo: Date.now(),
        foreignIncomeTransactionIds: transactionIds,
      });
    await propose();
    const { pendencias } = await user.query(api.overview.get, { anoCalendario: 2026 });
    const question = pendencias.find((pendencia) => pendencia.type === "foreignIncome");
    if (question?.type !== "foreignIncome") throw new Error("No question");
    await user.mutation(api.foreignIncome.answer, {
      questionId: question.questionId,
      isIncome: false,
    });

    await user.mutation(api.setup.refresh, {});
    await propose();

    const after = await user.query(api.overview.get, { anoCalendario: 2026 });
    expect(after.pendencias.some((pendencia) => pendencia.type === "foreignIncome")).toBe(false);
  });
});

describe("foreign income", () => {
  test("asks once per São Paulo month and ignores debits", async () => {
    const { t, user } = await onboarded();
    const transactionIds = await insertTransactions(t, [
      { postedAt: "2026-03-01T02:59:59.000Z", amountCents: 100000, direction: "credit" },
      { postedAt: "2026-03-01T03:00:00.000Z", amountCents: 200000, direction: "credit" },
      { postedAt: "2026-03-15T03:00:00.000Z", amountCents: 300000, direction: "credit" },
      { postedAt: "2026-03-16T03:00:00.000Z", amountCents: 400000, direction: "debit" },
    ]);

    await t.mutation(internal.setup.saveProposals, {
      userId,
      readUpTo: Date.now(),
      foreignIncomeTransactionIds: transactionIds,
    });

    const { pendencias } = await user.query(api.overview.get, { anoCalendario: 2026 });
    const questions = pendencias.flatMap((pendencia) =>
      pendencia.type === "foreignIncome"
        ? [[pendencia.month, pendencia.transactionCount, pendencia.amountCents]]
        : [],
    );
    expect(questions).toEqual(
      expect.arrayContaining([
        [2, 1, 100000],
        [3, 2, 500000],
      ]),
    );
    expect(questions).toHaveLength(2);
  });

  test("a yes creates that month's carnê-leão, a no creates nothing", async () => {
    const { t, user } = await onboarded();
    const transactionIds = await insertTransactions(t, [
      { postedAt: "2026-03-10T03:00:00.000Z", amountCents: 100000, direction: "credit" },
      { postedAt: "2026-04-10T03:00:00.000Z", amountCents: 100000, direction: "credit" },
    ]);
    await t.mutation(internal.setup.saveProposals, {
      userId,
      readUpTo: Date.now(),
      foreignIncomeTransactionIds: transactionIds,
    });
    const { pendencias } = await user.query(api.overview.get, { anoCalendario: 2026 });
    const questionOf = (month: number) => {
      const question = pendencias.find(
        (pendencia) => pendencia.type === "foreignIncome" && pendencia.month === month,
      );
      if (question?.type !== "foreignIncome") throw new Error(`No question for ${month}`);
      return question.questionId;
    };

    await user.mutation(api.foreignIncome.answer, { questionId: questionOf(3), isIncome: true });
    await user.mutation(api.foreignIncome.answer, { questionId: questionOf(4), isIncome: false });

    const obligations = await t.run((ctx) => ctx.db.query("obligations").collect());
    expect(
      obligations.map((obligation) => [obligation.kind, obligation.month, obligation.dueOn]),
    ).toEqual([["carneLeao", 3, "2026-04-30"]]);
  });
});
