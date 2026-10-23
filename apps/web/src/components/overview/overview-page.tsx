import { useUser } from "@clerk/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Navigate, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import Loader from "@/components/loader";
import { currentAnoCalendario, greeting } from "@/lib/format";
import { YearSelect } from "@/components/year-select";

import { DueObligations } from "./due-obligations";
import { PaidGuides } from "./paid-guides";
import { Pendencias } from "./pendencias";
import { ScheduledGuides } from "./scheduled-guides";

const route = getRouteApi("/_auth/dashboard");

function pendenciasSummary(count: number) {
  if (count === 0) return "Tudo em dia.";
  if (count === 1) return "Uma coisa precisa de você. O resto está em dia.";
  return `${count} coisas precisam de você. O resto está em dia.`;
}

export function OverviewPage() {
  const { anoCalendario = currentAnoCalendario() } = route.useSearch();
  const { user } = useUser();
  const overview = useQuery(api.overview.get, { anoCalendario });

  if (overview === undefined) return <Loader />;

  const { hasFiscalProfile, pendencias, scheduled, paid, dueSoon } = overview;

  if (!hasFiscalProfile) return <Navigate to="/onboarding" replace />;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-10 py-7">
      <header className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">
            {greeting()}
            {user?.firstName && `, ${user.firstName}`}
          </h1>
          <p className="mt-1 text-muted-foreground">{pendenciasSummary(pendencias.length)}</p>
        </div>
        <YearSelect anoCalendario={anoCalendario} />
      </header>
      <div className="grid grid-cols-[1fr_330px] items-start gap-7">
        <div className="flex min-w-0 flex-col gap-6">
          {pendencias.length > 0 && <Pendencias pendencias={pendencias} />}
          {scheduled.length > 0 && <ScheduledGuides guides={scheduled} />}
          {paid.length > 0 && <PaidGuides guides={paid} />}
        </div>
        {dueSoon.length > 0 && <DueObligations obligations={dueSoon} />}
      </div>
    </div>
  );
}
