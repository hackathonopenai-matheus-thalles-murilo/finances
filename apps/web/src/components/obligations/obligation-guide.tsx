import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { ObligationDetail } from "@my-better-t-app/backend/convex/obligations";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { formatDayMonth } from "@/lib/format";
import { guideType } from "@/lib/obligation";

import { GuideApproval } from "./guide-approval";
import { ScheduledGuide } from "./scheduled-guide";

export type ObligationGuideProps = {
  detail: ObligationDetail;
};

export function ObligationGuide({ detail }: ObligationGuideProps) {
  const prepare = useMutation(api.guides.prepare);
  const [isPending, startTransition] = useTransition();
  const { obligationId, obligation, state, guide, calculation } = detail;
  const canPrepare = obligation.kind !== "dirpf" && calculation.status === "calculated";

  function handlePrepare() {
    startTransition(async () => {
      await prepare({ obligationId }).catch(() =>
        toast.error("Não conseguimos pedir a guia à Receita. Tente de novo."),
      );
    });
  }

  if (!canPrepare) return null;

  if (guide?.status === "awaitingApproval") {
    return <GuideApproval guide={guide} guideType={guideType[obligation.kind]} />;
  }

  if (guide?.status === "scheduled") return <ScheduledGuide guide={guide} />;

  if (guide?.status === "paid") {
    return (
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Pago em {formatDayMonth(guide.paidOn)}</ItemTitle>
          <ItemDescription>Comprovante {guide.paymentProof}</ItemDescription>
        </ItemContent>
      </Item>
    );
  }

  if (state.status === "doneByUser") return null;

  if (state.status === "preparing") {
    return (
      <Item variant="outline">
        <ItemMedia variant="icon">
          <Loader2 className="animate-spin" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Emitindo a guia na Receita…</ItemTitle>
        </ItemContent>
      </Item>
    );
  }

  if (state.status === "needsUser") {
    return (
      <Item variant="outline">
        <ItemContent>
          <p>{state.reason}</p>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" disabled={isPending} onClick={handlePrepare}>
            Tentar de novo
          </Button>
        </ItemActions>
      </Item>
    );
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Pagar pelo Finances</ItemTitle>
        <ItemDescription>
          Emitimos a guia na Receita e você aprova antes de qualquer pagamento.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button disabled={isPending} onClick={handlePrepare}>
          Preparar guia
        </Button>
      </ItemActions>
    </Item>
  );
}
