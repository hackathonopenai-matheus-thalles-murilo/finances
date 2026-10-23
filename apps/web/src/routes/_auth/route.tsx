import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AuthGate } from "@/components/auth-gate";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <AuthGate>
      <div className="flex h-svh">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </AuthGate>
  );
}
