import { RedirectToSignIn, Show } from "@clerk/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import Loader from "@/components/loader";

export type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  return (
    <>
      <Authenticated>{children}</Authenticated>
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
