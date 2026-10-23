import type { Pendencia } from "@my-better-t-app/backend/convex/overview";
import { Button } from "@my-better-t-app/ui/components/button";
import { MessageCircleQuestion } from "lucide-react";

import { formatMoney, monthName } from "@/lib/format";

import { PendenciaItem } from "./pendencia-item";

export type ForeignIncomePendenciaProps = {
  pendencia: Extract<Pendencia, { type: "foreignIncome" }>;
};

export function ForeignIncomePendencia({ pendencia }: ForeignIncomePendenciaProps) {
  const { institution, month, transactionCount, amountCents, currency } = pendencia;
  const isSingle = transactionCount === 1;

  return (
    <PendenciaItem
      icon={MessageCircleQuestion}
      tone="warning"
      tag="Pergunta"
      title={
        isSingle
          ? "Confirme 1 recebimento do exterior"
          : `Confirme ${transactionCount} recebimentos do exterior`
      }
      description={
        isSingle
          ? `Entrou na sua conta ${institution} em ${monthName(month)}. É pagamento pelo seu trabalho?`
          : `Entraram na sua conta ${institution} em ${monthName(month)}. São pagamentos pelo seu trabalho?`
      }
      actions={<Button variant="outline">Responder</Button>}
      aside={
        <>
          <p className="font-mono text-xl font-semibold whitespace-nowrap tabular-nums">
            {formatMoney(amountCents, currency)}
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {isSingle ? "1 transação" : `${transactionCount} transações`}
          </p>
        </>
      }
    />
  );
}
