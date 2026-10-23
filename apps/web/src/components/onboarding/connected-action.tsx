import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";
import { useAction } from "convex/react";
import { useTransition } from "react";

export type ConnectedActionProps = {
  connectionId: Id<"connections">;
};

export function ConnectedAction({ connectionId }: ConnectedActionProps) {
  const disconnect = useAction(api.connections.disconnect);
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      await disconnect({ connectionId });
    });
  }

  return (
    <>
      <Badge variant="success">Conectado</Badge>
      <Button variant="ghost" size="sm" disabled={isPending} onClick={handleDisconnect}>
        Desconectar
      </Button>
    </>
  );
}
