import { createFileRoute } from "@tanstack/react-router";

import { SituationsPage } from "@/components/onboarding/situations-page";

export const Route = createFileRoute("/onboarding/")({
  component: SituationsPage,
});
