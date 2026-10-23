import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { OverviewPage } from "@/components/overview/overview-page";

export const Route = createFileRoute("/_auth/dashboard")({
  validateSearch: z.object({ anoCalendario: z.number().int().optional() }),
  component: OverviewPage,
});
