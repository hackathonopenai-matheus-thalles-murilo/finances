import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";

export function GuidePreview() {
  return (
    <div aria-hidden inert className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">DARF · Carnê-leão</p>
          <p className="mt-1 text-[15px] font-semibold">Setembro de 2026</p>
        </div>
        <Badge variant="warning">Aguardando você</Badge>
      </div>
      <p className="mt-6 font-mono text-[34px] font-semibold tracking-tight tabular-nums">
        R$ 1.284,50
      </p>
      <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t pt-4 text-sm">
        <dt className="text-muted-foreground">Vencimento</dt>
        <dd className="text-right font-mono tabular-nums">30/10/2026</dd>
        <dt className="text-muted-foreground">Calculado a partir de</dt>
        <dd className="text-right">4 recebimentos do exterior</dd>
      </dl>
      <div className="mt-6 flex gap-2">
        <Button>Aprovar pagamento</Button>
        <Button variant="outline">Ver cálculo</Button>
      </div>
    </div>
  );
}
