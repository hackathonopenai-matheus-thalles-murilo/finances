import { createFileRoute } from "@tanstack/react-router";

import { ConnectBankButton } from "@/components/connections/connect-bank-button";
import { ConnectionList } from "@/components/connections/connection-list";
import { Page } from "@/components/page";

export const Route = createFileRoute("/_auth/connections")({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  return (
    <Page
      title="Conexões"
      description="Seus bancos e corretoras conectados pelo Open Finance."
      actions={<ConnectBankButton>Conectar banco</ConnectBankButton>}
    >
      <ConnectionList />
    </Page>
  );
}
