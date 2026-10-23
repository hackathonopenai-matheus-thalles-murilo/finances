import { describe, expect, test } from "vitest";

import { calculateCarneLeao, type CarneLeaoFacts } from "./carneLeao";

type Receipt = CarneLeaoFacts["receipts"][number];

function receipt(
  receivedOn: string,
  amountUsdCents: number,
  ptaxOn: string,
  ptaxCompraTenThousandths = 10_000,
): Receipt {
  return { receivedOn, amountUsdCents, ptaxOn, ptaxCompraTenThousandths };
}

function factsWith(
  receipts: Receipt[],
  { dependentes = 0, previdenciaOficialCentavos = 0, pensaoAlimenticiaCentavos = 0 } = {},
): CarneLeaoFacts {
  return {
    kind: "carneLeao",
    receipts,
    dependentes,
    previdenciaOficialCentavos,
    pensaoAlimenticiaCentavos,
  };
}

function calculated(result: ReturnType<typeof calculateCarneLeao>) {
  if (result.status !== "calculated") throw new Error(result.reason);
  return result.calculation;
}

function unsupportedReason(result: ReturnType<typeof calculateCarneLeao>) {
  if (result.status !== "unsupported") throw new Error("Expected an unsupported result");
  return result.reason;
}

function taxLineOf(calculation: ReturnType<typeof calculated>) {
  return calculation.lines.find((line) => line.label.startsWith("Imposto:"));
}

describe("calculateCarneLeao", () => {
  test("matches the Receita's example: R$ 3.307,50 in October 2025 owes R$ 20,36", () => {
    const calculation = calculated(
      calculateCarneLeao(factsWith([receipt("2025-10-17", 330750, "2025-09-15")]), 2025, 10),
    );

    expect(calculation.amountCentavos).toBe(2036);
    expect(calculation.dueOn).toBe("2025-11-28");
    expect(calculation.ruleTable).toEqual({ name: "carneLeao", anoCalendario: 2025 });
  });

  test("explains each step with its source", () => {
    const calculation = calculated(
      calculateCarneLeao(factsWith([receipt("2025-10-17", 330750, "2025-09-15")]), 2025, 10),
    );

    expect(calculation.lines).toEqual([
      {
        label: "Recebido em 17/10/2025: US$ 3.307,50 × PTAX de compra 1,0000 de 15/09/2025",
        amountCentavos: 330750,
        source: "Lei 9.250/1995, art. 6º; RIR/2018, art. 119",
      },
      {
        label: "Rendimentos do mês",
        amountCentavos: 330750,
        source: "Lei 7.713/1988, art. 8º; RIR/2018, art. 118",
      },
      {
        label:
          "Desconto simplificado (25% de R$ 2.428,80), no lugar das deduções legais de R$ 0,00",
        amountCentavos: 60720,
        source:
          "Lei 9.250/1995, art. 4º, §2º; Lei 11.482/2007, art. 1º, XII, na redação da Lei 15.191/2025",
      },
      { label: "Base de cálculo", amountCentavos: 270030, source: "RIR/2018, art. 121" },
      {
        label: "Imposto: 7,5% da base menos R$ 182,16 de parcela a deduzir",
        amountCentavos: 2036,
        source: "Lei 11.482/2007, art. 1º, XII, na redação da Lei 15.191/2025",
      },
    ]);
    expect(calculation.dueOnSource).toBe(
      "RIR/2018, art. 123; Lei 8.383/1991, art. 6º; Lei 662/1949; Lei 6.802/1980; Lei 14.759/2023; Resolução CMN 4.880/2020, art. 6º; calendário Febraban 2025",
    );
  });

  test("converts at the PTAX de compra, rounding half up to the centavo", () => {
    const calculation = calculated(
      calculateCarneLeao(
        factsWith([
          receipt("2026-10-05", 33333, "2026-09-15", 51484),
          receipt("2026-10-20", 150000, "2026-09-15", 51484),
        ]),
        2026,
        10,
      ),
    );

    expect(calculation.lines.slice(0, 3).map((line) => line.amountCentavos)).toEqual([
      171612, 772260, 943872,
    ]);
  });

  test("uses the January to April 2025 table until April and the new one from May", () => {
    const april = calculated(
      calculateCarneLeao(factsWith([receipt("2025-04-10", 400000, "2025-03-14")]), 2025, 4),
    );
    const may = calculated(
      calculateCarneLeao(factsWith([receipt("2025-05-10", 400000, "2025-04-15")]), 2025, 5),
    );

    expect(april.amountCentavos).toBe(13384);
    expect(april.lines).toContainEqual(
      expect.objectContaining({ label: expect.stringContaining("25% de R$ 2.259,20") }),
    );
    expect(may.amountCentavos).toBe(11476);
    expect(may.lines).toContainEqual(
      expect.objectContaining({ label: expect.stringContaining("25% de R$ 2.428,80") }),
    );
  });

  test.each([
    [282665, "7,5", 2984],
    [282666, "15", 2984],
    [375105, "15", 16850],
    [375106, "22,5", 16850],
    [466468, "22,5", 37406],
    [466469, "27,5", 37406],
  ])("taxes a base of %i centavos at %s%%", (baseCentavos, rate, taxCentavos) => {
    const calculation = calculated(
      calculateCarneLeao(
        factsWith([receipt("2025-10-17", baseCentavos + 60720, "2025-09-15")]),
        2025,
        10,
      ),
    );

    expect(calculation.amountCentavos).toBe(taxCentavos);
    expect(taxLineOf(calculation)?.label).toContain(`${rate}% da base`);
  });

  test.each([242880, 242881])("owes nothing on a base of %i centavos", (baseCentavos) => {
    const result = calculateCarneLeao(
      factsWith([receipt("2025-10-17", baseCentavos + 60720, "2025-09-15")]),
      2025,
      10,
    );

    expect(unsupportedReason(result)).toBe("Não há imposto a pagar neste mês.");
  });

  test("uses the legal deductions when they beat the desconto simplificado", () => {
    const calculation = calculated(
      calculateCarneLeao(
        factsWith([receipt("2025-10-17", 400000, "2025-09-15")], {
          dependentes: 2,
          previdenciaOficialCentavos: 30000,
        }),
        2025,
        10,
      ),
    );

    expect(calculation.amountCentavos).toBe(10396);
    expect(calculation.lines.slice(2, 6)).toEqual([
      {
        label: "Dependentes: 2 × R$ 189,59",
        amountCentavos: 37918,
        source: "Lei 9.250/1995, art. 4º, III, i; RIR/2018, art. 71",
      },
      {
        label: "Previdência oficial",
        amountCentavos: 30000,
        source: "Lei 9.250/1995, art. 4º, IV; RIR/2018, art. 67, I",
      },
      {
        label: "Deduções legais, no lugar do desconto simplificado de R$ 607,20",
        amountCentavos: 67918,
        source: "Lei 9.250/1995, art. 4º, caput e §2º; RIR/2018, art. 121",
      },
      { label: "Base de cálculo", amountCentavos: 332082, source: "RIR/2018, art. 121" },
    ]);
  });

  test("keeps the desconto simplificado when the legal deductions are smaller", () => {
    const calculation = calculated(
      calculateCarneLeao(
        factsWith([receipt("2025-10-17", 400000, "2025-09-15")], {
          dependentes: 1,
          pensaoAlimenticiaCentavos: 20000,
        }),
        2025,
        10,
      ),
    );

    expect(calculation.amountCentavos).toBe(11476);
    expect(calculation.lines[2].label).toBe(
      "Desconto simplificado (25% de R$ 2.428,80), no lugar das deduções legais de R$ 389,59",
    );
  });

  test("refuses a PTAX from a date other than the last business day of the first fortnight", () => {
    const result = calculateCarneLeao(
      factsWith([receipt("2025-10-17", 330750, "2025-10-17")]),
      2025,
      10,
    );

    expect(unsupportedReason(result)).toContain("pede a PTAX de compra de 15/09/2025");
  });

  test("looks for the PTAX before a holiday on the 15th", () => {
    const calculation = calculated(
      calculateCarneLeao(factsWith([receipt("2025-12-05", 330750, "2025-11-14")]), 2025, 12),
    );

    expect(calculation.amountCentavos).toBe(2036);
  });

  test("refuses a receipt outside the obligation's month", () => {
    const result = calculateCarneLeao(
      factsWith([receipt("2025-09-30", 330750, "2025-08-15")]),
      2025,
      10,
    );

    expect(unsupportedReason(result)).toBe("O recebimento de 30/09/2025 não é de 10/2025.");
  });

  test("calculates 2026 without the Lei 15.270/2025 reduction above R$ 7.350,00", () => {
    const calculation = calculated(
      calculateCarneLeao(factsWith([receipt("2026-10-20", 150000, "2026-09-15", 51484)]), 2026, 10),
    );

    expect(calculation.amountCentavos).toBe(104801);
    expect(calculation.lines.slice(-1)).toEqual([
      {
        label: "Sem redução da Lei 15.270/2025: rendimentos acima de R$ 7.350,00",
        amountCentavos: 0,
        source:
          "Lei 9.250/1995, art. 3º-A, §2º, incluído pela Lei 15.270/2025; IN RFB 1.500/2014, art. 65-A, §2º",
      },
    ]);
  });

  test.each([514840, 735000])(
    "does not calculate 2026 with %i centavos in the month while the reduction is unconfirmed",
    (incomeCentavos) => {
      const result = calculateCarneLeao(
        factsWith([receipt("2026-10-20", incomeCentavos, "2026-09-15")]),
        2026,
        10,
      );

      expect(unsupportedReason(result)).toContain("redução da Lei 15.270/2025");
    },
  );

  test("calculates 2026 from one centavo above R$ 7.350,00", () => {
    const result = calculateCarneLeao(
      factsWith([receipt("2026-10-20", 735001, "2026-09-15")]),
      2026,
      10,
    );

    expect(calculated(result).amountCentavos).toBe(94554);
  });

  test("owes nothing in a month without receipts", () => {
    const result = calculateCarneLeao(factsWith([]), 2025, 10);

    expect(unsupportedReason(result)).toBe("Não há imposto a pagar neste mês.");
  });

  test("does not issue a DARF under R$ 10,00", () => {
    const result = calculateCarneLeao(
      factsWith([receipt("2025-10-17", 303667, "2025-09-15")]),
      2025,
      10,
    );

    expect(unsupportedReason(result)).toBe(
      "O imposto deste mês é de R$ 0,05, abaixo do mínimo de R$ 10,00 para um DARF. Ele se soma ao imposto do mês seguinte (Lei 9.430/1996, art. 68, §1º).",
    );
  });

  test("is due on 30/12 for November because 31/12 is not a payment day", () => {
    const calculation = calculated(
      calculateCarneLeao(factsWith([receipt("2026-11-10", 800000, "2026-10-15")]), 2026, 11),
    );

    expect(calculation.dueOn).toBe("2026-12-30");
  });

  test("is due on the last business day of January for December", () => {
    const calculation = calculated(
      calculateCarneLeao(factsWith([receipt("2026-12-10", 800000, "2026-11-13")]), 2026, 12),
    );

    expect(calculation.dueOn).toBe("2027-01-29");
  });

  test("does not calculate January 2025 without the 2024 calendar for the PTAX", () => {
    const result = calculateCarneLeao(
      factsWith([receipt("2025-01-10", 330750, "2024-12-13")]),
      2025,
      1,
    );

    expect(unsupportedReason(result)).toContain("calendário bancário de 2024");
  });

  test.each([2024, 2027])("does not calculate %i without a table", (anoCalendario) => {
    const result = calculateCarneLeao(factsWith([]), anoCalendario, 6);

    expect(result.status).toBe("unsupported");
  });
});
