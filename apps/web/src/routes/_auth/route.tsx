import { RedirectToSignIn, Show } from "@clerk/react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import Loader from "@/components/loader";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <>
      <Authenticated>
        <div className="flex h-svh">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </Authenticated>
      <Unauthenticated>
        <Show when="signed-out">
          <RedirectToSignIn />
        </Show>
        <Show when="signed-in">
          <div>Não conseguimos validar sua sessão. Tente entrar de novo mais tarde.</div>
        </Show>
      </Unauthenticated>
      <AuthLoading>
        <div className="h-svh">
          <Loader />
        </div>
      </AuthLoading>
    </>
  );
}
