import type { ObligationSummary } from "@my-better-t-app/backend/convex/overview";

import { monthName, shortMonthName } from "./format";

const obligationName: Record<ObligationSummary["kind"], string> = {
  carneLeao: "Carnê-leão",
  dasMei: "DAS do MEI",
  dirpf: "DIRPF",
};

export function obligationLabel({ kind, anoCalendario, month }: ObligationSummary) {
  if (month === undefined) return `${obligationName[kind]} ${anoCalendario + 1}`;
  return `${obligationName[kind]} · ${monthName(month)}/${anoCalendario}`;
}

export function obligationShortLabel({ kind, anoCalendario, month }: ObligationSummary) {
  if (month === undefined) return `${obligationName[kind]} ${anoCalendario + 1}`;
  return `${obligationName[kind]} · ${shortMonthName(month)}/${anoCalendario}`;
}
