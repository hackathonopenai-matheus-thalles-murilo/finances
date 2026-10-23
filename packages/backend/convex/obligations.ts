import { v, type Infer } from "convex/values";

import { internalQuery, query, type QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/identity";
import { obligationSummary, summarize } from "./overview";

const obligationRow = v.object({
  obligationId: v.id("obligations"),
  obligation: obligationSummary,
  dueOn: v.optional(v.string()),
  amountCentavos: v.optional(v.number()),
  status: v.union(
    v.literal("upcoming"),
    v.literal("needsUser"),
    v.literal("awaitingApproval"),
    v.literal("scheduled"),
    v.literal("paid"),
  ),
});

export type ObligationRow = Infer<typeof obligationRow>;

export const list = query({
  args: { anoCalendario: v.number() },
  returns: v.array(obligationRow),
  handler: async (ctx, { anoCalendario }) =>
    obligationsOf(ctx, await requireUserId(ctx), anoCalendario),
});

export const listFor = internalQuery({
  args: { userId: v.string(), anoCalendario: v.number() },
  returns: v.array(obligationRow),
  handler: async (ctx, { userId, anoCalendario }) => obligationsOf(ctx, userId, anoCalendario),
});

async function obligationsOf(ctx: QueryCtx, userId: string, anoCalendario: number) {
  const obligations = await ctx.db
    .query("obligations")
    .withIndex("by_user_anoCalendario", (q) =>
      q.eq("userId", userId).eq("anoCalendario", anoCalendario),
    )
    .collect();

  const rows = await Promise.all(
    obligations.map(async (obligation) => {
      const guide = await ctx.db
        .query("guides")
        .withIndex("by_obligation", (q) => q.eq("obligationId", obligation._id))
        .first();
      return {
        obligationId: obligation._id,
        obligation: summarize(obligation),
        dueOn: obligation.dueOn,
        amountCentavos: guide?.amountCentavos,
        status: guide === null ? obligation.status : guide.status,
      };
    }),
  );

  return rows.sort(byDueOn);
}

function byDueOn(a: ObligationRow, b: ObligationRow) {
  if (a.dueOn === undefined) return 1;
  if (b.dueOn === undefined) return -1;
  return a.dueOn.localeCompare(b.dueOn);
}
