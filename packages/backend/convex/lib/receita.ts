import type { Infer } from "convex/values";

import type { receitaDocument } from "../schema";

export type ReceitaDocument = Infer<typeof receitaDocument>;

export type GuideRequest = {
  kind: "dasMei" | "dasSimples" | "carneLeao";
  anoCalendario: number;
  month: number;
  amountCentavos: number;
  dueOn: string;
  idempotencyKey: string;
};

const BENEFICIARY = "Receita Federal do Brasil";

export async function issueGuide(request: GuideRequest): Promise<ReceitaDocument> {
  const digits = (await sha256(request.idempotencyKey)).replace(/\D/g, "").padEnd(40, "0");
  const number = `07${digits.slice(0, 15)}`;
  const barcode = `858${digits.slice(15, 26)}${String(request.amountCentavos).padStart(11, "0")}0`;
  const { amountCentavos, dueOn } = request;
  const hash = await documentHash({ ...request, number, barcode });
  return { number, barcode, amountCentavos, dueOn, hash };
}

async function documentHash(
  document: Omit<GuideRequest, "idempotencyKey"> & { number: string; barcode: string },
) {
  const { kind, anoCalendario, month, amountCentavos, dueOn, number, barcode } = document;
  return sha256(
    JSON.stringify({
      beneficiary: BENEFICIARY,
      kind,
      anoCalendario,
      month,
      amountCentavos,
      dueOn,
      number,
      barcode,
    }),
  );
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
