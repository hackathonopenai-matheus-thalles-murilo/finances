import type { ObligationDetail } from "@my-better-t-app/backend/convex/obligations";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card";

import { formatDayMonth, formatMoney } from "@/lib/format";

export type ObligationCalculationProps = {
  calculation: ObligationDetail["calculation"];
};

export function ObligationCalculation({ calculation: result }: ObligationCalculationProps) {
  if (result.status === "unsupported") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Como calculamos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{result.reason}</p>
        </CardContent>
      </Card>
    );
  }

  const { lines, amountCentavos, dueOn, dueOnSource } = result.calculation;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Como calculamos</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.label} className="flex items-start justify-between gap-6">
              <div>
                <p>{line.label}</p>
                <p className="text-xs text-muted-foreground">{line.source}</p>
              </div>
              <span className="font-mono tabular-nums">{formatMoney(line.amountCentavos)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start justify-between gap-6">
          <div>
            <p className="font-medium">Total</p>
            <p className="text-xs text-muted-foreground">
              Vence em {formatDayMonth(dueOn)} · {dueOnSource}
            </p>
          </div>
          <span className="font-mono font-semibold tabular-nums">
            {formatMoney(amountCentavos)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
