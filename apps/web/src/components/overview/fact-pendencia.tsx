import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Pendencia } from "@my-better-t-app/backend/convex/overview";
import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation } from "convex/react";
import { Store } from "lucide-react";
import { useTransition } from "react";

import { PendenciaItem } from "./pendencia-item";

type FactPendenciaData = Extract<Pendencia, { type: "fact" }>;
type MeiActivity = NonNullable<FactPendenciaData["suggestion"]["activity"]>;

const activityLabel: Record<MeiActivity, string> = {
  comercioIndustria: "Comércio ou indústria",
  servicos: "Serviços",
  comercioIndustriaServicos: "Comércio e serviços",
};

const activities: MeiActivity[] = ["servicos", "comercioIndustria", "comercioIndustriaServicos"];

export type FactPendenciaProps = {
  pendencia: FactPendenciaData;
};

export function FactPendencia({ pendencia }: FactPendenciaProps) {
  const { factId, suggestion, evidence } = pendencia;
  const confirm = useMutation(api.facts.confirm);
  const reject = useMutation(api.facts.reject);
  const [isPending, startTransition] = useTransition();

  function handleConfirm(activity: MeiActivity) {
    startTransition(async () => {
      await confirm({ factId, activity });
    });
  }

  function handleReject() {
    startTransition(async () => {
      await reject({ factId });
    });
  }

  const { activity } = suggestion;

  return (
    <PendenciaItem
      icon={Store}
      tone="default"
      tag="Perfil fiscal"
      title={
        activity === undefined
          ? "Você tem um MEI? Qual a atividade dele?"
          : `Você tem um MEI de ${activityLabel[activity].toLowerCase()}?`
      }
      description={evidence}
      actions={
        <>
          {activity === undefined ? (
            activities.map((option) => (
              <Button
                key={option}
                variant="outline"
                disabled={isPending}
                onClick={() => handleConfirm(option)}
              >
                {activityLabel[option]}
              </Button>
            ))
          ) : (
            <Button disabled={isPending} onClick={() => handleConfirm(activity)}>
              Sim, confirmar
            </Button>
          )}
          <Button variant="ghost" disabled={isPending} onClick={handleReject}>
            Não tenho MEI
          </Button>
        </>
      }
      aside={null}
    />
  );
}
