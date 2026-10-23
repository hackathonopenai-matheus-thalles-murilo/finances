import { v, type Infer } from "convex/values";

import { formatBrl } from "../money";
import { calendarSource, hasCalendar, previousPaymentDay } from "./calendar";
import type { CalculationResult } from "./calculation";
import { carneLeaoDueOn, dueYearOf } from "./dueOn";

export const carneLeaoFacts = v.object({
  kind: v.literal("carneLeao"),
  receipts: v.array(
    v.object({
      receivedOn: v.string(),
      amountUsdCents: v.number(),
      ptaxOn: v.string(),
      ptaxCompraTenThousandths: v.number(),
    }),
  ),
  dependentes: v.number(),
  previdenciaOficialCentavos: v.number(),
  pensaoAlimenticiaCentavos: v.number(),
});

export type CarneLeaoFacts = Infer<typeof carneLeaoFacts>;

type Bracket = {
  upToCentavos: number;
  ratePerMille: number;
  parcelaCentavos: number;
};

type TablePeriod = {
  untilMonth: number;
  brackets: Bracket[];
  source: string;
};

type CarneLeaoTable = {
  periods: TablePeriod[];
  dependenteCentavos: number;
  reduction: { noReductionAboveCentavos: number; source: string } | undefined;
};

const bracketsFromMay2025: TablePeriod = {
  untilMonth: 12,
  brackets: [
    { upToCentavos: 242880, ratePerMille: 0, parcelaCentavos: 0 },
    { upToCentavos: 282665, ratePerMille: 75, parcelaCentavos: 18216 },
    { upToCentavos: 375105, ratePerMille: 150, parcelaCentavos: 39416 },
    { upToCentavos: 466468, ratePerMille: 225, parcelaCentavos: 67549 },
    { upToCentavos: Number.POSITIVE_INFINITY, ratePerMille: 275, parcelaCentavos: 90873 },
  ],
  source: "Lei 11.482/2007, art. 1º, XII, na redação da Lei 15.191/2025",
};

const carneLeaoByAnoCalendario: Record<number, CarneLeaoTable> = {
  2025: {
    periods: [
      {
        untilMonth: 4,
        brackets: [
          { upToCentavos: 225920, ratePerMille: 0, parcelaCentavos: 0 },
          { upToCentavos: 282665, ratePerMille: 75, parcelaCentavos: 16944 },
          { upToCentavos: 375105, ratePerMille: 150, parcelaCentavos: 38144 },
          { upToCentavos: 466468, ratePerMille: 225, parcelaCentavos: 66277 },
          { upToCentavos: Number.POSITIVE_INFINITY, ratePerMille: 275, parcelaCentavos: 89600 },
        ],
        source: "Lei 11.482/2007, art. 1º, XI, na redação da Lei 15.191/2025",
      },
      bracketsFromMay2025,
    ],
    dependenteCentavos: 18959,
    reduction: undefined,
  },
  2026: {
    periods: [bracketsFromMay2025],
    dependenteCentavos: 18959,
    reduction: {
      noReductionAboveCentavos: 735000,
      source:
        "Lei 9.250/1995, art. 3º-A, §2º, incluído pela Lei 15.270/2025; IN RFB 1.500/2014, art. 65-A, §2º",
    },
  },
};

const DESCONTO_SIMPLIFICADO_PERCENT = 25;
const DARF_MINIMUM_CENTAVOS = 1000;

const conversionSource = "Lei 9.250/1995, art. 6º; RIR/2018, art. 119";
const incomeSource = "Lei 7.713/1988, art. 8º; RIR/2018, art. 118";
const descontoSimplificadoSource = "Lei 9.250/1995, art. 4º, §2º";
const dependentesSource = "Lei 9.250/1995, art. 4º, III, i; RIR/2018, art. 71";
const previdenciaSource = "Lei 9.250/1995, art. 4º, IV; RIR/2018, art. 67, I";
const pensaoSource = "Lei 9.250/1995, art. 4º, II; RIR/2018, art. 72";
const legalDeductionsSource = "Lei 9.250/1995, art. 4º, caput e §2º; RIR/2018, art. 121";
const baseSource = "RIR/2018, art. 121";
const dueOnSource = "RIR/2018, art. 123; Lei 8.383/1991, art. 6º";

export function calculateCarneLeao(
  facts: CarneLeaoFacts,
  anoCalendario: number,
  month: number,
): CalculationResult {
  const table = carneLeaoByAnoCalendario[anoCalendario];
  if (table === undefined) {
    return {
      status: "unsupported",
      reason: `Ainda não temos a tabela do carnê-leão para ${anoCalendario}.`,
    };
  }
  const dueYear = dueYearOf(anoCalendario, month);
  if (!hasCalendar(dueYear)) {
    return {
      status: "unsupported",
      reason: `Ainda não temos o calendário bancário de ${dueYear}.`,
    };
  }
  const fifteenthOfPreviousMonth = new Date(Date.UTC(anoCalendario, month - 2, 15))
    .toISOString()
    .slice(0, 10);
  const ptaxYear = Number(fifteenthOfPreviousMonth.slice(0, 4));
  if (!hasCalendar(ptaxYear)) {
    return {
      status: "unsupported",
      reason: `Ainda não temos o calendário bancário de ${ptaxYear} para conferir a data da PTAX.`,
    };
  }

  const monthMM = String(month).padStart(2, "0");
  const outsideMonth = facts.receipts.find(
    (receipt) => !receipt.receivedOn.startsWith(`${anoCalendario}-${monthMM}-`),
  );
  if (outsideMonth !== undefined) {
    return {
      status: "unsupported",
      reason: `O recebimento de ${formatDate(outsideMonth.receivedOn)} não é de ${monthMM}/${anoCalendario}.`,
    };
  }
  const requiredPtaxOn = previousPaymentDay(fifteenthOfPreviousMonth);
  const wrongPtax = facts.receipts.find((receipt) => receipt.ptaxOn !== requiredPtaxOn);
  if (wrongPtax !== undefined) {
    return {
      status: "unsupported",
      reason: `O recebimento de ${formatDate(wrongPtax.receivedOn)} usa a PTAX de ${formatDate(wrongPtax.ptaxOn)}, mas a regra pede a PTAX de compra de ${formatDate(requiredPtaxOn)}, último dia útil da primeira quinzena do mês anterior.`,
    };
  }

  const period = table.periods.find((candidate) => month <= candidate.untilMonth);
  if (period === undefined) {
    throw new Error(`No carnê-leão table for ${month}/${anoCalendario}`);
  }

  const receiptLines = facts.receipts.map((receipt) => ({
    label: `Recebido em ${formatDate(receipt.receivedOn)}: ${formatUsd(receipt.amountUsdCents)} × PTAX de compra ${formatPtax(receipt.ptaxCompraTenThousandths)} de ${formatDate(receipt.ptaxOn)}`,
    amountCentavos: multiplyRoundingHalfUp(
      receipt.amountUsdCents,
      receipt.ptaxCompraTenThousandths,
      10_000,
    ),
    source: conversionSource,
  }));
  const incomeCentavos = sumOf(receiptLines);

  const legalDeductionLines = [
    {
      label: `Dependentes: ${facts.dependentes} × ${formatBrl(table.dependenteCentavos)}`,
      amountCentavos: facts.dependentes * table.dependenteCentavos,
      source: dependentesSource,
    },
    {
      label: "Previdência oficial",
      amountCentavos: facts.previdenciaOficialCentavos,
      source: previdenciaSource,
    },
    {
      label: "Pensão alimentícia",
      amountCentavos: facts.pensaoAlimenticiaCentavos,
      source: pensaoSource,
    },
  ].filter((line) => line.amountCentavos > 0);
  const legalDeductionsCentavos = sumOf(legalDeductionLines);

  const [zeroBracket] = period.brackets;
  const descontoSimplificadoCentavos =
    (zeroBracket.upToCentavos * DESCONTO_SIMPLIFICADO_PERCENT) / 100;
  if (!Number.isInteger(descontoSimplificadoCentavos)) {
    throw new Error(`Desconto simplificado of ${month}/${anoCalendario} is not whole centavos`);
  }

  const isLegalDeductionsLarger = legalDeductionsCentavos > descontoSimplificadoCentavos;
  const deductionLines = isLegalDeductionsLarger
    ? [
        ...legalDeductionLines,
        {
          label: `Deduções legais, no lugar do desconto simplificado de ${formatBrl(descontoSimplificadoCentavos)}`,
          amountCentavos: legalDeductionsCentavos,
          source: legalDeductionsSource,
        },
      ]
    : [
        {
          label: `Desconto simplificado (${DESCONTO_SIMPLIFICADO_PERCENT}% de ${formatBrl(zeroBracket.upToCentavos)}), no lugar das deduções legais de ${formatBrl(legalDeductionsCentavos)}`,
          amountCentavos: descontoSimplificadoCentavos,
          source: `${descontoSimplificadoSource}; ${period.source}`,
        },
      ];
  const deductionCentavos = Math.max(legalDeductionsCentavos, descontoSimplificadoCentavos);

  const baseCentavos = Math.max(0, incomeCentavos - deductionCentavos);
  const bracket = period.brackets.find((candidate) => baseCentavos <= candidate.upToCentavos);
  if (bracket === undefined) {
    throw new Error(`No carnê-leão bracket for a base of ${baseCentavos} centavos`);
  }
  const taxCentavos =
    multiplyRoundingHalfUp(baseCentavos, bracket.ratePerMille, 1000) - bracket.parcelaCentavos;

  if (taxCentavos === 0) {
    return { status: "unsupported", reason: "Não há imposto a pagar neste mês." };
  }
  const { reduction } = table;
  if (reduction !== undefined && incomeCentavos <= reduction.noReductionAboveCentavos) {
    return {
      status: "unsupported",
      reason: `Ainda estamos confirmando como a redução da Lei 15.270/2025 se aplica ao carnê-leão para rendimentos de até ${formatBrl(reduction.noReductionAboveCentavos)} no mês. Por enquanto, não calculamos este mês.`,
    };
  }
  if (taxCentavos < DARF_MINIMUM_CENTAVOS) {
    return {
      status: "unsupported",
      reason: `O imposto deste mês é de ${formatBrl(taxCentavos)}, abaixo do mínimo de ${formatBrl(DARF_MINIMUM_CENTAVOS)} para um DARF. Ele se soma ao imposto do mês seguinte (Lei 9.430/1996, art. 68, §1º).`,
    };
  }

  const reductionLines =
    reduction === undefined
      ? []
      : [
          {
            label: `Sem redução da Lei 15.270/2025: rendimentos acima de ${formatBrl(reduction.noReductionAboveCentavos)}`,
            amountCentavos: 0,
            source: reduction.source,
          },
        ];

  return {
    status: "calculated",
    calculation: {
      amountCentavos: taxCentavos,
      dueOn: carneLeaoDueOn(anoCalendario, month),
      dueOnSource: `${dueOnSource}; ${calendarSource(dueYear)}`,
      lines: [
        ...receiptLines,
        { label: "Rendimentos do mês", amountCentavos: incomeCentavos, source: incomeSource },
        ...deductionLines,
        { label: "Base de cálculo", amountCentavos: baseCentavos, source: baseSource },
        {
          label: `Imposto: ${formatRate(bracket.ratePerMille)}% da base menos ${formatBrl(bracket.parcelaCentavos)} de parcela a deduzir`,
          amountCentavos: taxCentavos,
          source: period.source,
        },
        ...reductionLines,
      ],
      ruleTable: { name: "carneLeao", anoCalendario },
    },
  };
}

function multiplyRoundingHalfUp(amount: number, numerator: number, denominator: number) {
  const doubled = 2n * BigInt(amount) * BigInt(numerator) + BigInt(denominator);
  return Number(doubled / (2n * BigInt(denominator)));
}

function sumOf(lines: { amountCentavos: number }[]) {
  return lines.reduce((total, line) => total + line.amountCentavos, 0);
}

function formatDate(dateYYYYMMDD: string) {
  return dateYYYYMMDD.split("-").reverse().join("/");
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatPtax(tenThousandths: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4 }).format(
    tenThousandths / 10_000,
  );
}

function formatRate(ratePerMille: number) {
  return new Intl.NumberFormat("pt-BR").format(ratePerMille / 10);
}
