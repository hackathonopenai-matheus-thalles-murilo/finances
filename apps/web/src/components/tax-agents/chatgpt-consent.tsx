import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@my-better-t-app/ui/components/dialog";
import { useAction } from "convex/react";
import { useTransition } from "react";
import { toast } from "sonner";

export function ChatgptConsent() {
  const startLogin = useAction(api.chatgpt.startLogin);
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      await startLogin().catch(() =>
        toast.error("Não conseguimos falar com a OpenAI agora. Tente de novo."),
      );
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Usar seu ChatGPT nos agentes fiscais?</DialogTitle>
        <DialogDescription>Continue só se concordar com tudo abaixo.</DialogDescription>
      </DialogHeader>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          Suas conversas com os agentes fiscais, incluindo dados das suas finanças, vão para a
          OpenAI pela sua conta do ChatGPT e seguem as configurações de dados dessa conta.
        </li>
        <li>O uso conta nos limites do seu plano do ChatGPT.</li>
        <li>Não vemos sua senha do ChatGPT.</li>
        <li>Esta conexão não é oficial da OpenAI e pode parar de funcionar.</li>
        <li>Você pode desconectar quando quiser, e apagamos o acesso guardado.</li>
      </ul>
      <DialogFooter>
        <DialogClose render={<Button variant="ghost" />}>Cancelar</DialogClose>
        <Button disabled={isPending} onClick={handleContinue}>
          {isPending ? "Gerando código…" : "Continuar"}
        </Button>
      </DialogFooter>
    </>
  );
}
