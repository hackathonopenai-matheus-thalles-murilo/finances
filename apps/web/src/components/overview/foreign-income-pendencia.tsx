import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Pendencia } from "@my-better-t-app/backend/convex/overview";
import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation } from "convex/react";
import { MessageCircleQuestion } from "lucide-react";
import { useTransition } from "react";

import { formatMoney, monthName } from "@/lib/format";

import { PendenciaItem } from "./pendencia-item";

export type ForeignIncomePendenciaProps = {
  pendencia: Extract<Pendencia, { type: "foreignIncome" }>;
};

export function ForeignIncomePendencia({ pendencia }: ForeignIncomePendenciaProps) {
  const { questionId, institution, month, transactionCount, amountCents, currency } = pendencia;
  const isSingle = transactionCount === 1;
  const answer = useMutation(api.foreignIncome.answer);
  const [isPending, startTransition] = useTransition();

  function handleAnswer(isIncome: boolean) {
    startTransition(async () => {
      await answer({ questionId, isIncome });
    });
  }

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
          ? `Entrou na sua conta ${institution} em ${monthName(month)}. É renda sua, como pagamento por trabalho?`
          : `Entraram na sua conta ${institution} em ${monthName(month)}. São renda sua, como pagamento por trabalho?`
      }
      actions={
        <>
          <Button disabled={isPending} onClick={() => handleAnswer(true)}>
            Sim, é renda
          </Button>
          <Button variant="outline" disabled={isPending} onClick={() => handleAnswer(false)}>
            Não é renda
          </Button>
        </>
      }
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
