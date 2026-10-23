import { createFileRoute } from "@tanstack/react-router";

import { ConnectionsPage } from "@/components/onboarding/connections-page";

export const Route = createFileRoute("/onboarding/connections")({
  component: ConnectionsPage,
});
