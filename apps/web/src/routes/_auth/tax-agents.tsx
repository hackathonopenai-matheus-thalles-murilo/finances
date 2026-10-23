import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";

export const Route = createFileRoute("/_auth/tax-agents")({
  component: TaxAgentsPage,
});

function TaxAgentsPage() {
  return (
    <Page
      title="Agentes fiscais"
      description="Quem prepara, paga e entrega seus impostos, sempre com sua aprovação."
    >
      <EmptyState
        icon={Sparkles}
        title="Em breve"
        description="Aqui você vai acompanhar cada execução: o que foi preparado, quem aprovou e os comprovantes."
      />
    </Page>
  );
}
