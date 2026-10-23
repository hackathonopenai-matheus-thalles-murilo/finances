import type { Doc } from "../../_generated/dataModel";
import type { CalculationResult } from "./calculation";
import { calculateCarneLeao } from "./carneLeao";
import { calculateDasMei } from "./dasMei";
import { calculateDasSimples } from "./dasSimples";

export function calculate(obligation: Doc<"obligations">): CalculationResult {
  const { kind, facts, anoCalendario, month } = obligation;
  if (kind === "dirpf") {
    return {
      status: "unsupported",
      reason: "Ainda não calculamos a DIRPF. Siga o passo a passo para declarar por conta própria.",
    };
  }
  if (facts === undefined) {
    return {
      status: "unsupported",
      reason: "Ainda faltam informações para calcular esta obrigação.",
    };
  }
  if (facts.kind !== kind) {
    throw new Error(`Obligation ${obligation._id} is ${kind} but has ${facts.kind} facts`);
  }
  if (month === undefined) {
    throw new Error(`Obligation ${obligation._id} is ${kind} without a month`);
  }
  if (facts.kind === "dasMei") return calculateDasMei(facts, anoCalendario, month);
  if (facts.kind === "dasSimples") return calculateDasSimples(facts, anoCalendario, month);
  return calculateCarneLeao(facts, anoCalendario, month);
}
