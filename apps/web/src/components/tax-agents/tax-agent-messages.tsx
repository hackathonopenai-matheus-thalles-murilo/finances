import { type UIMessage, useUIMessages } from "@convex-dev/agent/react";
import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Bubble, BubbleContent } from "@my-better-t-app/ui/components/bubble";
import { Message, MessageContent } from "@my-better-t-app/ui/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@my-better-t-app/ui/components/message-scroller";

function messageText({ status, text }: UIMessage) {
  if (status === "failed") return "Não consegui responder agora. Tente de novo.";
  if (text === "") return "Pensando…";
  return text;
}

export type TaxAgentMessagesProps = {
  threadId: string;
};

export function TaxAgentMessages({ threadId }: TaxAgentMessagesProps) {
  const { results: messages } = useUIMessages(
    api.taxAgent.messages,
    { threadId },
    { initialNumItems: 30, stream: true },
  );

  return (
    <MessageScrollerProvider>
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <MessageScrollerItem key={message.key}>
                  <Message align={isUser ? "end" : "start"}>
                    <MessageContent>
                      <Bubble
                        variant={isUser ? "default" : "muted"}
                        align={isUser ? "end" : "start"}
                      >
                        <BubbleContent>
                          <p className="whitespace-pre-line">{messageText(message)}</p>
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              );
            })}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
