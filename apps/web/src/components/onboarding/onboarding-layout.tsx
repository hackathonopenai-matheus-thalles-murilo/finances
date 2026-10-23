import { OnboardingHeader, type OnboardingStep } from "./onboarding-header";

export type OnboardingLayoutProps = {
  step: OnboardingStep;
  children: React.ReactNode;
};

export function OnboardingLayout({ step, children }: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <OnboardingHeader step={step} />
      <main className="flex flex-1 flex-col px-8 pt-14 pb-16 [view-transition-name:onboarding-step]">
        {children}
      </main>
    </div>
  );
}
