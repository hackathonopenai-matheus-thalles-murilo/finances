import { v, type Infer } from "convex/values";

import { formatBrl } from "../money";
import { hasCalendar } from "./calendar";
import type { CalculationResult } from "./calculation";
import { dasDueOn, dasDueOnSourceFor, dueYearOf } from "./dueOn";

export const dasMeiFacts = v.object({
  kind: v.literal("dasMei"),
  activity: v.union(
    v.literal("comercioIndustria"),
    v.literal("servicos"),
    v.literal("comercioIndustriaServicos"),
  ),
});

export type DasMeiFacts = Infer<typeof dasMeiFacts>;

type DasMeiTable = {
  salarioMinimoCentavos: number;
  salarioMinimoSource: string;
};

const dasMeiByAnoCalendario: Record<number, DasMeiTable> = {
  2025: {
    salarioMinimoCentavos: 151800,
    salarioMinimoSource: "Decreto nº 12.342, de 30 de dezembro de 2024",
  },
  2026: {
    salarioMinimoCentavos: 162100,
    salarioMinimoSource: "Decreto nº 12.797, de 23 de dezembro de 2025",
  },
};

const INSS_PERCENT = 5;
const ICMS_CENTAVOS = 100;
const ISS_CENTAVOS = 500;

const inssSource = "LC 123/2006, art. 18-A, §3º, IV; Lei 8.212/1991, art. 21, §2º, II, a";
const icmsSource = "LC 123/2006, art. 18-A, §3º, V, b";
const issSource = "LC 123/2006, art. 18-A, §3º, V, c";

const taxesByActivity: Record<DasMeiFacts["activity"], { icms: boolean; iss: boolean }> = {
  comercioIndustria: { icms: true, iss: false },
  servicos: { icms: false, iss: true },
  comercioIndustriaServicos: { icms: true, iss: true },
};

export function calculateDasMei(
  facts: DasMeiFacts,
  anoCalendario: number,
  month: number,
): CalculationResult {
  const table = dasMeiByAnoCalendario[anoCalendario];
  if (table === undefined) {
    return {
      status: "unsupported",
      reason: `Ainda não temos a tabela do DAS do MEI para ${anoCalendario}.`,
    };
  }
  const dueYear = dueYearOf(anoCalendario, month);
  if (!hasCalendar(dueYear)) {
    return {
      status: "unsupported",
      reason: `Ainda não temos o calendário bancário de ${dueYear}.`,
    };
  }

  const inssCentavos = (table.salarioMinimoCentavos * INSS_PERCENT) / 100;
  if (!Number.isInteger(inssCentavos)) {
    throw new Error(`INSS of the DAS-MEI ${anoCalendario} is not a whole number of centavos`);
  }

  const { icms, iss } = taxesByActivity[facts.activity];
  const lines = [
    {
      label: `INSS: ${INSS_PERCENT}% do salário mínimo de ${formatBrl(table.salarioMinimoCentavos)}`,
      amountCentavos: inssCentavos,
      source: `${inssSource}; ${table.salarioMinimoSource}`,
    },
    ...(icms ? [{ label: "ICMS", amountCentavos: ICMS_CENTAVOS, source: icmsSource }] : []),
    ...(iss ? [{ label: "ISS", amountCentavos: ISS_CENTAVOS, source: issSource }] : []),
  ];

  return {
    status: "calculated",
    calculation: {
      amountCentavos: lines.reduce((total, line) => total + line.amountCentavos, 0),
      dueOn: dasDueOn(anoCalendario, month),
      dueOnSource: dasDueOnSourceFor(anoCalendario, month),
      lines,
      ruleTable: { name: "dasMei", anoCalendario },
    },
  };
}
