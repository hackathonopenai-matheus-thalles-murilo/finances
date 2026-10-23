import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import type { Situation } from "@my-better-t-app/backend/convex/profile";
import { Button } from "@my-better-t-app/ui/components/button";
import { useAction } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { PluggyConnect } from "react-pluggy-connect";

export type ConnectBankButtonProps = {
  connectionId?: Id<"connections">;
  situation?: Situation;
  variant?: "default" | "outline";
  size?: "default" | "sm";
  children: React.ReactNode;
};

export function ConnectBankButton({
  connectionId,
  situation,
  variant = "default",
  size = "default",
  children,
}: ConnectBankButtonProps) {
  const createConnectToken = useAction(api.connections.createConnectToken);
  const connect = useAction(api.connections.connect);
  const [widget, setWidget] = useState<{ connectToken: string; updateItem?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      setWidget(await createConnectToken({ connectionId }));
    });
  }

  function handleSuccess({ item }: { item: { id: string } }) {
    startTransition(async () => {
      await connect({ itemId: item.id, situation });
    });
  }

  return (
    <>
      <Button variant={variant} size={size} disabled={isPending} onClick={handleClick}>
        {isPending && <Loader2 className="animate-spin" />}
        {children}
      </Button>
      {widget !== null && (
        <PluggyConnect
          connectToken={widget.connectToken}
          updateItem={widget.updateItem}
          includeSandbox={import.meta.env.DEV}
          language="pt"
          onSuccess={handleSuccess}
          onClose={() => setWidget(null)}
        />
      )}
    </>
  );
}
