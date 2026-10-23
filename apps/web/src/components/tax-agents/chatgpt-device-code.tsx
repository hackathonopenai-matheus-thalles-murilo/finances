import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button, buttonVariants } from "@my-better-t-app/ui/components/button";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@my-better-t-app/ui/components/dialog";
import { useMutation } from "convex/react";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type ChatgptDeviceCodeProps = {
  userCode: string;
  verificationUrl: string;
};

export function ChatgptDeviceCode({ userCode, verificationUrl }: ChatgptDeviceCodeProps) {
  const disconnect = useMutation(api.chatgpt.disconnect);

  function handleCopy() {
    navigator.clipboard.writeText(userCode).then(
      () => toast.success("Código copiado"),
      () => toast.error("Não conseguimos copiar. Selecione o código e copie à mão."),
    );
  }

  function handleCancel() {
    void disconnect();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Entre com o ChatGPT</DialogTitle>
        <DialogDescription>
          Abra a página da OpenAI, entre na sua conta e digite este código.
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-center gap-2 rounded-lg bg-muted py-6">
        <span className="font-mono text-3xl font-semibold tracking-[0.2em] select-all">
          {userCode}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Copiar código" onClick={handleCopy}>
          <Copy />
        </Button>
      </div>
      <a href={verificationUrl} target="_blank" rel="noreferrer" className={buttonVariants()}>
        Abrir página da OpenAI
        <ExternalLink />
      </a>
      <DialogFooter>
        <p className="mr-auto flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Esperando você autorizar
        </p>
        <DialogClose render={<Button variant="ghost" />} onClick={handleCancel}>
          Cancelar
        </DialogClose>
      </DialogFooter>
    </>
  );
}
