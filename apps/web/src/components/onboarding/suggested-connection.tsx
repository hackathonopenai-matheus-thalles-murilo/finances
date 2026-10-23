import type { ConnectionSuggestion } from "@my-better-t-app/backend/convex/onboarding";

import { ConnectBankButton } from "@/components/connections/connect-bank-button";
import { accountCopy } from "@/lib/situation";

import { ConnectedAction } from "./connected-action";
import { ConnectionRow } from "./connection-row";

export type SuggestedConnectionProps = {
  suggestion: ConnectionSuggestion;
};

export function SuggestedConnection({ suggestion }: SuggestedConnectionProps) {
  const { situation, connection } = suggestion;
  const { title, description, icon } = accountCopy[situation];

  if (connection === null) {
    return (
      <ConnectionRow
        icon={icon}
        title={title}
        description={description}
        action={
          <ConnectBankButton situation={situation} variant="outline" size="sm">
            Escolher
          </ConnectBankButton>
        }
      />
    );
  }

  return (
    <ConnectionRow
      icon={icon}
      title={connection.institution}
      description={description}
      action={<ConnectedAction connectionId={connection.connectionId} />}
    />
  );
}
