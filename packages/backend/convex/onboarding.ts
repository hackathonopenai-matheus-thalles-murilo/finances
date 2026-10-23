import { v, type Infer } from "convex/values";

import { query } from "./_generated/server";
import { requireUserId } from "./lib/identity";
import { getProfile } from "./lib/profile";

const accountSituation = v.union(
  v.literal("salary"),
  v.literal("foreignIncome"),
  v.literal("company"),
  v.literal("investments"),
  v.literal("rent"),
);

const accountSituations = accountSituation.members.map((member) => member.value);

const connectedInstitution = v.object({
  connectionId: v.id("connections"),
  institution: v.string(),
});

const suggestion = v.object({
  situation: accountSituation,
  connection: v.union(v.null(), connectedInstitution),
});

export type AccountSituation = Infer<typeof accountSituation>;
export type ConnectionSuggestion = Infer<typeof suggestion>;

export const connections = query({
  args: {},
  returns: v.object({
    suggestions: v.array(suggestion),
    others: v.array(connectedInstitution),
  }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const profile = await getProfile(ctx, userId);
    const situations = profile === null ? [] : profile.situations;
    const connections = await ctx.db
      .query("connections")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
      .collect();

    const suggestions = accountSituations
      .filter((candidate) => situations.includes(candidate))
      .map((candidate) => {
        const connection = connections.find((c) => c.situations.includes(candidate));
        if (connection === undefined) return { situation: candidate, connection: null };
        return {
          situation: candidate,
          connection: { connectionId: connection._id, institution: connection.institution },
        };
      });

    const others = connections
      .filter((connection) =>
        suggestions.every((s) => s.connection?.connectionId !== connection._id),
      )
      .map((connection) => ({
        connectionId: connection._id,
        institution: connection.institution,
      }));

    return { suggestions, others };
  },
});
