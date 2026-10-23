import { v, type Infer } from "convex/values";

import { query } from "./_generated/server";
import { requireUserId } from "./lib/identity";
import { obligationSummary, summarize } from "./overview";

const guideFields = {
  guideId: v.id("guides"),
  obligation: obligationSummary,
  amountCentavos: v.number(),
  preparedAt: v.number(),
};

const guideRow = v.union(
  v.object({ ...guideFields, status: v.literal("awaitingApproval") }),
  v.object({ ...guideFields, status: v.literal("scheduled"), debitOn: v.string() }),
  v.object({ ...guideFields, status: v.literal("paid"), paidOn: v.string() }),
);

export type GuideRow = Infer<typeof guideRow>;

export const list = query({
  args: {},
  returns: v.array(guideRow),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const guides = await ctx.db
      .query("guides")
      .withIndex("by_user_status", (q) => q.eq("userId", userId))
      .collect();

    const rows = await Promise.all(
      guides.map(async (guide): Promise<GuideRow> => {
        const obligation = await ctx.db.get(guide.obligationId);
        if (obligation === null) {
          throw new Error(`Obligation ${guide.obligationId} not found`);
        }
        const fields = {
          guideId: guide._id,
          obligation: summarize(obligation),
          amountCentavos: guide.amountCentavos,
          preparedAt: guide.preparedAt,
        };
        if (guide.status === "scheduled") {
          return { ...fields, status: guide.status, debitOn: guide.debitOn };
        }
        if (guide.status === "paid") {
          return { ...fields, status: guide.status, paidOn: guide.paidOn };
        }
        return { ...fields, status: guide.status };
      }),
    );

    return rows.sort((a, b) => b.preparedAt - a.preparedAt);
  },
});
