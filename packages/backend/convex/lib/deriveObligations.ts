import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { toSaoPauloDate } from "./connectionStatus";
import { dueOnFor } from "./rules/dueOn";

type MonthlyKind = "dasMei" | "carneLeao";

export function currentAnoCalendario() {
  return Number(toSaoPauloDate(Date.now()).slice(0, 4));
}

export async function obligationsOf(
  ctx: MutationCtx,
  userId: string,
  kind: MonthlyKind,
  anoCalendario: number,
) {
  const obligations = await ctx.db
    .query("obligations")
    .withIndex("by_user_anoCalendario", (q) =>
      q.eq("userId", userId).eq("anoCalendario", anoCalendario),
    )
    .collect();
  return obligations.filter((obligation) => obligation.kind === kind);
}

export async function ensureObligation(
  ctx: MutationCtx,
  userId: string,
  kind: MonthlyKind,
  anoCalendario: number,
  month: number,
  facts: Doc<"obligations">["facts"],
) {
  const existing = (await obligationsOf(ctx, userId, kind, anoCalendario)).find(
    (obligation) => obligation.month === month,
  );
  if (existing === undefined) {
    await ctx.db.insert("obligations", {
      userId,
      kind,
      anoCalendario,
      month,
      dueOn: dueOnFor(kind, anoCalendario, month),
      facts,
      status: "upcoming",
    });
    return;
  }
  if (existing.facts === undefined && facts !== undefined) {
    await ctx.db.patch(existing._id, { facts });
  }
}

export async function removeIfUntouched(ctx: MutationCtx, obligation: Doc<"obligations">) {
  if (obligation.status !== "upcoming" && obligation.status !== "needsUser") return;
  const guide = await ctx.db
    .query("guides")
    .withIndex("by_obligation", (q) => q.eq("obligationId", obligation._id))
    .first();
  if (guide !== null) return;
  await ctx.db.delete(obligation._id);
}
