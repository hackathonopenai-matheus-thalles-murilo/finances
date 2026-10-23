import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AuthGate } from "@/components/auth-gate";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
}
