import { toSaoPauloDate } from "./connectionStatus";
import type { BankAccount, BankTransaction } from "./pluggy";

const FOREIGN_ACCOUNT_PREFIX = "sandbox-conta-global-";

export function sandboxForeignAccount(itemId: string): BankAccount {
  return {
    externalId: `${FOREIGN_ACCOUNT_PREFIX}${itemId}`,
    name: "Conta Global",
    type: "bank",
    currency: "USD",
  };
}

export function isSandboxForeignAccount(accountId: string) {
  return accountId.startsWith(FOREIGN_ACCOUNT_PREFIX);
}

export function sandboxForeignTransactions(accountId: string, nowMs: number): BankTransaction[] {
  const [year, month] = toSaoPauloDate(nowMs).split("-").map(Number);
  return [1, 0].map((monthsAgo) => {
    const postedAt = new Date(Date.UTC(year, month - 1 - monthsAgo, 1, 3)).toISOString();
    return {
      externalId: `${accountId}-${postedAt.slice(0, 7)}`,
      postedAt,
      description: "WISE PAYMENTS ACME LLC",
      amountCents: 300000,
      direction: "credit",
      currency: "USD",
      status: "posted",
    };
  });
}
