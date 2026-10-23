import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation } from "convex/react";
import { RefreshCw } from "lucide-react";
import { useTransition } from "react";

import { PendenciaItem } from "./pendencia-item";

export function SetupFailedPendencia() {
  const refresh = useMutation(api.setup.refresh);
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    startTransition(async () => {
      await refresh({});
    });
  }

  return (
    <PendenciaItem
      icon={RefreshCw}
      tone="warning"
      tag="Análise"
      title="Não conseguimos analisar suas informações"
      description="Tente de novo. Se você entrou com o ChatGPT, confira se a conta ainda está conectada."
      actions={
        <Button variant="outline" disabled={isPending} onClick={handleRetry}>
          Tentar de novo
        </Button>
      }
      aside={null}
    />
  );
}
