import type { Pendencia } from "@my-better-t-app/backend/convex/overview";
import { Button } from "@my-better-t-app/ui/components/button";
import { Link2Off } from "lucide-react";

import { daysUntil, formatDayMonth, formatWeekdayDayMonth } from "@/lib/format";

import { PendenciaItem } from "./pendencia-item";

export type ConnectionPendenciaProps = {
  pendencia: Extract<Pendencia, { type: "connection" }>;
};

export function ConnectionPendencia({ pendencia }: ConnectionPendenciaProps) {
  const { institution, status, expiresOn } = pendencia;
  const action = <Button variant="outline">Renovar conexão</Button>;

  if (status === "expired") {
    return (
      <PendenciaItem
        icon={Link2Off}
        tone="destructive"
        tag="Conexão"
        title={`Sua conexão com ${institution} expirou`}
        description="Seus relatórios estão desatualizados até você renovar."
        actions={action}
        aside={
          <p className="text-[12.5px] text-muted-foreground">
            expirou em {formatDayMonth(expiresOn)}
          </p>
        }
      />
    );
  }

  return (
    <PendenciaItem
      icon={Link2Off}
      tone="destructive"
      tag="Conexão"
      title={`Sua conexão com ${institution} expira em ${daysUntil(expiresOn)} dias`}
      description="Depois disso, seus relatórios ficam desatualizados."
      actions={action}
      aside={
        <p className="text-[12.5px] text-muted-foreground">
          expira{" "}
          <b className="font-semibold text-destructive">{formatWeekdayDayMonth(expiresOn)}</b>
        </p>
      }
    />
  );
}
