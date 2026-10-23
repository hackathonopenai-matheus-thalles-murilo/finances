import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Card } from "@my-better-t-app/ui/components/card";
import { useQuery } from "convex/react";
import { Landmark } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import Loader from "@/components/loader";

import { ConnectionItem } from "./connection-item";

export function ConnectionList() {
  const connections = useQuery(api.connections.list);

  if (connections === undefined) return <Loader />;

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={Landmark}
        title="Nenhuma conexão"
        description="Conecte seus bancos e corretoras pelo Open Finance para começarmos."
      />
    );
  }

  return (
    <Card size="flush">
      {connections.map((connection) => (
        <ConnectionItem key={connection.connectionId} connection={connection} />
      ))}
    </Card>
  );
}
