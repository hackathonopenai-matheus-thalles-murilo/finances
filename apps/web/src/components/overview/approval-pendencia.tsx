import type { ObligationSummary, Pendencia } from "@my-better-t-app/backend/convex/overview";
import { Button } from "@my-better-t-app/ui/components/button";
import { Stamp } from "lucide-react";

import {
  daysUntil,
  formatDaysUntil,
  formatMoney,
  formatTimestampDayMonth,
  formatWeekdayDayMonth,
  monthName,
} from "@/lib/format";

import { PendenciaItem } from "./pendencia-item";

const guideName: Record<ObligationSummary["kind"], string> = {
  carneLeao: "o DARF do carnê-leão",
  dasMei: "o DAS do MEI",
  dirpf: "o DARF da DIRPF",
};

function approvalTitle({ kind, month }: ObligationSummary) {
  if (month === undefined) return `Pagar ${guideName[kind]}`;
  return `Pagar ${guideName[kind]} de ${monthName(month)}`;
}

export type ApprovalPendenciaProps = {
  pendencia: Extract<Pendencia, { type: "approval" }>;
};

export function ApprovalPendencia({ pendencia }: ApprovalPendenciaProps) {
  const { obligation, amountCentavos, dueOn, preparedAt } = pendencia;

  return (
    <PendenciaItem
      icon={Stamp}
      tone="default"
      tag="Aprovação"
      title={approvalTitle(obligation)}
      description={`Preparado pelo agente fiscal em ${formatTimestampDayMonth(preparedAt)}`}
      actions={
        <>
          <Button>Revisar e aprovar</Button>
          <Button variant="outline">Ver cálculo</Button>
        </>
      }
      aside={
        <>
          <p className="font-mono text-xl font-semibold whitespace-nowrap tabular-nums">
            {formatMoney(amountCentavos)}
          </p>
          {dueOn && (
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              vence <b className="font-semibold text-warning">{formatWeekdayDayMonth(dueOn)}</b> ·{" "}
              {formatDaysUntil(daysUntil(dueOn))}
            </p>
          )}
        </>
      }
    />
  );
}
