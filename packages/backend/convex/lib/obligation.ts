import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function getOwnedObligation(
  ctx: QueryCtx,
  userId: string,
  obligationId: Id<"obligations">,
) {
  const obligation = await ctx.db.get(obligationId);
  if (obligation === null || obligation.userId !== userId) {
    throw new Error(`Obligation ${obligationId} not found`);
  }
  return obligation;
}

export function obligationIdFrom(ctx: QueryCtx, obligationId: string) {
  const id = ctx.db.normalizeId("obligations", obligationId);
  if (id === null) {
    throw new Error(`Obligation ${obligationId} not found`);
  }
  return id;
}

export async function getOwnedGuide(ctx: QueryCtx, userId: string, guideId: Id<"guides">) {
  const guide = await ctx.db.get(guideId);
  if (guide === null || guide.userId !== userId) {
    throw new Error(`Guide ${guideId} not found`);
  }
  return guide;
}

export async function currentGuide(ctx: QueryCtx, obligationId: Id<"obligations">) {
  const guides = await ctx.db
    .query("guides")
    .withIndex("by_obligation", (q) => q.eq("obligationId", obligationId))
    .order("desc")
    .collect();
  return guides.find((guide) => guide.status !== "canceled") ?? null;
}

export function obligationFields(obligation: Doc<"obligations">) {
  const { userId, kind, anoCalendario, month, dueOn, facts } = obligation;
  return { userId, kind, anoCalendario, month, dueOn, facts };
}

export function guideFields(guide: Doc<"guides">) {
  const { userId, obligationId, amountCentavos, calculation, document, preparedAt } = guide;
  return { userId, obligationId, amountCentavos, calculation, document, preparedAt };
}

export function displayStatus(obligation: Doc<"obligations">, guide: Doc<"guides"> | null) {
  if (guide === null || guide.status === "canceled") return obligation.status;
  return guide.status;
}
