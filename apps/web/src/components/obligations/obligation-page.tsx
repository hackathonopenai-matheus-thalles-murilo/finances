import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { getRouteApi } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import Loader from "@/components/loader";
import { Page } from "@/components/page";
import { formatDayMonth } from "@/lib/format";
import { obligationLabel, obligationStatus } from "@/lib/obligation";

import { DoItYourself } from "./do-it-yourself";
import { ObligationCalculation } from "./obligation-calculation";
import { ObligationGuide } from "./obligation-guide";

const route = getRouteApi("/_auth/obligations/$obligationId");

export function ObligationPage() {
  const { obligationId } = route.useParams();
  const detail = useQuery(api.obligations.get, { obligationId });

  if (detail === undefined) return <Loader />;

  const { obligation, dueOn, status, calculation } = detail;

  return (
    <Page
      title={obligationLabel(obligation)}
      description={dueOn ? `Vence em ${formatDayMonth(dueOn)}` : "Prazo ainda não publicado"}
      actions={
        <Badge variant={obligationStatus[status].variant}>{obligationStatus[status].label}</Badge>
      }
    >
      <ObligationCalculation calculation={calculation} />
      <ObligationGuide detail={detail} />
      <DoItYourself detail={detail} />
    </Page>
  );
}
