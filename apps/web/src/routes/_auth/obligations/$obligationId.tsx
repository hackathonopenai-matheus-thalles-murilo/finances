import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ObligationPage } from "@/components/obligations/obligation-page";

const obligationParams = z.object({
  obligationId: z.custom<Id<"obligations">>((value) => typeof value === "string"),
});

export const Route = createFileRoute("/_auth/obligations/$obligationId")({
  params: { parse: obligationParams.parse },
  component: ObligationPage,
});
