import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { ObligationDetail } from "@my-better-t-app/backend/convex/obligations";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card";
import { useMutation } from "convex/react";
import { Copy } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { formatDayMonth, formatMoney } from "@/lib/format";

export type GuideApprovalProps = {
  guide: Extract<NonNullable<ObligationDetail["guide"]>, { status: "awaitingApproval" }>;
  guideType: string;
};

export function GuideApproval({ guide, guideType }: GuideApprovalProps) {
  const approve = useMutation(api.guides.approve);
  const [isPending, startTransition] = useTransition();
  const { guideId, document } = guide;

  function handleApprove() {
    startTransition(async () => {
      await approve({ guideId, documentHash: document.hash }).catch(() =>
        toast.error("Não conseguimos aprovar o pagamento. Atualize a página e revise de novo."),
      );
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(document.barcode).then(
      () => toast.success("Código de barras copiado"),
      () => toast.error("Não conseguimos copiar. Selecione o código e copie à mão."),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{guideType}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="text-muted-foreground">Valor</dt>
          <dd className="font-mono font-semibold tabular-nums">
            {formatMoney(document.amountCentavos)}
          </dd>
          <dt className="text-muted-foreground">Número</dt>
          <dd className="font-mono">{document.number}</dd>
          <dt className="text-muted-foreground">Código de barras</dt>
          <dd className="flex items-center gap-1 font-mono break-all">
            {document.barcode}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Copiar código de barras"
              onClick={handleCopy}
            >
              <Copy />
            </Button>
          </dd>
        </dl>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3">
          <Button disabled={isPending} onClick={handleApprove}>
            Aprovar pagamento
          </Button>
          <p className="text-xs text-muted-foreground">
            O valor é debitado da sua conta em {formatDayMonth(document.dueOn)}, no vencimento.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
