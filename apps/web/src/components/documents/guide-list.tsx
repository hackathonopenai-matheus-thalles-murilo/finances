import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { GuideRow } from "@my-better-t-app/backend/convex/guides";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { Card } from "@my-better-t-app/ui/components/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { useQuery } from "convex/react";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import Loader from "@/components/loader";
import { formatDayMonth, formatMoney, formatTimestampDayMonth } from "@/lib/format";
import { guideType, obligationLabel } from "@/lib/obligation";

const guideStatus: Record<GuideRow["status"], { label: string; variant: "default" | "success" }> = {
  awaitingApproval: { label: "Aguardando aprovação", variant: "default" },
  scheduled: { label: "Agendado", variant: "success" },
  paid: { label: "Pago", variant: "success" },
};

function guideDescription(guide: GuideRow) {
  if (guide.status === "scheduled") return `Débito em ${formatDayMonth(guide.debitOn)}`;
  if (guide.status === "paid") return `Pago em ${formatDayMonth(guide.paidOn)}`;
  return `Preparado em ${formatTimestampDayMonth(guide.preparedAt)}`;
}

export function GuideList() {
  const guides = useQuery(api.guides.list);

  if (guides === undefined) return <Loader />;

  if (guides.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nenhum documento"
        description="As guias que os agentes fiscais prepararem para você aparecem aqui."
      />
    );
  }

  return (
    <Card size="flush">
      {guides.map((guide) => (
        <Item key={guide.guideId} size="sm">
          <ItemContent>
            <ItemTitle>
              {guideType[guide.obligation.kind]} · {obligationLabel(guide.obligation)}
            </ItemTitle>
            <ItemDescription>{guideDescription(guide)}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <span className="font-mono tabular-nums">{formatMoney(guide.amountCentavos)}</span>
            <Badge variant={guideStatus[guide.status].variant}>
              {guideStatus[guide.status].label}
            </Badge>
          </ItemActions>
        </Item>
      ))}
    </Card>
  );
}
