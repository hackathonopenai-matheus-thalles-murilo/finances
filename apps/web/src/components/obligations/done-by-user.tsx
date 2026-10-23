import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
import { Button, buttonVariants } from "@my-better-t-app/ui/components/button";
import { useMutation } from "convex/react";
import { useTransition } from "react";
import { toast } from "sonner";

import { formatDayMonth } from "@/lib/format";

export type DoneByUserProps = {
  obligationId: Id<"obligations">;
  doneOn: string;
  proofUrl: string | null;
};

export function DoneByUser({ obligationId, doneOn, proofUrl }: DoneByUserProps) {
  const undoDone = useMutation(api.obligations.undoDone);
  const [isPending, startTransition] = useTransition();

  function handleUndo() {
    startTransition(async () => {
      await undoDone({ obligationId }).catch(() =>
        toast.error("Não conseguimos desfazer. Tente de novo."),
      );
    });
  }

  return (
    <div className="flex w-full items-center justify-between gap-6">
      <p>Feito por você em {formatDayMonth(doneOn)}</p>
      <div className="flex items-center gap-2">
        {proofUrl && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost" })}
          >
            Ver comprovante
          </a>
        )}
        <Button variant="ghost" disabled={isPending} onClick={handleUndo}>
          Desfazer
        </Button>
      </div>
    </div>
  );
}
