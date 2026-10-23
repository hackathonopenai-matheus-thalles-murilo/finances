import { describe, expect, test } from "vitest";

import { calculateDasMei } from "./dasMei";

function calculated(result: ReturnType<typeof calculateDasMei>) {
  if (result.status !== "calculated") throw new Error(result.reason);
  return result.calculation;
}

describe("calculateDasMei", () => {
  test.each([
    ["comercioIndustria", 8205],
    ["servicos", 8605],
    ["comercioIndustriaServicos", 8705],
  ] as const)("matches the Receita's 2026 amount for %s", (activity, amountCentavos) => {
    const calculation = calculated(calculateDasMei({ kind: "dasMei", activity }, 2026, 3));

    expect(calculation.amountCentavos).toBe(amountCentavos);
  });

  test("uses the salário mínimo of the competência, not of the payment", () => {
    const calculation = calculated(
      calculateDasMei({ kind: "dasMei", activity: "servicos" }, 2025, 12),
    );

    expect(calculation.amountCentavos).toBe(8090);
    expect(calculation.dueOn).toBe("2026-01-20");
  });

  test("explains each part with its source", () => {
    const calculation = calculated(
      calculateDasMei({ kind: "dasMei", activity: "comercioIndustriaServicos" }, 2026, 3),
    );

    expect(calculation.lines).toEqual([
      {
        label: "INSS: 5% do salário mínimo de R$\u00a01.621,00",
        amountCentavos: 8105,
        source:
          "LC 123/2006, art. 18-A, §3º, IV; Lei 8.212/1991, art. 21, §2º, II, a; Decreto nº 12.797, de 23 de dezembro de 2025",
      },
      { label: "ICMS", amountCentavos: 100, source: "LC 123/2006, art. 18-A, §3º, V, b" },
      { label: "ISS", amountCentavos: 500, source: "LC 123/2006, art. 18-A, §3º, V, c" },
    ]);
  });

  test("is due on day 20 of the following month", () => {
    const calculation = calculated(
      calculateDasMei({ kind: "dasMei", activity: "servicos" }, 2026, 8),
    );

    expect(calculation.dueOn).toBe("2026-09-21");
  });

  test("moves a due date on a weekend to the next business day", () => {
    const calculation = calculated(
      calculateDasMei({ kind: "dasMei", activity: "servicos" }, 2026, 5),
    );

    expect(calculation.dueOn).toBe("2026-06-22");
  });

  test("moves a due date on Consciência Negra past the weekend", () => {
    const calculation = calculated(
      calculateDasMei({ kind: "dasMei", activity: "servicos" }, 2026, 10),
    );

    expect(calculation.dueOn).toBe("2026-11-23");
  });

  test("does not calculate a year without a table", () => {
    const result = calculateDasMei({ kind: "dasMei", activity: "servicos" }, 2027, 1);

    expect(result.status).toBe("unsupported");
  });
});
