import { api } from "@my-better-t-app/backend/convex/_generated/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@my-better-t-app/ui/components/alert-dialog";
import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

export function ClearHistoryButton() {
  const threadId = useQuery(api.taxAgent.thread);
  const clearHistory = useMutation(api.taxAgent.clearHistory);
  const [isPending, startTransition] = useTransition();

  function handleClear() {
    startTransition(async () => {
      await clearHistory().catch(() =>
        toast.error("Não conseguimos apagar a conversa. Tente de novo."),
      );
    });
  }

  if (threadId === undefined || threadId === null) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" />}>
        <Trash2 />
        Limpar conversa
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar a conversa?</AlertDialogTitle>
          <AlertDialogDescription>
            Apagamos todas as mensagens com o agente fiscal. Seu perfil fiscal, obrigações e guias
            continuam como estão.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost">Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleClear}>
            Apagar conversa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
