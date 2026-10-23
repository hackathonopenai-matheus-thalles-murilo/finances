import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { getRouteApi } from "@tanstack/react-router";

import Loader from "@/components/loader";
import { Page } from "@/components/page";
import { YearSelect } from "@/components/year-select";
import { currentAnoCalendario } from "@/lib/format";

import { ObligationCalendar } from "./obligation-calendar";
import { ObligationList } from "./obligation-list";

const route = getRouteApi("/_auth/obligations/");

export function ObligationsPage() {
  const { anoCalendario = currentAnoCalendario() } = route.useSearch();
  const obligations = useQuery(api.obligations.list, { anoCalendario });

  return (
    <Page
      className="h-full max-w-none gap-4 px-8 py-6"
      title="Obrigações"
      description="Vencimentos e pagamentos das suas obrigações em um só lugar."
      actions={<YearSelect anoCalendario={anoCalendario} />}
    >
      {obligations === undefined ? (
        <Loader />
      ) : (
        <>
          <ObligationCalendar obligations={obligations} />
          {obligations.length > 0 && (
            <details className="shrink-0">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Ver todas as obrigações
              </summary>
              <div className="mt-3">
                <ObligationList obligations={obligations} />
              </div>
            </details>
          )}
        </>
      )}
    </Page>
  );
}
