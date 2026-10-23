import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Card } from "@my-better-t-app/ui/components/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@my-better-t-app/ui/components/input-group";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/empty-state";
import Loader from "@/components/loader";

import { TaxAgentMessages } from "./tax-agent-messages";

export function TaxAgentChat() {
  const threadId = useQuery(api.taxAgent.thread);
  const account = useQuery(api.chatgpt.account);
  const send = useMutation(api.taxAgent.send);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      await send({ text });
      setText("");
    });
  }

  if (threadId === undefined || account === undefined) return <Loader />;

  const isChatgptExpired = account.status === "expired";

  return (
    <Card>
      <div className="h-[55vh] px-4">
        {threadId === null ? (
          <EmptyState
            icon={MessageSquare}
            title="Pergunte sobre seus impostos"
            description="O agente fiscal consulta seu perfil fiscal e suas obrigações para responder."
          />
        ) : (
          <TaxAgentMessages threadId={threadId} />
        )}
      </div>
      <form onSubmit={handleSubmit} className="px-4">
        <InputGroup>
          <InputGroupInput
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Pergunte ao agente fiscal"
            aria-label="Mensagem para o agente fiscal"
            required
            disabled={isChatgptExpired}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="submit"
              size="icon-xs"
              aria-label="Enviar"
              disabled={isPending || isChatgptExpired}
            >
              <Send />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </Card>
  );
}
