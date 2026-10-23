import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { ConnectionRow } from "@my-better-t-app/backend/convex/connections";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { useAction, useMutation } from "convex/react";
import { Ellipsis } from "lucide-react";
import { useTransition } from "react";

import { formatDayMonth, formatTimestampDayMonth } from "@/lib/format";

import { ConnectBankButton } from "./connect-bank-button";

const connectionStatus: Record<
  ConnectionRow["status"],
  { label: string; variant: "success" | "warning" | "destructive" | "secondary" }
> = {
  active: { label: "Ativa", variant: "success" },
  expiring: { label: "Expirando", variant: "warning" },
  expired: { label: "Expirada", variant: "destructive" },
  revoked: { label: "Revogada", variant: "secondary" },
};

function connectionDescription({ status, expiresOn, sync, syncedAt }: ConnectionRow) {
  if (status === "revoked") return "O acesso a esta instituição foi revogado.";
  if (status === "expired" && expiresOn !== undefined) {
    return `Expirou em ${formatDayMonth(expiresOn)}. Seus dados estão desatualizados.`;
  }
  if (status === "expiring" && expiresOn !== undefined) {
    return `Expira em ${formatDayMonth(expiresOn)}`;
  }
  if (sync === "syncing") return "Sincronizando…";
  if (sync === "failed")
    return "A última atualização falhou. Seus dados podem estar desatualizados.";
  if (syncedAt === undefined) return "Ainda não sincronizada.";
  return `Atualizada em ${formatTimestampDayMonth(syncedAt)}`;
}

export type ConnectionItemProps = {
  connection: ConnectionRow;
};

export function ConnectionItem({ connection }: ConnectionItemProps) {
  const refresh = useMutation(api.connections.refresh);
  const disconnect = useAction(api.connections.disconnect);
  const [isPending, startTransition] = useTransition();
  const { connectionId, institution, status, sync } = connection;
  const needsRenewal = status !== "active" || sync === "failed";

  function handleRefresh() {
    startTransition(async () => {
      await refresh({ connectionId });
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnect({ connectionId });
    });
  }

  return (
    <Item size="sm">
      <ItemContent>
        <ItemTitle>{institution}</ItemTitle>
        <ItemDescription>{connectionDescription(connection)}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Badge variant={connectionStatus[status].variant}>{connectionStatus[status].label}</Badge>
        {needsRenewal && (
          <ConnectBankButton connectionId={connectionId} variant="outline">
            Renovar
          </ConnectBankButton>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" disabled={isPending} aria-label="Mais" />}
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={sync === "syncing"} onClick={handleRefresh}>
              Atualizar agora
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleDisconnect}>
              Desconectar e apagar dados
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}
