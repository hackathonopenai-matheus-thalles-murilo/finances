import type { DueObligation } from "@my-better-t-app/backend/convex/overview";
import { Badge } from "@my-better-t-app/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";

import { formatDay, formatShortMonth } from "@/lib/format";
import { obligationShortLabel } from "@/lib/obligation";

import { OverviewSection } from "./overview-section";

const dueStatus: Record<
  DueObligation["status"],
  { label: string; variant: "default" | "success" | "warning" | "secondary" }
> = {
  awaitingApproval: { label: "Aprovar", variant: "default" },
  scheduled: { label: "Ok", variant: "success" },
  needsUser: { label: "Parado", variant: "warning" },
  upcoming: { label: "Depois", variant: "secondary" },
};

export type DueObligationsProps = {
  obligations: DueObligation[];
};

export function DueObligations({ obligations }: DueObligationsProps) {
  return (
    <OverviewSection title="Próximos vencimentos">
      {obligations.map(({ obligationId, obligation, dueOn, status }) => (
        <Item key={obligationId} size="sm">
          <ItemMedia>
            <span className="w-13 rounded-lg border py-1 text-center leading-tight">
              <b className="block font-mono text-base font-semibold">
                {dueOn ? formatDay(dueOn) : "—"}
              </b>
              <span className="text-[10.5px] tracking-wide text-muted-foreground uppercase">
                {dueOn ? formatShortMonth(dueOn) : obligation.anoCalendario + 1}
              </span>
            </span>
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{obligationShortLabel(obligation)}</ItemTitle>
            {!dueOn && <ItemDescription>Prazo ainda não publicado</ItemDescription>}
          </ItemContent>
          <ItemActions>
            <Badge variant={dueStatus[status].variant}>{dueStatus[status].label}</Badge>
          </ItemActions>
        </Item>
      ))}
    </OverviewSection>
  );
}
