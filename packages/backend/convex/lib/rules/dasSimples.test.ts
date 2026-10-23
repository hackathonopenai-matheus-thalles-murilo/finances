import { describe, expect, test } from "vitest";

import type { CalculationResult } from "./calculation";
import { calculateDasSimples, type DasSimplesFacts } from "./dasSimples";

type Receita = DasSimplesFacts["receitas"][number];

function facts(overrides: Partial<DasSimplesFacts>): DasSimplesFacts {
  return {
    kind: "dasSimples",
    inicioAtividadeOn: "2020-03-10",
    regimeApuracao: "competencia",
    receitas: [],
    receitasAnteriores: {},
    folhasCentavos: {},
    ...overrides,
  };
}

function receita(anexo: Receita["anexo"], receitaBrutaCentavos: number): Receita {
  return { anexo, tratamento: "normal", receitaBrutaCentavos };
}

function competenciasBefore(anoCalendario: number, month: number, count: number) {
  return Array.from({ length: count }, (_, offset) =>
    new Date(Date.UTC(anoCalendario, month - 1 - count + offset, 1)).toISOString().slice(0, 7),
  );
}

function receitasAnteriores(anoCalendario: number, month: number, centavosOldestFirst: number[]) {
  return Object.fromEntries(
    competenciasBefore(anoCalendario, month, centavosOldestFirst.length).map(
      (competencia, index) => [
        competencia,
        { mercadoInternoCentavos: centavosOldestFirst[index], mercadoExternoCentavos: 0 },
      ],
    ),
  );
}

function folhas(anoCalendario: number, month: number, centavosOldestFirst: number[]) {
  return Object.fromEntries(
    competenciasBefore(anoCalendario, month, centavosOldestFirst.length).map(
      (competencia, index) => [competencia, centavosOldestFirst[index]],
    ),
  );
}

function calculated(result: CalculationResult) {
  if (result.status === "unsupported") throw new Error(result.reason);
  return result.calculation;
}

function amountsByLabel(result: CalculationResult) {
  return Object.fromEntries(
    calculated(result).lines.map((line) => [line.label, line.amountCentavos]),
  );
}

function reasonOf(result: CalculationResult) {
  if (result.status === "calculated") throw new Error("Expected an unsupported result");
  return result.reason;
}

function twelveMonthsOf(centavos: number) {
  return Array.from({ length: 12 }, () => centavos);
}

function rbt12CentavosOf(result: CalculationResult) {
  return calculated(result).lines[0].amountCentavos;
}

function dueOnOf(anoCalendario: number, month: number) {
  const result = calculateDasSimples(
    facts({
      receitas: [receita("anexoI", 1_000_000)],
      receitasAnteriores: receitasAnteriores(anoCalendario, month, twelveMonthsOf(2_500_000)),
    }),
    anoCalendario,
    month,
  );
  return calculated(result).dueOn;
}

describe("official examples", () => {
  test("P&R 5.3.1: Anexo I, RBT12 R$ 220.000,00, receita R$ 25.000,00", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 2_500_000)],
        receitasAnteriores: receitasAnteriores(2026, 7, [
          ...Array.from({ length: 10 }, () => 1_800_000),
          2_000_000,
          2_000_000,
        ]),
      }),
      2026,
      7,
    );

    expect(calculated(result).amountCentavos).toBe(115_000);
    expect(amountsByLabel(result)).toMatchObject({
      "RBT12: receita bruta dos 12 meses anteriores": 22_000_000,
      "DAS do Anexo I com alíquota efetiva de 4,60%": 115_000,
    });
  });

  test("Manual M-1: Anexo I, RBT12 R$ 300.000,00, receita R$ 100.000,00", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 10_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, twelveMonthsOf(2_500_000)),
      }),
      2026,
      5,
    );

    expect(calculated(result).amountCentavos).toBe(532_000);
    expect(amountsByLabel(result)).toMatchObject({
      "Anexo I, 2ª faixa: alíquota nominal 7,30% e parcela a deduzir": 594_000,
      "IRPJ do Anexo I": 29_260,
      "CSLL do Anexo I": 18_620,
      "Cofins do Anexo I": 67_777,
      "PIS/Pasep do Anexo I": 14_683,
      "CPP do Anexo I": 220_780,
      "ICMS do Anexo I": 180_880,
      "DAS do Anexo I com alíquota efetiva de 5,32%": 532_000,
    });
  });

  test("Manual M-2: Anexo I and Anexo III in the same month share the RBT12", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 30_000_000), receita("anexoIII", 10_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, twelveMonthsOf(2_500_000)),
      }),
      2026,
      5,
    );

    expect(calculated(result).amountCentavos).toBe(2_404_000);
    expect(amountsByLabel(result)).toMatchObject({
      "DAS do Anexo I com alíquota efetiva de 5,32%": 1_596_000,
      "DAS do Anexo III com alíquota efetiva de 8,08%": 808_000,
    });
  });

  test("Manual M-3: start of activity, first three months", () => {
    const inicioAtividadeOn = "2026-01-12";
    const january = calculateDasSimples(
      facts({ inicioAtividadeOn, receitas: [receita("anexoI", 1_000_000)] }),
      2026,
      1,
    );
    const february = calculateDasSimples(
      facts({
        inicioAtividadeOn,
        receitas: [receita("anexoI", 10_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 2, [1_000_000]),
      }),
      2026,
      2,
    );
    const march = calculateDasSimples(
      facts({
        inicioAtividadeOn,
        receitas: [receita("anexoI", 10_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 3, [1_000_000, 10_000_000]),
      }),
      2026,
      3,
    );

    expect(calculated(january).amountCentavos).toBe(40_000);
    expect(amountsByLabel(january)).toMatchObject({
      "RBT12: receita do mês × 12 (primeiro mês de atividade)": 12_000_000,
    });
    expect(calculated(february).amountCentavos).toBe(400_000);
    expect(calculated(march).amountCentavos).toBe(740_000);
    expect(amountsByLabel(march)).toMatchObject({
      "RBT12: média mensal desde o início de atividade × 12": 66_000_000,
      "DAS do Anexo I com alíquota efetiva de 7,40%": 740_000,
    });
  });

  test("Manual M-4: fator R 0,50 puts the services in Anexo III", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("fatorR", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, [
          ...Array.from({ length: 10 }, () => 4_000_000),
          5_000_000,
          5_000_000,
        ]),
        folhasCentavos: folhas(2026, 5, [
          ...Array.from({ length: 10 }, () => 2_000_000),
          2_500_000,
          2_500_000,
        ]),
      }),
      2026,
      5,
    );

    expect(calculated(result).amountCentavos).toBe(99_720);
    expect(amountsByLabel(result)).toMatchObject({
      "Folha de salários dos meses anteriores (até 12)": 25_000_000,
      "Receita bruta para o fator R: r = 0,50, serviços no Anexo III": 50_000_000,
      "IRPJ do Anexo III": 3_989,
      "CSLL do Anexo III": 3_490,
      "Cofins do Anexo III": 13_602,
      "PIS/Pasep do Anexo III": 2_952,
      "CPP do Anexo III": 43_278,
      "ISS do Anexo III": 32_409,
      "DAS do Anexo III com alíquota efetiva de 9,972%": 99_720,
    });
  });

  test("Manual M-5: fator R 0,20 puts the services in Anexo V", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("fatorR", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, [
          ...Array.from({ length: 10 }, () => 4_000_000),
          5_000_000,
          5_000_000,
        ]),
        folhasCentavos: folhas(2026, 5, [
          ...Array.from({ length: 10 }, () => 800_000),
          1_000_000,
          1_000_000,
        ]),
      }),
      2026,
      5,
    );

    expect(calculated(result).amountCentavos).toBe(175_200);
    expect(amountsByLabel(result)).toMatchObject({
      "Receita bruta para o fator R: r = 0,20, serviços no Anexo V": 50_000_000,
      "IRPJ do Anexo V": 42_048,
      "CSLL do Anexo V": 26_280,
      "Cofins do Anexo V": 26_140,
      "PIS/Pasep do Anexo V": 5_659,
      "CPP do Anexo V": 41_785,
      "ISS do Anexo V": 33_288,
      "DAS do Anexo V com alíquota efetiva de 17,52%": 175_200,
    });
  });

  test("Manual M-6 mercado interno: the DAS is the sum of the tributos rounded half-up", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 10_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 7, [
          ...Array.from({ length: 10 }, () => 15_000_000),
          25_000_000,
          25_000_000,
        ]),
      }),
      2026,
      7,
    );

    expect(calculated(result).amountCentavos).toBe(993_502);
    expect(amountsByLabel(result)).toMatchObject({
      "Anexo I, 5ª faixa: alíquota nominal 14,30% e parcela a deduzir": 8_730_000,
      "IRPJ do Anexo I": 54_643,
      "CSLL do Anexo I": 34_773,
      "Cofins do Anexo I": 126_572,
      "PIS/Pasep do Anexo I": 27_421,
      "CPP do Anexo I": 417_270,
      "ICMS do Anexo I": 332_823,
      "DAS do Anexo I com alíquota efetiva de 9,935%": 993_502,
    });
  });

  test("P&R 5.4.1: RBT12 proporcionalizada in the first months of activity", () => {
    const inicioAtividadeOn = "2026-07-01";
    const july = calculateDasSimples(
      facts({ inicioAtividadeOn, receitas: [receita("anexoI", 900_000)] }),
      2026,
      7,
    );
    const august = calculateDasSimples(
      facts({
        inicioAtividadeOn,
        receitas: [receita("anexoI", 4_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 8, [900_000]),
      }),
      2026,
      8,
    );
    const september = calculateDasSimples(
      facts({
        inicioAtividadeOn,
        receitas: [receita("anexoI", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 9, [900_000, 4_000_000]),
      }),
      2026,
      9,
    );
    const octoberWithZeroMonths = calculateDasSimples(
      facts({
        inicioAtividadeOn,
        receitas: [receita("anexoI", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 10, [0, 0, 6_000_000]),
      }),
      2026,
      10,
    );

    expect(rbt12CentavosOf(july)).toBe(10_800_000);
    expect(rbt12CentavosOf(august)).toBe(10_800_000);
    expect(rbt12CentavosOf(september)).toBe(29_400_000);
    expect(rbt12CentavosOf(octoberWithZeroMonths)).toBe(24_000_000);
  });
});

describe("faixas", () => {
  test("RBT12 of exactly R$ 180.000,00 stays in the 1ª faixa", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, twelveMonthsOf(1_500_000)),
      }),
      2026,
      5,
    );

    expect(amountsByLabel(result)).toHaveProperty(
      "Anexo I, 1ª faixa: alíquota nominal 4,00% e parcela a deduzir",
    );
  });

  test("RBT12 one centavo above R$ 180.000,00 goes to the 2ª faixa", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, [
          ...twelveMonthsOf(1_500_000).slice(1),
          1_500_001,
        ]),
      }),
      2026,
      5,
    );

    expect(amountsByLabel(result)).toHaveProperty(
      "Anexo I, 2ª faixa: alíquota nominal 7,30% e parcela a deduzir",
    );
  });

  test("RBT12 of zero counts as R$ 1,00, so the alíquota efetiva is the nominal one", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, twelveMonthsOf(0)),
      }),
      2026,
      5,
    );

    expect(calculated(result).amountCentavos).toBe(40_000);
    expect(amountsByLabel(result)).toMatchObject({
      "RBT12: sem receita nos meses anteriores, considera R$ 1,00": 100,
    });
  });

  test("Anexo III above 14,92537% fixes ISS at 5% and moves the rest to the federal tributos", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoIII", 10_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 1, twelveMonthsOf(30_000_000)),
      }),
      2026,
      1,
    );

    expect(calculated(result).amountCentavos).toBe(1_751_001);
    expect(amountsByLabel(result)).toMatchObject({
      "IRPJ do Anexo III": 75_310,
      "CSLL do Anexo III": 65_803,
      "Cofins do Anexo III": 241_193,
      "PIS/Pasep do Anexo III": 52_292,
      "CPP do Anexo III": 816_403,
      "ISS do Anexo III": 500_000,
      "DAS do Anexo III com alíquota efetiva de 17,51%": 1_751_001,
    });
  });
});

describe("fator R", () => {
  const anteriores = receitasAnteriores(2026, 5, twelveMonthsOf(2_500_000));

  test("exactly 28% goes to Anexo III", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("fatorR", 1_000_000)],
        receitasAnteriores: anteriores,
        folhasCentavos: folhas(2026, 5, twelveMonthsOf(700_000)),
      }),
      2026,
      5,
    );

    expect(amountsByLabel(result)).toHaveProperty(
      "Receita bruta para o fator R: r = 0,28, serviços no Anexo III",
    );
  });

  test("27,99% is truncated to 0,27 and goes to Anexo V", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("fatorR", 1_000_000)],
        receitasAnteriores: anteriores,
        folhasCentavos: folhas(2026, 5, [...twelveMonthsOf(700_000).slice(1), 699_999]),
      }),
      2026,
      5,
    );

    expect(amountsByLabel(result)).toHaveProperty(
      "Receita bruta para o fator R: r = 0,27, serviços no Anexo V",
    );
  });

  test("no folha in the previous months gives r = 0,01 and Anexo V", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("fatorR", 1_000_000)],
        receitasAnteriores: anteriores,
        folhasCentavos: folhas(2026, 5, twelveMonthsOf(0)),
      }),
      2026,
      5,
    );

    expect(amountsByLabel(result)).toHaveProperty(
      "Receita bruta para o fator R: r = 0,01, serviços no Anexo V",
    );
  });

  test("folha without previous receita gives r = 0,28 and Anexo III", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("fatorR", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, twelveMonthsOf(0)),
        folhasCentavos: folhas(2026, 5, twelveMonthsOf(300_000)),
      }),
      2026,
      5,
    );

    expect(calculated(result).amountCentavos).toBe(60_000);
    expect(amountsByLabel(result)).toHaveProperty(
      "Receita bruta para o fator R: r = 0,28, serviços no Anexo III",
    );
  });

  test("first month without folha gives r = 0,01 and Anexo V", () => {
    const result = calculateDasSimples(
      facts({
        inicioAtividadeOn: "2026-05-04",
        receitas: [receita("fatorR", 1_000_000)],
        folhasCentavos: { "2026-05": 0 },
      }),
      2026,
      5,
    );

    expect(amountsByLabel(result)).toMatchObject({
      "Folha de salários do mês": 0,
      "Receita bruta para o fator R: r = 0,01, serviços no Anexo V": 1_000_000,
    });
  });

  test("first month uses the folha and receita of the month itself", () => {
    const result = calculateDasSimples(
      facts({
        inicioAtividadeOn: "2026-05-04",
        receitas: [receita("fatorR", 1_000_000)],
        folhasCentavos: { "2026-05": 300_000 },
      }),
      2026,
      5,
    );

    expect(amountsByLabel(result)).toMatchObject({
      "Folha de salários do mês": 300_000,
      "Receita bruta para o fator R: r = 0,30, serviços no Anexo III": 1_000_000,
    });
  });

  test("a missing folha month is asked for", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("fatorR", 1_000_000)],
        receitasAnteriores: anteriores,
        folhasCentavos: folhas(2026, 5, twelveMonthsOf(700_000).slice(1)),
      }),
      2026,
      5,
    );

    expect(reasonOf(result)).toBe("Falta a folha de salários de 05/2025.");
  });
});

describe("unsupported", () => {
  const anteriores = receitasAnteriores(2026, 5, twelveMonthsOf(2_500_000));

  test("export revenue", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [{ anexo: "anexoI", tratamento: "exportacao", receitaBrutaCentavos: 1_000_000 }],
        receitasAnteriores: anteriores,
      }),
      2026,
      5,
    );

    expect(result.status).toBe("unsupported");
  });

  test("RBT12 above R$ 3.600.000,00", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2026, 5, [
          ...twelveMonthsOf(30_000_000).slice(1),
          30_000_001,
        ]),
      }),
      2026,
      5,
    );

    expect(reasonOf(result)).toBe("Ainda não calculamos o DAS com RBT12 acima de R$ 3.600.000,00.");
  });

  test("ano-calendário 2027, when LC 214/2025 changes the Simples Nacional", () => {
    const result = calculateDasSimples(
      facts({
        receitas: [receita("anexoI", 1_000_000)],
        receitasAnteriores: receitasAnteriores(2027, 1, twelveMonthsOf(2_500_000)),
      }),
      2027,
      1,
    );

    expect(result.status).toBe("unsupported");
  });

  test("a DAS below R$ 10,00", () => {
    const result = calculateDasSimples(
      facts({ receitas: [receita("anexoI", 10_000)], receitasAnteriores: anteriores }),
      2026,
      5,
    );

    expect(result.status).toBe("unsupported");
  });

  test("a missing receita month", () => {
    const withoutSeptember = Object.fromEntries(
      Object.entries(anteriores).filter(([competencia]) => competencia !== "2025-09"),
    );
    const result = calculateDasSimples(
      facts({ receitas: [receita("anexoI", 1_000_000)], receitasAnteriores: withoutSeptember }),
      2026,
      5,
    );

    expect(reasonOf(result)).toBe("Falta a receita bruta de 09/2025.");
  });
});

describe("due date", () => {
  test("is day 20 of the following month", () => {
    expect(dueOnOf(2026, 4)).toBe("2026-05-20");
  });

  test("moves to the next business day when day 20 is a Sunday", () => {
    expect(dueOnOf(2026, 8)).toBe("2026-09-21");
  });

  test("moves past Consciência Negra and the weekend", () => {
    expect(dueOnOf(2026, 10)).toBe("2026-11-23");
  });

  test("December is due in January of the next year", () => {
    expect(dueOnOf(2025, 12)).toBe("2026-01-20");
  });
});
