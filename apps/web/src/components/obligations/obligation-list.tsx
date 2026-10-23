import type { ObligationRow } from "@my-better-t-app/backend/convex/obligations";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { Card } from "@my-better-t-app/ui/components/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { CalendarCheck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { formatDayMonth, formatMoney } from "@/lib/format";
import { obligationLabel } from "@/lib/obligation";

const obligationStatus: Record<
  ObligationRow["status"],
  { label: string; variant: "default" | "success" | "warning" | "secondary" }
> = {
  upcoming: { label: "Em breve", variant: "secondary" },
  needsUser: { label: "Precisa de você", variant: "warning" },
  awaitingApproval: { label: "Aguardando aprovação", variant: "default" },
  scheduled: { label: "Agendado", variant: "success" },
  paid: { label: "Pago", variant: "success" },
};

export type ObligationListProps = {
  obligations: ObligationRow[];
  anoCalendario: number;
};

export function ObligationList({ anoCalendario, obligations }: ObligationListProps) {
  if (obligations.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Nenhuma obrigação"
        description={`Não encontramos obrigações no ano-calendário ${anoCalendario}.`}
      />
    );
  }

  return (
    <Card size="flush">
      {obligations.map(({ obligationId, obligation, dueOn, amountCentavos, status }) => (
        <Item key={obligationId} size="sm">
          <ItemContent>
            <ItemTitle>{obligationLabel(obligation)}</ItemTitle>
            <ItemDescription>
              {dueOn ? `Vence em ${formatDayMonth(dueOn)}` : "Prazo ainda não publicado"}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            {amountCentavos !== undefined && (
              <span className="font-mono tabular-nums">{formatMoney(amountCentavos)}</span>
            )}
            <Badge variant={obligationStatus[status].variant}>
              {obligationStatus[status].label}
            </Badge>
          </ItemActions>
        </Item>
      ))}
    </Card>
  );
}
