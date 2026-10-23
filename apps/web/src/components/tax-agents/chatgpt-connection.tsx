import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button, buttonVariants } from "@my-better-t-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@my-better-t-app/ui/components/item";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState, useTransition } from "react";

import Loader from "@/components/loader";

export function ChatgptConnection() {
  const account = useQuery(api.chatgpt.account);
  const startLogin = useAction(api.chatgpt.startLogin);
  const disconnect = useMutation(api.chatgpt.disconnect);
  const [isConsenting, setIsConsenting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      await startLogin();
      setIsConsenting(false);
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnect();
    });
  }

  if (account === undefined) return <Loader />;

  if (isConsenting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usar seu ChatGPT nos agentes fiscais?</CardTitle>
          <CardDescription>Continue só se concordar com tudo abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
        <CardFooter>
          <div className="flex gap-2">
            <Button disabled={isPending} onClick={handleContinue}>
              Continuar
            </Button>
            <Button variant="ghost" disabled={isPending} onClick={() => setIsConsenting(false)}>
              Cancelar
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (account.status === "pending") {
    return (
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Digite o código {account.userCode}</ItemTitle>
          <ItemDescription>
            Abra a página da OpenAI e digite este código para conectar.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <a
            href={account.verificationUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants()}
          >
            Abrir OpenAI
          </a>
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
          <Button onClick={() => setIsConsenting(true)}>Entrar de novo</Button>
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
        <Button variant="outline" onClick={() => setIsConsenting(true)}>
          Entrar com ChatGPT
        </Button>
      </ItemActions>
    </Item>
  );
}
