import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button, buttonVariants } from "@my-better-t-app/ui/components/button";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState, useTransition } from "react";

import { OnboardingLayout } from "./onboarding-layout";
import { OnboardingTitle } from "./onboarding-title";

export function AnythingElsePage() {
  const [note, setNote] = useState("");
  const finishOnboarding = useMutation(api.profile.finishOnboarding);
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await finishOnboarding({ note });
      await navigate({ to: "/dashboard" });
    });
  }

  return (
    <OnboardingLayout step={3}>
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-150 flex-col items-center text-center"
      >
        <OnboardingTitle
          title="Pronto. Esquecemos de algo?"
          description="Se tem algo que pode mudar seus impostos, conte do seu jeito. É opcional."
        />
        <div className="mt-7 w-full text-left">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-label="Conte do seu jeito"
            rows={5}
          />
        </div>
        <div className="mt-7 flex gap-2.5">
          <Link
            to="/onboarding/connections"
            viewTransition={{ types: ["back"] }}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Voltar
          </Link>
          <Button type="submit" size="lg" disabled={isPending}>
            Ir para o painel
          </Button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
