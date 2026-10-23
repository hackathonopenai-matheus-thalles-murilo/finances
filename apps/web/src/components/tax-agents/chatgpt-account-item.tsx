import { api } from "@my-better-t-app/backend/convex/_generated/api";
import type { ChatgptAccount } from "@my-better-t-app/backend/convex/chatgpt";
import { Button } from "@my-better-t-app/ui/components/button";
import { DialogTrigger } from "@my-better-t-app/ui/components/dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { useMutation } from "convex/react";
import { useTransition } from "react";

export type ChatgptAccountItemProps = {
  account: ChatgptAccount;
};

export function ChatgptAccountItem({ account }: ChatgptAccountItemProps) {
  const disconnect = useMutation(api.chatgpt.disconnect);
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      await disconnect();
    });
  }

  if (account.status === "pending") {
    return (
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Esperando você entrar no ChatGPT</ItemTitle>
          <ItemDescription>Digite o código {account.userCode} na página da OpenAI.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <DialogTrigger render={<Button variant="outline" />}>Ver código</DialogTrigger>
          <Button variant="ghost" disabled={isPending} onClick={handleDisconnect}>
            Cancelar
          </Button>
        </ItemActions>
      </Item>
    );
  }

  if (account.status === "connected") {
    return (
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>ChatGPT conectado</ItemTitle>
          <ItemDescription>
            {account.email ?? "Os agentes fiscais usam o seu plano do ChatGPT."}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" disabled={isPending} onClick={handleDisconnect}>
            Desconectar
          </Button>
        </ItemActions>
      </Item>
    );
  }

  if (account.status === "expired") {
    return (
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Sua conexão com o ChatGPT expirou</ItemTitle>
          <ItemDescription>
            Entre de novo, ou desconecte para voltar ao modelo do Finances.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <DialogTrigger render={<Button />}>Entrar de novo</DialogTrigger>
          <Button variant="ghost" disabled={isPending} onClick={handleDisconnect}>
            Desconectar
          </Button>
        </ItemActions>
      </Item>
    );
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>Usar seu ChatGPT</ItemTitle>
        <ItemDescription>
          Os agentes fiscais usam um modelo da OpenAI pelo Finances. Se preferir, use o seu plano do
          ChatGPT.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <DialogTrigger render={<Button variant="outline" />}>Entrar com ChatGPT</DialogTrigger>
      </ItemActions>
    </Item>
  );
}
