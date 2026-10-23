import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Situation } from "@my-better-t-app/backend/convex/profile";
import { Button } from "@my-better-t-app/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useState, useTransition } from "react";

import { situationOptions } from "@/lib/situation";

import { OnboardingTitle } from "./onboarding-title";
import { SituationCard } from "./situation-card";

export type SituationsFormProps = {
  initialSituations: Situation[];
};

export function SituationsForm({ initialSituations }: SituationsFormProps) {
  const [selected, setSelected] = useState(initialSituations);
  const saveSituations = useMutation(api.profile.saveSituations);
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  function handleCheckedChange(situation: Situation, isChecked: boolean) {
    setSelected(isChecked ? [...selected, situation] : selected.filter((s) => s !== situation));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await saveSituations({ situations: selected });
      await navigate({ to: "/onboarding/connections", viewTransition: { types: ["forward"] } });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex flex-col items-center text-center">
      <OnboardingTitle
        title="O que faz parte da sua vida fiscal?"
        description="Marque tudo o que vale para você. Isso define quais impostos acompanhamos."
      />
      <div className="mt-9 grid grid-cols-3 gap-3.5 text-left">
        {situationOptions.map((option) => (
          <SituationCard
            key={option.situation}
            option={option}
            isChecked={selected.includes(option.situation)}
            onCheckedChange={(isChecked) => handleCheckedChange(option.situation, isChecked)}
          />
        ))}
      </div>
      <Button type="submit" size="lg" className="mt-8" disabled={isPending}>
        Continuar
      </Button>
    </form>
  );
}
