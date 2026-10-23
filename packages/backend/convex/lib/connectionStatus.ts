const SAO_PAULO = "America/Sao_Paulo";
const DAY_IN_MS = 86_400_000;
const EXPIRING_WITHIN_DAYS = 7;

export type ConsentState =
  | { status: "active" | "revoked"; expiresOn: string | undefined }
  | { status: "expiring" | "expired"; expiresOn: string };

export function toSaoPauloDate(timestampMs: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO }).format(timestampMs);
}

export function consentState(
  consent: { isRevoked: boolean; expiresOn: string | undefined },
  nowMs: number,
): ConsentState {
  const { isRevoked, expiresOn } = consent;
  if (isRevoked) return { status: "revoked", expiresOn };
  if (expiresOn === undefined) return { status: "active", expiresOn };
  if (expiresOn < toSaoPauloDate(nowMs)) return { status: "expired", expiresOn };
  if (expiresOn <= toSaoPauloDate(nowMs + EXPIRING_WITHIN_DAYS * DAY_IN_MS)) {
    return { status: "expiring", expiresOn };
  }
  return { status: "active", expiresOn };
}
