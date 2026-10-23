import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { ObligationDetail } from "@my-better-t-app/backend/convex/obligations";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { useMutation } from "convex/react";
import { useTransition } from "react";
import { toast } from "sonner";

import { formatDayMonth, formatMoney } from "@/lib/format";

export type ScheduledGuideProps = {
  guide: Extract<NonNullable<ObligationDetail["guide"]>, { status: "scheduled" }>;
};

export function ScheduledGuide({ guide }: ScheduledGuideProps) {
  const revoke = useMutation(api.guides.revoke);
  const [isPending, startTransition] = useTransition();
  const { guideId, debitOn, amountCentavos } = guide;

  function handleRevoke() {
    startTransition(async () => {
      await revoke({ guideId }).catch(() =>
        toast.error("Não conseguimos cancelar o agendamento. Tente de novo."),
      );
    });
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Pagamento agendado para {formatDayMonth(debitOn)}</ItemTitle>
        <ItemDescription>{formatMoney(amountCentavos)}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="destructive" disabled={isPending} onClick={handleRevoke}>
          Cancelar agendamento
        </Button>
      </ItemActions>
    </Item>
  );
}
