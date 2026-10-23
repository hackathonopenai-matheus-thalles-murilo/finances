import type { ChatgptAccount } from "@my-better-t-app/backend/convex/chatgpt";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@my-better-t-app/ui/components/dialog";

import { ChatgptConsent } from "./chatgpt-consent";
import { ChatgptDeviceCode } from "./chatgpt-device-code";

export type ChatgptLoginDialogProps = {
  account: ChatgptAccount;
};

export function ChatgptLoginDialog({ account }: ChatgptLoginDialogProps) {
  if (account.status === "pending") {
    return (
      <DialogContent>
        <ChatgptDeviceCode userCode={account.userCode} verificationUrl={account.verificationUrl} />
      </DialogContent>
    );
  }

  if (account.status === "connected") {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ChatGPT conectado</DialogTitle>
          <DialogDescription>
            A partir de agora, os agentes fiscais usam o seu plano do ChatGPT.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Pronto</DialogClose>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <ChatgptConsent />
    </DialogContent>
  );
}
