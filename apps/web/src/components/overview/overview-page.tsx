import { useUser } from "@clerk/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Navigate, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CalendarCheck } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import Loader from "@/components/loader";
import { currentAnoCalendario, greeting } from "@/lib/format";
import { YearSelect } from "@/components/year-select";

import { DueObligations } from "./due-obligations";
import { RefreshReviewButton } from "./refresh-review-button";
import { Pendencias } from "./pendencias";
import { RecentlyDone } from "./recently-done";
import { ScheduledGuides } from "./scheduled-guides";

const route = getRouteApi("/_auth/dashboard");

type Overview = FunctionReturnType<typeof api.overview.get>;

function headline({ isPreparing, pendencias, dueSoon, done }: Overview) {
  if (isPreparing) return "Preparando sua visão fiscal…";
  if (pendencias.length === 1) return "Uma coisa precisa de você. O resto está em dia.";
  if (pendencias.length > 1)
    return `${pendencias.length} coisas precisam de você. O resto está em dia.`;
  if (dueSoon.length === 0 && done.length === 0)
    return "Ainda não encontramos obrigações para você.";
  return "Tudo em dia.";
}

export function OverviewPage() {
  const { anoCalendario = currentAnoCalendario() } = route.useSearch();
  const { user } = useUser();
  const overview = useQuery(api.overview.get, { anoCalendario });

  if (overview === undefined) return <Loader />;

  const { hasFiscalProfile, pendencias, scheduled, done, dueSoon } = overview;

  if (!hasFiscalProfile) return <Navigate to="/onboarding" replace />;

  const isEmpty =
    pendencias.length === 0 && scheduled.length === 0 && done.length === 0 && dueSoon.length === 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-10 py-7">
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">
            {greeting()}
            {user?.firstName && `, ${user.firstName}`}
          </h1>
          <p className="mt-1 text-muted-foreground">{headline(overview)}</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshReviewButton isPreparing={overview.isPreparing} />
          <YearSelect anoCalendario={anoCalendario} />
        </div>
      </header>
      {isEmpty ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nada por aqui ainda"
          description={`Quando uma obrigação do ano-calendário ${anoCalendario} vencer ou precisar da sua aprovação, ela aparece aqui.`}
        />
      ) : (
        <div className="grid grid-cols-[1fr_330px] items-start gap-7">
          <div className="flex min-w-0 flex-col gap-6">
            {pendencias.length > 0 && <Pendencias pendencias={pendencias} />}
            {scheduled.length > 0 && <ScheduledGuides guides={scheduled} />}
            {done.length > 0 && <RecentlyDone obligations={done} />}
          </div>
          {dueSoon.length > 0 && <DueObligations obligations={dueSoon} />}
        </div>
      )}
    </div>
  );
}
