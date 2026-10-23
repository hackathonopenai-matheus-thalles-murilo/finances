export type PaymentRequest = {
  barcode: string;
  amountCentavos: number;
  idempotencyKey: string;
};

export async function payGuide({ idempotencyKey }: PaymentRequest) {
  return { paymentProof: `SANDBOX-${idempotencyKey}` };
}
