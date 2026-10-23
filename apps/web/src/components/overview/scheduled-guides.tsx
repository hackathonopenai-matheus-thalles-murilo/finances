import type { ScheduledGuide } from "@my-better-t-app/backend/convex/overview";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";

import { formatDayMonth, formatMoney, formatTimestampDayMonth } from "@/lib/format";
import { obligationLabel } from "@/lib/obligation";

import { OverviewSection } from "./overview-section";

export type ScheduledGuidesProps = {
  guides: ScheduledGuide[];
};

export function ScheduledGuides({ guides }: ScheduledGuidesProps) {
  return (
    <OverviewSection title="Agendado">
      {guides.map((guide) => (
        <Item key={guide.guideId} size="sm">
          <ItemContent>
            <ItemTitle>{obligationLabel(guide.obligation)}</ItemTitle>
            <ItemDescription>
              Débito em {formatDayMonth(guide.debitOn)} · aprovado em{" "}
              {formatTimestampDayMonth(guide.approvedAt)}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <span className="font-mono tabular-nums">{formatMoney(guide.amountCentavos)}</span>
            <Button variant="destructive">Cancelar agendamento</Button>
          </ItemActions>
        </Item>
      ))}
    </OverviewSection>
  );
}
