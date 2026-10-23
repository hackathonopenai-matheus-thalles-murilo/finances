import type { DoneObligation } from "@my-better-t-app/backend/convex/overview";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { Link } from "@tanstack/react-router";

import { formatDayMonth, formatMoney } from "@/lib/format";
import { obligationLabel } from "@/lib/obligation";

import { OverviewSection } from "./overview-section";

const doneLabel: Record<DoneObligation["status"], string> = {
  paid: "Pago em",
  doneByUser: "Feito por você em",
};

export type RecentlyDoneProps = {
  obligations: DoneObligation[];
};

export function RecentlyDone({ obligations }: RecentlyDoneProps) {
  return (
    <OverviewSection title="Feito recentemente">
      {obligations.map((done) => (
        <Item
          key={done.obligationId}
          size="sm"
          render={
            <Link to="/obligations/$obligationId" params={{ obligationId: done.obligationId }} />
          }
        >
          <ItemContent>
            <ItemTitle>{obligationLabel(done.obligation)}</ItemTitle>
            <ItemDescription>
              {doneLabel[done.status]} {formatDayMonth(done.doneOn)}
            </ItemDescription>
          </ItemContent>
          {done.status === "paid" && (
            <ItemActions>
              <span className="font-mono tabular-nums">{formatMoney(done.amountCentavos)}</span>
            </ItemActions>
          )}
        </Item>
      ))}
    </OverviewSection>
  );
}
