import { z } from "zod";

import { requireEnv } from "./env";

const BASE_URL = "https://api.pluggy.ai";

export type SyncStatus = "syncing" | "synced" | "failed";

export type BankItem = {
  clientUserId: string | null;
  institution: string;
  sync: SyncStatus;
  isRevoked: boolean;
  expiresAt: string | null;
};

export type BankAccount = {
  externalId: string;
  name: string;
  type: "bank" | "credit";
  currency: string;
};

export type BankTransaction = {
  externalId: string;
  postedAt: string;
  description: string;
  amountCents: number;
  direction: "credit" | "debit";
  currency: string;
  status: "pending" | "posted";
};

const authSchema = z.object({ apiKey: z.string() });

const connectTokenSchema = z.object({ accessToken: z.string() });

const itemSchema = z.object({
  clientUserId: z.string().nullable(),
  status: z.enum(["UPDATED", "UPDATING", "LOGIN_ERROR", "OUTDATED", "WAITING_USER_INPUT"]),
  executionStatus: z.string(),
  connector: z.object({ name: z.string() }),
});

const consentSchema = z.object({
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});

type Consent = z.infer<typeof consentSchema>;

const consentsSchema = z.object({ results: z.array(consentSchema) });

const accountsSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["BANK", "CREDIT"]),
      name: z.string(),
      marketingName: z.string().nullable().optional(),
      currencyCode: z.string(),
    }),
  ),
});

const transactionSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  currencyCode: z.string(),
  date: z.string(),
  type: z.enum(["DEBIT", "CREDIT"]),
  status: z.enum(["PENDING", "POSTED"]),
});

const transactionsPageSchema = z.object({
  results: z.array(transactionSchema),
  next: z.string().nullable(),
});

const itemSync: Record<z.infer<typeof itemSchema>["status"], SyncStatus> = {
  UPDATED: "synced",
  UPDATING: "syncing",
  LOGIN_ERROR: "failed",
  OUTDATED: "failed",
  WAITING_USER_INPUT: "failed",
};

export function toBankTransaction(transaction: z.infer<typeof transactionSchema>): BankTransaction {
  return {
    externalId: transaction.id,
    postedAt: transaction.date,
    description: transaction.description,
    amountCents: Math.round(Math.abs(transaction.amount) * 100),
    direction: transaction.type === "CREDIT" ? "credit" : "debit",
    currency: transaction.currencyCode,
    status: transaction.status === "PENDING" ? "pending" : "posted",
  };
}

export class Pluggy {
  private constructor(private readonly apiKey: string) {}

  static async connect() {
    const response = await fetch(`${BASE_URL}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: requireEnv("PLUGGY_CLIENT_ID"),
        clientSecret: requireEnv("PLUGGY_CLIENT_SECRET"),
      }),
    });
    if (!response.ok) {
      throw new Error(`Pluggy auth failed with ${response.status}`);
    }
    const { apiKey } = authSchema.parse(await response.json());
    return new Pluggy(apiKey);
  }

  async createConnectToken(args: { clientUserId: string; itemId?: string; webhookUrl?: string }) {
    const { accessToken } = connectTokenSchema.parse(
      await this.request("/connect_token", {
        method: "POST",
        body: JSON.stringify({
          itemId: args.itemId,
          options: {
            clientUserId: args.clientUserId,
            webhookUrl: args.webhookUrl,
            avoidDuplicates: true,
          },
        }),
      }),
    );
    return accessToken;
  }

  async getItem(itemId: string): Promise<BankItem | null> {
    const response = await this.send(`/items/${itemId}`, { method: "GET" });
    if (response.status === 404) return null;
    const item = itemSchema.parse(await this.json(response));
    const { results: consents } = consentsSchema.parse(
      await this.request(`/consents?itemId=${itemId}`, { method: "GET" }),
    );
    const consent: Consent | undefined = consents.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )[0];

    return {
      clientUserId: item.clientUserId,
      institution: item.connector.name,
      sync: itemSync[item.status],
      isRevoked:
        item.executionStatus === "USER_AUTHORIZATION_REVOKED" ||
        (consent !== undefined && consent.revokedAt !== null),
      expiresAt: consent === undefined ? null : consent.expiresAt,
    };
  }

  async deleteItem(itemId: string) {
    const response = await this.send(`/items/${itemId}`, { method: "DELETE" });
    if (response.status === 404) return;
    await this.json(response);
  }

  async listAccounts(itemId: string): Promise<BankAccount[]> {
    const { results } = accountsSchema.parse(
      await this.request(`/accounts?itemId=${itemId}`, { method: "GET" }),
    );
    return results.map((account) => ({
      externalId: account.id,
      name: account.marketingName ?? account.name,
      type: account.type === "CREDIT" ? "credit" : "bank",
      currency: account.currencyCode,
    }));
  }

  async listTransactions(accountId: string, cursor: string | null) {
    const path = cursor ?? `?accountId=${accountId}`;
    const { results, next } = transactionsPageSchema.parse(
      await this.request(`/v2/transactions${path}`, { method: "GET" }),
    );
    return { transactions: results.map(toBankTransaction), cursor: next };
  }

  private async request(path: string, init: RequestInit) {
    return this.json(await this.send(path, init));
  }

  private send(path: string, init: RequestInit) {
    return fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-API-KEY": this.apiKey },
    });
  }

  private async json(response: Response): Promise<unknown> {
    if (!response.ok) {
      throw new Error(`Pluggy ${response.url} failed with ${response.status}`);
    }
    return response.json();
  }
}
