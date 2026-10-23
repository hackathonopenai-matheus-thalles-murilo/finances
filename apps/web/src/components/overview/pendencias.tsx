import type { Pendencia } from "@my-better-t-app/backend/convex/overview";

import { ApprovalPendencia } from "./approval-pendencia";
import { ConnectionPendencia } from "./connection-pendencia";
import { ForeignIncomePendencia } from "./foreign-income-pendencia";
import { OnboardingPendencia } from "./onboarding-pendencia";
import { OverviewSection } from "./overview-section";

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
        return <ConnectionPendencia key={pendencia.connectionId} pendencia={pendencia} />;
      })}
    </OverviewSection>
  );
}
