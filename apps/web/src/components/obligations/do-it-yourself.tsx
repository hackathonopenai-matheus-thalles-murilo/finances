import type { ObligationDetail } from "@my-better-t-app/backend/convex/obligations";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card";
import { ExternalLink } from "lucide-react";

import { formatMoney } from "@/lib/format";

import { DoneByUser } from "./done-by-user";
import { MarkDoneForm } from "./mark-done-form";

export type DoItYourselfProps = {
  detail: ObligationDetail;
};

export function DoItYourself({ detail }: DoItYourselfProps) {
  const { obligationId, state, guide, calculation, instructions } = detail;
  const { portal, access, documents, steps, deadline } = instructions;
  const isPaidByUs = guide?.status === "scheduled" || guide?.status === "paid";
  const canMarkDone = !isPaidByUs && (state.status === "upcoming" || state.status === "needsUser");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fazer por conta própria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <div>
            <a
              href={portal.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              {portal.name}
              <ExternalLink className="size-3.5" />
            </a>
            <p className="text-muted-foreground">{access}</p>
          </div>
          {documents.length > 0 && (
            <div>
              <p className="font-medium">Tenha em mãos</p>
              <ul className="mt-1 list-disc pl-5">
                {documents.map((document) => (
                  <li key={document}>{document}</li>
                ))}
              </ul>
            </div>
          )}
          <ol className="list-decimal space-y-1.5 pl-5">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div>
            <p>{deadline.text}</p>
            {deadline.source && <p className="text-xs text-muted-foreground">{deadline.source}</p>}
          </div>
          {calculation.status === "calculated" && (
            <div>
              <p className="font-medium">Valores para preencher</p>
              <ul className="mt-1 flex flex-col gap-1">
                {calculation.calculation.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-6">
                    {line.label}
                    <span className="font-mono tabular-nums">
                      {formatMoney(line.amountCentavos)}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between gap-6 font-medium">
                  Total
                  <span className="font-mono tabular-nums">
                    {formatMoney(calculation.calculation.amountCentavos)}
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      {state.status === "doneByUser" && (
        <CardFooter>
          <DoneByUser obligationId={obligationId} doneOn={state.doneOn} proofUrl={state.proofUrl} />
        </CardFooter>
      )}
      {canMarkDone && (
        <CardFooter>
          <MarkDoneForm obligationId={obligationId} />
        </CardFooter>
      )}
    </Card>
  );
}
