import { describe, expect, test } from "vitest";

import { toSaoPauloDate } from "./connectionStatus";
import { sandboxForeignAccount, sandboxForeignTransactions } from "./pluggySandbox";

const { externalId: accountId } = sandboxForeignAccount("item-1");

function postedOnDates(now: string) {
  return sandboxForeignTransactions(accountId, Date.parse(now)).map(({ postedAt }) =>
    toSaoPauloDate(Date.parse(postedAt)),
  );
}

describe("sandboxForeignTransactions", () => {
  test("credits the first day of last month and this month in São Paulo", () => {
    expect(postedOnDates("2026-10-23T15:00:00-03:00")).toEqual(["2026-09-01", "2026-10-01"]);
  });

  test("never dates a credit after now, even at midnight of the first day", () => {
    expect(postedOnDates("2026-11-01T00:00:00-03:00")).toEqual(["2026-10-01", "2026-11-01"]);
  });

  test("January reaches back into December of the previous ano-calendário", () => {
    expect(postedOnDates("2027-01-10T12:00:00-03:00")).toEqual(["2026-12-01", "2027-01-01"]);
  });

  test("the same month always gets the same external id, so a resync does not duplicate it", () => {
    const first = sandboxForeignTransactions(accountId, Date.parse("2026-10-02T12:00:00-03:00"));
    const second = sandboxForeignTransactions(accountId, Date.parse("2026-10-30T12:00:00-03:00"));
    expect(second.map(({ externalId }) => externalId)).toEqual(
      first.map(({ externalId }) => externalId),
    );
  });
});
