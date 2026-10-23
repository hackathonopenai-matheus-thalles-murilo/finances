import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Dialog } from "@my-better-t-app/ui/components/dialog";
import { useQuery } from "convex/react";

import Loader from "@/components/loader";

import { ChatgptAccountItem } from "./chatgpt-account-item";
import { ChatgptLoginDialog } from "./chatgpt-login-dialog";

export function ChatgptConnection() {
  const account = useQuery(api.chatgpt.account);

  if (account === undefined) return <Loader />;

  return (
    <Dialog>
      <ChatgptAccountItem account={account} />
      <ChatgptLoginDialog account={account} />
    </Dialog>
  );
}
