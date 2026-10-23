import { v, type Infer } from "convex/values";

import type { Calculation, CalculationResult } from "./calculation";
import { hasCalendar } from "./calendar";
import { dasDueOn, dasDueOnSourceFor, dueYearOf } from "./dueOn";

export const dasSimplesFacts = v.object({
  kind: v.literal("dasSimples"),
  inicioAtividadeOn: v.string(),
  regimeApuracao: v.union(v.literal("competencia"), v.literal("caixa")),
  receitas: v.array(
    v.object({
      anexo: v.union(
        v.literal("anexoI"),
        v.literal("anexoII"),
        v.literal("anexoIII"),
        v.literal("anexoIV"),
        v.literal("anexoV"),
        v.literal("fatorR"),
      ),
      tratamento: v.union(
        v.literal("normal"),
        v.literal("exportacao"),
        v.literal("substituicaoTributaria"),
        v.literal("tributacaoMonofasica"),
        v.literal("issRetido"),
      ),
      receitaBrutaCentavos: v.number(),
    }),
  ),
  receitasAnteriores: v.record(
    v.string(),
    v.object({ mercadoInternoCentavos: v.number(), mercadoExternoCentavos: v.number() }),
  ),
  folhasCentavos: v.record(v.string(), v.number()),
});

export type DasSimplesFacts = Infer<typeof dasSimplesFacts>;

type Atividade = DasSimplesFacts["receitas"][number]["anexo"];

type Anexo = Exclude<Atividade, "fatorR">;

type Line = Calculation["lines"][number];

type Tributo = "irpj" | "csll" | "cofins" | "pis" | "cpp" | "ipi" | "icms" | "iss";

type Fraction = { numerator: bigint; denominator: bigint };

type Reparticao = [Tributo, number][];

type Faixa = {
  aliquotaNominalBps: number;
  parcelaDeduzirCentavos: number;
  reparticao: Reparticao;
  tetoIss?: {
    aliquotaEfetivaAcimaDe: Fraction;
    issBps: number;
    reparticaoFederal: Reparticao;
    source: string;
  };
};

type AnexoRules = { name: string; source: string; faixas: Faixa[] };

type DasSimplesRules = {
  faixasAteCentavos: number[];
  anexos: Record<Anexo, AnexoRules>;
  sublimiteCentavos: number;
  sublimiteMensalInicioAtividadeCentavos: number;
  sublimiteSource: string;
  fatorRMinimoPercent: number;
};

type Rbt12 = { centavos: Fraction; label: string; source: string };

type FatorR = { percent: number; source: string };

type TributoAmount = { tributo: Tributo; amountCentavos: number; source: string };

const tributoNames: Record<Tributo, string> = {
  irpj: "IRPJ",
  csll: "CSLL",
  cofins: "Cofins",
  pis: "PIS/Pasep",
  cpp: "CPP",
  ipi: "IPI",
  icms: "ICMS",
  iss: "ISS",
};

const anexoOrder: Anexo[] = ["anexoI", "anexoII", "anexoIII", "anexoIV", "anexoV"];

const anexosLc155: Record<Anexo, AnexoRules> = {
  anexoI: {
    name: "Anexo I",
    source: "LC 123/2006, Anexo I, redação da LC 155/2016",
    faixas: [
      {
        aliquotaNominalBps: 400,
        parcelaDeduzirCentavos: 0,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1274],
          ["pis", 276],
          ["cpp", 4150],
          ["icms", 3400],
        ],
      },
      {
        aliquotaNominalBps: 730,
        parcelaDeduzirCentavos: 594_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1274],
          ["pis", 276],
          ["cpp", 4150],
          ["icms", 3400],
        ],
      },
      {
        aliquotaNominalBps: 950,
        parcelaDeduzirCentavos: 1_386_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1274],
          ["pis", 276],
          ["cpp", 4200],
          ["icms", 3350],
        ],
      },
      {
        aliquotaNominalBps: 1070,
        parcelaDeduzirCentavos: 2_250_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1274],
          ["pis", 276],
          ["cpp", 4200],
          ["icms", 3350],
        ],
      },
      {
        aliquotaNominalBps: 1430,
        parcelaDeduzirCentavos: 8_730_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1274],
          ["pis", 276],
          ["cpp", 4200],
          ["icms", 3350],
        ],
      },
    ],
  },
  anexoII: {
    name: "Anexo II",
    source: "LC 123/2006, Anexo II, redação da LC 155/2016",
    faixas: [
      {
        aliquotaNominalBps: 450,
        parcelaDeduzirCentavos: 0,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1151],
          ["pis", 249],
          ["cpp", 3750],
          ["ipi", 750],
          ["icms", 3200],
        ],
      },
      {
        aliquotaNominalBps: 780,
        parcelaDeduzirCentavos: 594_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1151],
          ["pis", 249],
          ["cpp", 3750],
          ["ipi", 750],
          ["icms", 3200],
        ],
      },
      {
        aliquotaNominalBps: 1000,
        parcelaDeduzirCentavos: 1_386_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1151],
          ["pis", 249],
          ["cpp", 3750],
          ["ipi", 750],
          ["icms", 3200],
        ],
      },
      {
        aliquotaNominalBps: 1120,
        parcelaDeduzirCentavos: 2_250_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1151],
          ["pis", 249],
          ["cpp", 3750],
          ["ipi", 750],
          ["icms", 3200],
        ],
      },
      {
        aliquotaNominalBps: 1470,
        parcelaDeduzirCentavos: 8_550_000,
        reparticao: [
          ["irpj", 550],
          ["csll", 350],
          ["cofins", 1151],
          ["pis", 249],
          ["cpp", 3750],
          ["ipi", 750],
          ["icms", 3200],
        ],
      },
    ],
  },
  anexoIII: {
    name: "Anexo III",
    source: "LC 123/2006, Anexo III, redação da LC 155/2016",
    faixas: [
      {
        aliquotaNominalBps: 600,
        parcelaDeduzirCentavos: 0,
        reparticao: [
          ["irpj", 400],
          ["csll", 350],
          ["cofins", 1282],
          ["pis", 278],
          ["cpp", 4340],
          ["iss", 3350],
        ],
      },
      {
        aliquotaNominalBps: 1120,
        parcelaDeduzirCentavos: 936_000,
        reparticao: [
          ["irpj", 400],
          ["csll", 350],
          ["cofins", 1405],
          ["pis", 305],
          ["cpp", 4340],
          ["iss", 3200],
        ],
      },
      {
        aliquotaNominalBps: 1350,
        parcelaDeduzirCentavos: 1_764_000,
        reparticao: [
          ["irpj", 400],
          ["csll", 350],
          ["cofins", 1364],
          ["pis", 296],
          ["cpp", 4340],
          ["iss", 3250],
        ],
      },
      {
        aliquotaNominalBps: 1600,
        parcelaDeduzirCentavos: 3_564_000,
        reparticao: [
          ["irpj", 400],
          ["csll", 350],
          ["cofins", 1364],
          ["pis", 296],
          ["cpp", 4340],
          ["iss", 3250],
        ],
      },
      {
        aliquotaNominalBps: 2100,
        parcelaDeduzirCentavos: 12_564_000,
        reparticao: [
          ["irpj", 400],
          ["csll", 350],
          ["cofins", 1282],
          ["pis", 278],
          ["cpp", 4340],
          ["iss", 3350],
        ],
        tetoIss: {
          aliquotaEfetivaAcimaDe: { numerator: 1_492_537n, denominator: 10_000_000n },
          issBps: 500,
          reparticaoFederal: [
            ["irpj", 602],
            ["csll", 526],
            ["cofins", 1928],
            ["pis", 418],
            ["cpp", 6526],
          ],
          source: "LC 123/2006, art. 18, § 1º-B, I, e Anexo III, 5ª faixa, redação da LC 155/2016",
        },
      },
    ],
  },
  anexoIV: {
    name: "Anexo IV",
    source: "LC 123/2006, Anexo IV, redação da LC 155/2016",
    faixas: [
      {
        aliquotaNominalBps: 450,
        parcelaDeduzirCentavos: 0,
        reparticao: [
          ["irpj", 1880],
          ["csll", 1520],
          ["cofins", 1767],
          ["pis", 383],
          ["iss", 4450],
        ],
      },
      {
        aliquotaNominalBps: 900,
        parcelaDeduzirCentavos: 810_000,
        reparticao: [
          ["irpj", 1980],
          ["csll", 1520],
          ["cofins", 2055],
          ["pis", 445],
          ["iss", 4000],
        ],
      },
      {
        aliquotaNominalBps: 1020,
        parcelaDeduzirCentavos: 1_242_000,
        reparticao: [
          ["irpj", 2080],
          ["csll", 1520],
          ["cofins", 1973],
          ["pis", 427],
          ["iss", 4000],
        ],
      },
      {
        aliquotaNominalBps: 1400,
        parcelaDeduzirCentavos: 3_978_000,
        reparticao: [
          ["irpj", 1780],
          ["csll", 1920],
          ["cofins", 1890],
          ["pis", 410],
          ["iss", 4000],
        ],
      },
      {
        aliquotaNominalBps: 2200,
        parcelaDeduzirCentavos: 18_378_000,
        reparticao: [
          ["irpj", 1880],
          ["csll", 1920],
          ["cofins", 1808],
          ["pis", 392],
          ["iss", 4000],
        ],
        tetoIss: {
          aliquotaEfetivaAcimaDe: { numerator: 125n, denominator: 1000n },
          issBps: 500,
          reparticaoFederal: [
            ["irpj", 3133],
            ["csll", 3200],
            ["cofins", 3013],
            ["pis", 654],
          ],
          source: "LC 123/2006, art. 18, § 1º-B, I, e Anexo IV, 5ª faixa, redação da LC 155/2016",
        },
      },
    ],
  },
  anexoV: {
    name: "Anexo V",
    source: "LC 123/2006, Anexo V, redação da LC 155/2016",
    faixas: [
      {
        aliquotaNominalBps: 1550,
        parcelaDeduzirCentavos: 0,
        reparticao: [
          ["irpj", 2500],
          ["csll", 1500],
          ["cofins", 1410],
          ["pis", 305],
          ["cpp", 2885],
          ["iss", 1400],
        ],
      },
      {
        aliquotaNominalBps: 1800,
        parcelaDeduzirCentavos: 450_000,
        reparticao: [
          ["irpj", 2300],
          ["csll", 1500],
          ["cofins", 1410],
          ["pis", 305],
          ["cpp", 2785],
          ["iss", 1700],
        ],
      },
      {
        aliquotaNominalBps: 1950,
        parcelaDeduzirCentavos: 990_000,
        reparticao: [
          ["irpj", 2400],
          ["csll", 1500],
          ["cofins", 1492],
          ["pis", 323],
          ["cpp", 2385],
          ["iss", 1900],
        ],
      },
      {
        aliquotaNominalBps: 2050,
        parcelaDeduzirCentavos: 1_710_000,
        reparticao: [
          ["irpj", 2100],
          ["csll", 1500],
          ["cofins", 1574],
          ["pis", 341],
          ["cpp", 2385],
          ["iss", 2100],
        ],
      },
      {
        aliquotaNominalBps: 2300,
        parcelaDeduzirCentavos: 6_210_000,
        reparticao: [
          ["irpj", 2300],
          ["csll", 1250],
          ["cofins", 1410],
          ["pis", 305],
          ["cpp", 2385],
          ["iss", 2350],
        ],
      },
    ],
  },
};

const rulesByAnoCalendario: Record<number, DasSimplesRules> = {
  2025: {
    faixasAteCentavos: [18_000_000, 36_000_000, 72_000_000, 180_000_000, 360_000_000],
    anexos: anexosLc155,
    sublimiteCentavos: 360_000_000,
    sublimiteMensalInicioAtividadeCentavos: 30_000_000,
    sublimiteSource: "LC 123/2006, arts. 3º, § 2º, e 13-A; Res. CGSN 140/2018, art. 24, § 1º",
    fatorRMinimoPercent: 28,
  },
  2026: {
    faixasAteCentavos: [18_000_000, 36_000_000, 72_000_000, 180_000_000, 360_000_000],
    anexos: anexosLc155,
    sublimiteCentavos: 360_000_000,
    sublimiteMensalInicioAtividadeCentavos: 30_000_000,
    sublimiteSource:
      "LC 123/2006, arts. 3º, § 2º, e 13-A; Res. CGSN 140/2018, art. 24, § 1º; Portaria CGSN 54/2025, art. 2º",
    fatorRMinimoPercent: 28,
  },
};

export function calculateDasSimples(
  facts: DasSimplesFacts,
  anoCalendario: number,
  month: number,
): CalculationResult {
  const rules: DasSimplesRules | undefined = rulesByAnoCalendario[anoCalendario];
  if (rules === undefined) {
    return unsupported(`Ainda não calculamos o DAS do Simples Nacional de ${anoCalendario}.`);
  }

  if (!hasCalendar(dueYearOf(anoCalendario, month))) {
    return unsupported("Ainda não temos o calendário bancário para calcular o vencimento.");
  }

  if (facts.regimeApuracao === "caixa") {
    return unsupported("Ainda não calculamos o DAS no regime de caixa.");
  }
  if (facts.receitas.some((receita) => receita.tratamento !== "normal")) {
    return unsupported(
      "Ainda não calculamos receitas de exportação, com substituição tributária, monofásicas ou com ISS retido.",
    );
  }

  const periodo = monthIndex(anoCalendario, month);
  const inicio = monthIndex(
    Number(facts.inicioAtividadeOn.slice(0, 4)),
    Number(facts.inicioAtividadeOn.slice(5, 7)),
  );
  if (periodo < inicio) {
    return unsupported("Este mês é anterior ao início de atividade da empresa.");
  }

  const meses = monthsBetween(Math.max(inicio, periodo - 12), periodo);
  const mesSemReceita = meses.find(
    (competencia) => facts.receitasAnteriores[competencia] === undefined,
  );
  if (mesSemReceita !== undefined) {
    return unsupported(`Falta a receita bruta de ${formatCompetencia(mesSemReceita)}.`);
  }
  const anteriores = meses.map((competencia) => facts.receitasAnteriores[competencia]);
  if (anteriores.some((receita) => receita.mercadoExternoCentavos > 0)) {
    return unsupported(
      "Ainda não calculamos o DAS de quem teve receita de exportação nos últimos 12 meses.",
    );
  }

  const receitaDoMesCentavos = sum(facts.receitas.map((receita) => receita.receitaBrutaCentavos));
  if (receitaDoMesCentavos === 0) {
    return unsupported(
      "Sem receita no mês, não há DAS a pagar. O PGDAS-D do mês ainda precisa ser entregue.",
    );
  }

  const rbt12 = rbt12Of(
    receitaDoMesCentavos,
    anteriores.map((receita) => receita.mercadoInternoCentavos),
  );
  const faixaIndex = rules.faixasAteCentavos.findIndex(
    (ateCentavos) => rbt12.centavos.numerator <= BigInt(ateCentavos) * rbt12.centavos.denominator,
  );
  if (faixaIndex === -1) {
    return unsupported("Ainda não calculamos o DAS com RBT12 acima de R$ 3.600.000,00.");
  }

  const receitaNoAnoCentavos =
    receitaDoMesCentavos +
    sum(
      meses
        .filter((competencia) => competencia.startsWith(`${anoCalendario}-`))
        .map((competencia) => facts.receitasAnteriores[competencia].mercadoInternoCentavos),
    );
  const isAnoDeInicio = Math.floor(inicio / 12) === anoCalendario;
  const sublimiteCentavos = isAnoDeInicio
    ? rules.sublimiteMensalInicioAtividadeCentavos * (periodo - inicio + 1)
    : rules.sublimiteCentavos;
  if (receitaNoAnoCentavos > sublimiteCentavos) {
    return unsupported(
      "Ainda não calculamos o DAS quando a receita do ano passa do sublimite do Simples Nacional.",
    );
  }

  const lines: Line[] = [
    { label: rbt12.label, amountCentavos: roundHalfUp(rbt12.centavos), source: rbt12.source },
  ];
  const receitaPorAnexo: Record<Anexo, number> = {
    anexoI: receitaDoMes(facts, "anexoI"),
    anexoII: receitaDoMes(facts, "anexoII"),
    anexoIII: receitaDoMes(facts, "anexoIII"),
    anexoIV: receitaDoMes(facts, "anexoIV"),
    anexoV: receitaDoMes(facts, "anexoV"),
  };

  const receitaFatorRDoMesCentavos = receitaDoMes(facts, "fatorR");
  if (receitaFatorRDoMesCentavos > 0) {
    const mesesFolha = meses.length === 0 ? [competenciaOf(periodo)] : meses;
    const mesSemFolha = mesesFolha.find(
      (competencia) => facts.folhasCentavos[competencia] === undefined,
    );
    if (mesSemFolha !== undefined) {
      return unsupported(`Falta a folha de salários de ${formatCompetencia(mesSemFolha)}.`);
    }

    const folhaCentavos = sum(mesesFolha.map((competencia) => facts.folhasCentavos[competencia]));
    const receitaFatorRCentavos =
      meses.length === 0
        ? receitaDoMesCentavos
        : sum(
            anteriores.map(
              (receita) => receita.mercadoInternoCentavos + receita.mercadoExternoCentavos,
            ),
          );
    const fatorR = fatorROf(folhaCentavos, receitaFatorRCentavos, meses.length === 0);
    const anexoFatorR: Anexo = fatorR.percent >= rules.fatorRMinimoPercent ? "anexoIII" : "anexoV";
    receitaPorAnexo[anexoFatorR] += receitaFatorRDoMesCentavos;
    lines.push(
      {
        label:
          meses.length === 0
            ? "Folha de salários do mês"
            : "Folha de salários dos meses anteriores (até 12)",
        amountCentavos: folhaCentavos,
        source: "LC 123/2006, art. 18, §§ 24 a 26; Res. CGSN 140/2018, art. 26, §§ 1º e 4º",
      },
      {
        label: `Receita bruta para o fator R: r = ${formatFatorR(fatorR.percent)}, serviços no ${rules.anexos[anexoFatorR].name}`,
        amountCentavos: receitaFatorRCentavos,
        source: fatorR.source,
      },
    );
  }

  const das = anexoOrder
    .filter((anexo) => receitaPorAnexo[anexo] > 0)
    .map((anexo) =>
      dasDoAnexo(rules.anexos[anexo], faixaIndex, rbt12.centavos, receitaPorAnexo[anexo]),
    );
  const amountCentavos = sum(das.map((anexo) => anexo.amountCentavos));
  if (amountCentavos < 1_000) {
    return unsupported(
      "O DAS do mês ficou abaixo de R$ 10,00 e passa para o mês seguinte. Ainda não fazemos essa soma.",
    );
  }

  return {
    status: "calculated",
    calculation: {
      amountCentavos,
      dueOn: dasDueOn(anoCalendario, month),
      dueOnSource: dasDueOnSourceFor(anoCalendario, month),
      lines: [...lines, ...das.flatMap((anexo) => anexo.lines)],
      ruleTable: { name: "dasSimples", anoCalendario },
    },
  };
}

function receitaDoMes(facts: DasSimplesFacts, atividade: Atividade) {
  return sum(
    facts.receitas
      .filter((receita) => receita.anexo === atividade)
      .map((receita) => receita.receitaBrutaCentavos),
  );
}

function rbt12Of(receitaDoMesCentavos: number, anterioresCentavos: number[]): Rbt12 {
  if (anterioresCentavos.length === 0) {
    return {
      centavos: { numerator: BigInt(receitaDoMesCentavos) * 12n, denominator: 1n },
      label: "RBT12: receita do mês × 12 (primeiro mês de atividade)",
      source: "LC 123/2006, art. 18, § 2º; Res. CGSN 140/2018, art. 22, § 2º",
    };
  }

  const totalCentavos = sum(anterioresCentavos);
  if (totalCentavos === 0) {
    return {
      centavos: { numerator: 100n, denominator: 1n },
      label: "RBT12: sem receita nos meses anteriores, considera R$ 1,00",
      source: "Res. CGSN 140/2018, art. 21, parágrafo único",
    };
  }

  if (anterioresCentavos.length < 12) {
    return {
      centavos: {
        numerator: BigInt(totalCentavos) * 12n,
        denominator: BigInt(anterioresCentavos.length),
      },
      label: "RBT12: média mensal desde o início de atividade × 12",
      source: "LC 123/2006, art. 18, § 2º; Res. CGSN 140/2018, art. 22, §§ 3º e 4º",
    };
  }

  return {
    centavos: { numerator: BigInt(totalCentavos), denominator: 1n },
    label: "RBT12: receita bruta dos 12 meses anteriores",
    source: "LC 123/2006, art. 18, § 1º; Res. CGSN 140/2018, art. 22, § 1º",
  };
}

function fatorROf(
  folhaCentavos: number,
  receitaCentavos: number,
  isInicioAtividade: boolean,
): FatorR {
  const paragrafo = isInicioAtividade ? "§ 6º" : "§ 7º";
  const source = `LC 123/2006, art. 18, §§ 5º-J, 5º-K e 5º-M; Res. CGSN 140/2018, art. 26, ${paragrafo}`;
  if (folhaCentavos === 0) return { percent: 1, source };
  if (receitaCentavos === 0) return { percent: 28, source };

  return {
    percent: Number((BigInt(folhaCentavos) * 100n) / BigInt(receitaCentavos)),
    source: `${source}; Manual do PGDAS-D, item 8.2.1 (duas casas sem arredondamento)`,
  };
}

function dasDoAnexo(
  anexo: AnexoRules,
  faixaIndex: number,
  rbt12Centavos: Fraction,
  receitaCentavos: number,
) {
  const faixa = anexo.faixas[faixaIndex];
  const aliquotaNominal = { numerator: BigInt(faixa.aliquotaNominalBps), denominator: 10_000n };
  const aliquotaEfetiva = {
    numerator:
      rbt12Centavos.numerator * BigInt(faixa.aliquotaNominalBps) -
      10_000n * BigInt(faixa.parcelaDeduzirCentavos) * rbt12Centavos.denominator,
    denominator: 10_000n * rbt12Centavos.numerator,
  };
  const tributos = tributosOf(faixa, aliquotaEfetiva, receitaCentavos, anexo.source);
  const amountCentavos = sum(tributos.map((tributo) => tributo.amountCentavos));
  const lines: Line[] = [
    {
      label: `Receita bruta do mês no ${anexo.name}`,
      amountCentavos: receitaCentavos,
      source: "Res. CGSN 140/2018, art. 25, § 1º",
    },
    {
      label: `${anexo.name}, ${faixaIndex + 1}ª faixa: alíquota nominal ${formatPercent(aliquotaNominal)} e parcela a deduzir`,
      amountCentavos: faixa.parcelaDeduzirCentavos,
      source: anexo.source,
    },
    ...tributos.map(({ tributo, amountCentavos, source }) => ({
      label: `${tributoNames[tributo]} do ${anexo.name}`,
      amountCentavos,
      source,
    })),
    {
      label: `DAS do ${anexo.name} com alíquota efetiva de ${formatPercent(aliquotaEfetiva)}`,
      amountCentavos,
      source:
        "LC 123/2006, art. 18, § 1º-A; Res. CGSN 140/2018, arts. 21, II, e 22; cada tributo arredondado ao centavo como nos exemplos do Manual do PGDAS-D, item 12",
    },
  ];

  return { amountCentavos, lines };
}

function tributosOf(
  faixa: Faixa,
  aliquotaEfetiva: Fraction,
  receitaCentavos: number,
  source: string,
): TributoAmount[] {
  const { tetoIss } = faixa;
  const receita = BigInt(receitaCentavos);
  if (tetoIss === undefined || !isGreater(aliquotaEfetiva, tetoIss.aliquotaEfetivaAcimaDe)) {
    return faixa.reparticao.map(([tributo, bps]) => ({
      tributo,
      amountCentavos: roundHalfUp({
        numerator: receita * aliquotaEfetiva.numerator * BigInt(bps),
        denominator: aliquotaEfetiva.denominator * 10_000n,
      }),
      source,
    }));
  }

  const aliquotaFederal = {
    numerator:
      aliquotaEfetiva.numerator * 10_000n - BigInt(tetoIss.issBps) * aliquotaEfetiva.denominator,
    denominator: aliquotaEfetiva.denominator * 10_000n,
  };
  const federais = tetoIss.reparticaoFederal.map(([tributo, bps]) => ({
    tributo,
    amountCentavos: roundHalfUp({
      numerator: receita * aliquotaFederal.numerator * BigInt(bps),
      denominator: aliquotaFederal.denominator * 10_000n,
    }),
    source: tetoIss.source,
  }));
  const iss: TributoAmount = {
    tributo: "iss",
    amountCentavos: roundHalfUp({
      numerator: receita * BigInt(tetoIss.issBps),
      denominator: 10_000n,
    }),
    source: tetoIss.source,
  };
  return [...federais, iss];
}

function isGreater(left: Fraction, right: Fraction) {
  return left.numerator * right.denominator > right.numerator * left.denominator;
}

function roundHalfUp({ numerator, denominator }: Fraction) {
  return Number((2n * numerator + denominator) / (2n * denominator));
}

function formatPercent({ numerator, denominator }: Fraction) {
  const hundredThousandthsOfPercent = BigInt(
    roundHalfUp({ numerator: numerator * 10_000_000n, denominator }),
  );
  const integer = hundredThousandthsOfPercent / 100_000n;
  const decimals = String(hundredThousandthsOfPercent % 100_000n)
    .padStart(5, "0")
    .replace(/0+$/, "")
    .padEnd(2, "0");
  return `${integer},${decimals}%`;
}

function formatFatorR(percent: number) {
  return `${Math.floor(percent / 100)},${String(percent % 100).padStart(2, "0")}`;
}

function monthIndex(year: number, month: number) {
  return year * 12 + month - 1;
}

function monthsBetween(fromIndex: number, toIndexExclusive: number) {
  return Array.from({ length: toIndexExclusive - fromIndex }, (_, offset) =>
    competenciaOf(fromIndex + offset),
  );
}

function competenciaOf(index: number) {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function formatCompetencia(competencia: string) {
  return `${competencia.slice(5, 7)}/${competencia.slice(0, 4)}`;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function unsupported(reason: string): CalculationResult {
  return { status: "unsupported", reason };
}
