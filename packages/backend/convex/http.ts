import { httpRouter } from "convex/server";
import { z } from "zod";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const pluggyEvent = z.object({ event: z.string(), itemId: z.string().optional() });

const http = httpRouter();

http.route({
  path: "/pluggy/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = pluggyEvent.safeParse(await request.json());
    if (!body.success) return new Response(null, { status: 400 });
    if (body.data.itemId === undefined) return new Response(null, { status: 204 });

    await ctx.runMutation(internal.connectionSync.onItemEvent, { externalId: body.data.itemId });
    return new Response(null, { status: 204 });
  }),
});

export default http;
