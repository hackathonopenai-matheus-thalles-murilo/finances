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
import { Link } from "@tanstack/react-router";

import { formatDayMonth, formatMoney } from "@/lib/format";
import { obligationLabel, obligationStatus } from "@/lib/obligation";

export type ObligationListProps = {
  obligations: ObligationRow[];
};

export function ObligationList({ obligations }: ObligationListProps) {
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
