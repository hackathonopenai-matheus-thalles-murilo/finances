import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ObligationsPage } from "@/components/obligations/obligations-page";

export const Route = createFileRoute("/_auth/obligations")({
  validateSearch: z.object({ anoCalendario: z.number().int().optional() }),
  component: ObligationsPage,
});
