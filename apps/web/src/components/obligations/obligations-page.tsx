import { getRouteApi } from "@tanstack/react-router";

import { Page } from "@/components/page";
import { YearSelect } from "@/components/year-select";
import { currentAnoCalendario } from "@/lib/format";

import { ObligationList } from "./obligation-list";

const route = getRouteApi("/_auth/obligations/");

export function ObligationsPage() {
  const { anoCalendario = currentAnoCalendario() } = route.useSearch();

  return (
    <Page
      title="Obrigações"
      description="O que a lei pede de você em cada ano-calendário."
      actions={<YearSelect anoCalendario={anoCalendario} />}
    >
      <ObligationList anoCalendario={anoCalendario} />
    </Page>
  );
}
