import { v, type Infer } from "convex/values";

export const calculation = v.object({
  amountCentavos: v.number(),
  dueOn: v.string(),
  dueOnSource: v.string(),
  lines: v.array(v.object({ label: v.string(), amountCentavos: v.number(), source: v.string() })),
  ruleTable: v.object({ name: v.string(), anoCalendario: v.number() }),
});

export type Calculation = Infer<typeof calculation>;

export type CalculationResult =
  | { status: "calculated"; calculation: Calculation }
  | { status: "unsupported"; reason: string };
