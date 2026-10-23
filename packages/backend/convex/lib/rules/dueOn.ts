import type { Doc } from "../../_generated/dataModel";
import {
  calendarSource,
  dayOfFollowingMonth,
  hasCalendar,
  lastDayOfFollowingMonth,
  nextPaymentDay,
  previousPaymentDay,
} from "./calendar";

const dasDueOnSource = "Resolução CGSN nº 140/2018, art. 40, caput e §3º";

const dirpfByAnoCalendario: Record<number, { dueOn: string; source: string }> = {
  2025: { dueOn: "2026-05-29", source: "IN RFB nº 2.312/2026, art. 7º" },
};

export function dueYearOf(anoCalendario: number, month: number) {
  return month === 12 ? anoCalendario + 1 : anoCalendario;
}

export function dasDueOn(anoCalendario: number, month: number) {
  return nextPaymentDay(dayOfFollowingMonth(anoCalendario, month, 20));
}

export function dasDueOnSourceFor(anoCalendario: number, month: number) {
  return `${dasDueOnSource}; ${calendarSource(dueYearOf(anoCalendario, month))}`;
}

export function carneLeaoDueOn(anoCalendario: number, month: number) {
  return previousPaymentDay(lastDayOfFollowingMonth(anoCalendario, month));
}

export function dirpfDeadline(anoCalendario: number) {
  const dirpf = dirpfByAnoCalendario[anoCalendario];
  if (dirpf === undefined) {
    return { text: "A Receita ainda não publicou o prazo.", source: "" };
  }
  const [year, month, day] = dirpf.dueOn.split("-");
  return { text: `Até ${day}/${month}/${year}, às 23h59 de Brasília.`, source: dirpf.source };
}

export function dueOnFor(
  kind: Doc<"obligations">["kind"],
  anoCalendario: number,
  month: number | undefined,
) {
  if (kind === "dirpf") return dirpfByAnoCalendario[anoCalendario]?.dueOn;
  if (month === undefined) return undefined;
  if (!hasCalendar(dueYearOf(anoCalendario, month))) return undefined;
  if (kind === "carneLeao") return carneLeaoDueOn(anoCalendario, month);
  return dasDueOn(anoCalendario, month);
}
