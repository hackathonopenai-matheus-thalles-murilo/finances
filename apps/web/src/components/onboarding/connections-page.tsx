import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { buttonVariants } from "@my-better-t-app/ui/components/button";
import { Card } from "@my-better-t-app/ui/components/card";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Landmark, Lock } from "lucide-react";

import { ConnectBankButton } from "@/components/connections/connect-bank-button";
import Loader from "@/components/loader";

import { ConnectedAction } from "./connected-action";
import { ConnectionRow } from "./connection-row";
import { OnboardingLayout } from "./onboarding-layout";
import { OnboardingTitle } from "./onboarding-title";
import { SuggestedConnection } from "./suggested-connection";

export function ConnectionsPage() {
  const onboarding = useQuery(api.onboarding.connections);

  if (onboarding === undefined) {
    return (
      <OnboardingLayout step={2}>
        <Loader />
      </OnboardingLayout>
    );
  }

  const { suggestions, others } = onboarding;
  const hasRows = suggestions.length > 0 || others.length > 0;

  return (
    <OnboardingLayout step={2}>
      <div className="mx-auto flex w-full max-w-160 flex-col">
        <OnboardingTitle
          title="Conecte seus bancos e corretoras"
          description="Só leitura: contas, transações e investimentos. Você desconecta quando quiser."
        />
        {hasRows && (
          <section className="mt-7">
            <h2 className="mb-2.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Pelo que você marcou
            </h2>
            <Card size="flush">
              {suggestions.map((suggestion) => (
                <SuggestedConnection key={suggestion.situation} suggestion={suggestion} />
              ))}
              {others.map(({ connectionId, institution }) => (
                <ConnectionRow
                  key={connectionId}
                  icon={Landmark}
                  title={institution}
                  action={<ConnectedAction connectionId={connectionId} />}
                />
              ))}
            </Card>
          </section>
        )}
        <div className="mt-3">
          <ConnectBankButton variant="outline">Conectar outro banco ou corretora</ConnectBankButton>
        </div>
        <p className="mt-4 flex gap-2 text-[12.5px] text-muted-foreground">
          <Lock className="mt-px size-3.75 shrink-0" />
          Você autoriza no site do seu banco, pelo Open Finance. Nunca pedimos sua senha.
        </p>
        <div className="mt-6 flex items-center justify-between">
          <Link
            to="/onboarding"
            viewTransition={{ types: ["back"] }}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Voltar
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-muted-foreground">Dá para conectar mais depois.</span>
            <Link
              to="/onboarding/anything-else"
              viewTransition={{ types: ["forward"] }}
              className={buttonVariants({ size: "lg" })}
            >
              Continuar
            </Link>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
