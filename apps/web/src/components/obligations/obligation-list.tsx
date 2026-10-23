import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { Card } from "@my-better-t-app/ui/components/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { CalendarCheck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import Loader from "@/components/loader";
import { formatDayMonth, formatMoney } from "@/lib/format";
import { obligationLabel, obligationStatus } from "@/lib/obligation";

export type ObligationListProps = {
  anoCalendario: number;
};

export function ObligationList({ anoCalendario }: ObligationListProps) {
  const obligations = useQuery(api.obligations.list, { anoCalendario });

  if (obligations === undefined) return <Loader />;

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
        <Item
          key={obligationId}
          size="sm"
          render={<Link to="/obligations/$obligationId" params={{ obligationId }} />}
        >
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
