import type { Pendencia } from "@my-better-t-app/backend/convex/overview";

import { ApprovalPendencia } from "./approval-pendencia";
import { ConnectionPendencia } from "./connection-pendencia";
import { FactPendencia } from "./fact-pendencia";
import { ForeignIncomePendencia } from "./foreign-income-pendencia";
import { OnboardingPendencia } from "./onboarding-pendencia";
import { OverviewSection } from "./overview-section";
import { SetupFailedPendencia } from "./setup-failed-pendencia";

export type PendenciasProps = {
  pendencias: Pendencia[];
};

export function Pendencias({ pendencias }: PendenciasProps) {
  return (
    <OverviewSection title="Precisa de você">
      {pendencias.map((pendencia) => {
        if (pendencia.type === "approval") {
          return <ApprovalPendencia key={pendencia.guideId} pendencia={pendencia} />;
        }
        if (pendencia.type === "foreignIncome") {
          return <ForeignIncomePendencia key={pendencia.questionId} pendencia={pendencia} />;
        }
        if (pendencia.type === "onboarding") {
          return <OnboardingPendencia key="onboarding" />;
        }
        if (pendencia.type === "fact") {
          return <FactPendencia key={pendencia.factId} pendencia={pendencia} />;
        }
        if (pendencia.type === "setupFailed") {
          return <SetupFailedPendencia key="setupFailed" />;
        }
        return <ConnectionPendencia key={pendencia.connectionId} pendencia={pendencia} />;
      })}
    </OverviewSection>
  );
}
