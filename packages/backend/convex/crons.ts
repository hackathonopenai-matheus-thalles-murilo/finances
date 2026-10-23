import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "sync live connections",
  { hourUTC: 9, minuteUTC: 0 },
  internal.connectionSync.syncLive,
);

export default crons;
