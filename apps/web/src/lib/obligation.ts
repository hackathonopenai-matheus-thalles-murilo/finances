import type { ObligationRow } from "@my-better-t-app/backend/convex/obligations";
import type { ObligationSummary } from "@my-better-t-app/backend/convex/overview";

import { monthName, shortMonthName } from "./format";

const obligationName: Record<ObligationSummary["kind"], string> = {
  carneLeao: "Carnê-leão",
  dasMei: "DAS do MEI",
  dasSimples: "DAS do Simples Nacional",
  dirpf: "DIRPF",
};

export const guideType: Record<ObligationSummary["kind"], string> = {
  carneLeao: "DARF",
  dasMei: "DAS",
  dasSimples: "DAS",
  dirpf: "DARF",
};

export const obligationStatus: Record<
  ObligationRow["status"],
  { label: string; variant: "default" | "success" | "warning" | "secondary" }
> = {
  upcoming: { label: "Em breve", variant: "secondary" },
  preparing: { label: "Preparando", variant: "secondary" },
  needsUser: { label: "Precisa de você", variant: "warning" },
  doneByUser: { label: "Feito por você", variant: "success" },
  awaitingApproval: { label: "Aguardando aprovação", variant: "default" },
  scheduled: { label: "Agendado", variant: "success" },
  paid: { label: "Pago", variant: "success" },
};

export function obligationLabel({ kind, anoCalendario, month }: ObligationSummary) {
  if (month === undefined) return `${obligationName[kind]} ${anoCalendario + 1}`;
  return `${obligationName[kind]} · ${monthName(month)}/${anoCalendario}`;
}

export function obligationShortLabel({ kind, anoCalendario, month }: ObligationSummary) {
  if (month === undefined) return `${obligationName[kind]} ${anoCalendario + 1}`;
  return `${obligationName[kind]} · ${shortMonthName(month)}/${anoCalendario}`;
}
