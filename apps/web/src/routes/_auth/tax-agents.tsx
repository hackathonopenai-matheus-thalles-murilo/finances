import { createFileRoute } from "@tanstack/react-router";

import { Page } from "@/components/page";
import { ChatgptConnection } from "@/components/tax-agents/chatgpt-connection";
import { ClearHistoryButton } from "@/components/tax-agents/clear-history-button";
import { TaxAgentChat } from "@/components/tax-agents/tax-agent-chat";

export const Route = createFileRoute("/_auth/tax-agents")({
  component: TaxAgentsPage,
});

function TaxAgentsPage() {
  return (
    <Page
      title="Agentes fiscais"
      description="Quem prepara, paga e entrega seus impostos, sempre com sua aprovação."
      actions={<ClearHistoryButton />}
    >
      <ChatgptConnection />
      <TaxAgentChat />
    </Page>
  );
}
