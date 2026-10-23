import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button } from "@my-better-t-app/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ReceiptText } from "lucide-react";
import { useTransition } from "react";

export type OnboardingStep = 1 | 2 | 3;

const stepLabel: Record<OnboardingStep, string> = {
  1: "Sua situação",
  2: "Conexões",
  3: "Algo mais?",
};

export type OnboardingHeaderProps = {
  step: OnboardingStep;
};

export function OnboardingHeader({ step }: OnboardingHeaderProps) {
  const postponeOnboarding = useMutation(api.profile.postponeOnboarding);
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  const isLastStep = step === 3;

  function handlePostpone() {
    startTransition(async () => {
      await postponeOnboarding();
      await navigate({ to: "/dashboard" });
    });
  }

  return (
    <header className="grid h-16 grid-cols-[1fr_360px_1fr] items-center border-b bg-card px-8">
      <div className="flex items-center gap-2.5 text-[15px] font-semibold">
        <span className="grid size-6.5 place-items-center rounded-md bg-foreground text-background">
          <ReceiptText className="size-4" />
        </span>
        Finances
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Passo {step} de 3 · {stepLabel[step]}
        </span>
        <div
          role="progressbar"
          aria-label="Progresso da configuração"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          className="grid w-full grid-cols-3 gap-1.5"
        >
          {[1, 2, 3].map((position) => (
            <span
              key={position}
              className={`h-1 rounded-full ${position <= step ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
      {!isLastStep && (
        <Button
          variant="ghost"
          className="justify-self-end"
          disabled={isPending}
          onClick={handlePostpone}
        >
          Continuar depois
        </Button>
      )}
    </header>
  );
}
