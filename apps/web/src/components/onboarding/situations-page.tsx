import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import Loader from "@/components/loader";

import { OnboardingLayout } from "./onboarding-layout";
import { SituationsForm } from "./situations-form";

export function SituationsPage() {
  const situations = useQuery(api.profile.situations);

  return (
    <OnboardingLayout step={1}>
      {situations === undefined ? <Loader /> : <SituationsForm initialSituations={situations} />}
    </OnboardingLayout>
  );
}
