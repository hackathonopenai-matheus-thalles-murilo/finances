import { createFileRoute } from "@tanstack/react-router";
import { UserRound } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";

export const Route = createFileRoute("/_auth/fiscal-profile")({
  component: FiscalProfilePage,
});

function FiscalProfilePage() {
  return (
    <Page title="Perfil fiscal" description="O que sabemos sobre a sua vida fiscal.">
      <EmptyState
        icon={UserRound}
        title="Em breve"
        description="Aqui você vai ver e corrigir cada informação do seu perfil, com a origem de cada uma."
      />
    </Page>
  );
}
