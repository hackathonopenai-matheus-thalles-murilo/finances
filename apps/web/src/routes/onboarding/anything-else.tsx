import { createFileRoute } from "@tanstack/react-router";

import { AnythingElsePage } from "@/components/onboarding/anything-else-page";

export const Route = createFileRoute("/onboarding/anything-else")({
  component: AnythingElsePage,
});
