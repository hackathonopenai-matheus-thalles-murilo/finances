import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";

export const Route = createFileRoute("/_auth/companies")({
  component: CompaniesPage,
});

function CompaniesPage() {
  return (
    <Page title="Empresas" description="Os CNPJs que você tem ou dos quais é sócio.">
      <EmptyState
        icon={Building2}
        title="Em breve"
        description="Aqui você vai adicionar e remover suas empresas e o regime de cada uma."
      />
    </Page>
  );
}
