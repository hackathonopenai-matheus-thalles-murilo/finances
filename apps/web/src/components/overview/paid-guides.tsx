import type { PaidGuide } from "@my-better-t-app/backend/convex/overview";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";

import { formatDayMonth, formatMoney } from "@/lib/format";
import { obligationLabel } from "@/lib/obligation";

import { OverviewSection } from "./overview-section";

export type PaidGuidesProps = {
  guides: PaidGuide[];
};

export function PaidGuides({ guides }: PaidGuidesProps) {
  return (
    <OverviewSection title="Feito recentemente">
      {guides.map((guide) => (
        <Item key={guide.guideId} size="sm">
          <ItemContent>
            <ItemTitle>{obligationLabel(guide.obligation)}</ItemTitle>
            <ItemDescription>Pago em {formatDayMonth(guide.paidOn)}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <span className="font-mono tabular-nums">{formatMoney(guide.amountCentavos)}</span>
            <Button variant="link">Comprovante</Button>
          </ItemActions>
        </Item>
      ))}
    </OverviewSection>
  );
}
