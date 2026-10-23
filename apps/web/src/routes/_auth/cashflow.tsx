import { api } from "@my-better-t-app/backend/convex/_generated/api";
import { Button } from "@my-better-t-app/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-better-t-app/ui/components/card";
import { Input } from "@my-better-t-app/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import { FileUp, MessageCircle, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_auth/cashflow")({ component: CashflowPage });

type ImportedTransaction = {
  description: string;
  amountCentavos: number;
  type: "in" | "out";
  date: string;
  editable: boolean;
};

function money(amountCentavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    amountCentavos / 100,
  );
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
    new Date(`${date}T12:00:00`),
  );
}

function formatBrazilianPhone(value: string) {
  const trimmed = value.trim();
  let digits = value.replace(/\D/g, "");
  if (trimmed.startsWith("+55") || (digits.length > 11 && digits.startsWith("55"))) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);
  if (!digits) return "";

  const localNumber = digits.slice(2);
  const formattedLocalNumber =
    localNumber.length <= 4
      ? localNumber
      : localNumber.length <= 8
        ? `${localNumber.slice(0, 4)}-${localNumber.slice(4)}`
        : `${localNumber.slice(0, 5)}-${localNumber.slice(5)}`;
  const areaCode = digits.slice(0, 2);
  if (digits.length <= 2) return `+55 (${digits}`;
  return `+55 (${areaCode}) ${formattedLocalNumber}`;
}

function parseCsv(contents: string): ImportedTransaction[] {
  const [header, ...lines] = contents
    .trim()
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  if (header !== "descricao,valor,tipo,data,editavel") {
    throw new Error("Use as colunas descricao,valor,tipo,data,editavel.");
  }

  return lines.filter(Boolean).map((line) => {
    const [description, amount, type, date, editable] = line.split(",");
    const parsedAmount = /^(0|[1-9]\d*)(?:[,.](\d{1,2}))?$/.exec(amount ?? "");
    if (
      !description ||
      (type !== "in" && type !== "out") ||
      !/^2026-11-(0[1-9]|[12]\d|30)$/.test(date ?? "") ||
      !parsedAmount
    ) {
      throw new Error(`Linha inválida no CSV: ${line}`);
    }

    const amountCentavos =
      Number(parsedAmount[1]) * 100 + Number((parsedAmount[2] ?? "").padEnd(2, "0"));
    if (!Number.isSafeInteger(amountCentavos)) throw new Error(`Valor inválido no CSV: ${line}`);

    return { description, amountCentavos, type, date: date ?? "", editable: editable === "true" };
  });
}

export function CashflowPage() {
  const dashboard = useQuery(api.cashflow.getDashboard);
  const whatsappLink = useQuery(api.cashflowWhatsApp.getLinkStatus);
  const linkWhatsApp = useAction(api.cashflowWhatsApp.linkPhone);
  const unlinkWhatsApp = useAction(api.cashflowWhatsApp.unlinkPhone);
  const importTransactions = useMutation(api.cashflow.importTransactions);
  const loadDemo = useMutation(api.cashflow.loadDemo);
  const updateDate = useMutation(api.cashflow.updateDate);
  const [busy, setBusy] = useState(false);
  const [updatingWhatsAppLink, setUpdatingWhatsAppLink] = useState(false);
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState("");
  const [phoneInput, setPhoneInput] = useState<string | null>(null);

  async function saveWhatsAppPhone() {
    setLinkError("");
    setUpdatingWhatsAppLink(true);
    try {
      await linkWhatsApp({ phone: phoneInput ?? whatsappLink?.phone ?? "" });
    } catch (cause) {
      setLinkError(
        cause instanceof Error ? cause.message : "Não foi possível atualizar o vínculo.",
      );
    } finally {
      setUpdatingWhatsAppLink(false);
    }
  }

  async function removeWhatsAppLink() {
    setLinkError("");
    setUpdatingWhatsAppLink(true);
    try {
      await unlinkWhatsApp({});
      setPhoneInput(null);
    } catch (cause) {
      setLinkError(
        cause instanceof Error ? cause.message : "Não foi possível atualizar o vínculo.",
      );
    } finally {
      setUpdatingWhatsAppLink(false);
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await importTransactions({ transactions: parseCsv(await file.text()) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  if (dashboard === undefined)
    return <div className="p-8 text-sm text-muted-foreground">Carregando painel...</div>;
  const maximumBalance = Math.max(
    1,
    ...dashboard.timeline.map((day) => Math.abs(day.balanceCentavos)),
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            DEMO · NOVEMBRO 2026
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Painel de caixa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Simule atrasos e veja quando o caixa fica no vermelho.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90">
            <FileUp data-icon="inline-start" />
            {busy ? "Importando..." : "Importar CSV"}
            <input
              className="sr-only"
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
          </label>
          <Button variant="outline" onClick={() => void loadDemo()}>
            Carregar demo
          </Button>
          <a
            className="px-1 text-sm text-muted-foreground underline underline-offset-4"
            href="/movimentacoes-demo.csv"
            download
          >
            Baixar CSV
          </a>
        </div>
      </header>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>WhatsApp</CardTitle>
            <CardDescription>
              {whatsappLink === undefined
                ? "Verificando vínculo..."
                : whatsappLink.phone
                  ? "Este telefone está vinculado à sua conta."
                  : "Informe o telefone que enviará mensagens para o painel."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="Telefone do WhatsApp"
              autoComplete="tel"
              className="w-56"
              disabled={updatingWhatsAppLink || whatsappLink === undefined}
              onChange={(event) => setPhoneInput(formatBrazilianPhone(event.target.value))}
              placeholder="+55 (11) 99999-9999"
              type="tel"
              value={formatBrazilianPhone(phoneInput ?? whatsappLink?.phone ?? "")}
            />
            <Button
              variant="outline"
              disabled={whatsappLink === undefined || updatingWhatsAppLink}
              onClick={() => void saveWhatsAppPhone()}
            >
              {updatingWhatsAppLink ? "Salvando..." : "Salvar telefone"}
            </Button>
            {whatsappLink?.phone && (
              <Button
                variant="outline"
                disabled={updatingWhatsAppLink}
                onClick={() => void removeWhatsAppLink()}
              >
                {updatingWhatsAppLink ? "Desvinculando..." : "Desvincular"}
              </Button>
            )}
          </div>
        </CardHeader>
        {linkError && (
          <CardContent>
            <p role="alert" className="text-sm text-destructive">
              {linkError}
            </p>
          </CardContent>
        )}
      </Card>

      {dashboard.pendingChanges.map((change) => (
        <div
          key={change._id}
          className="flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
        >
          <MessageCircle className="size-4 text-amber-700" />
          <p>
            <strong>Aguardando confirmação pelo WhatsApp:</strong> {change.description},{" "}
            {displayDate(change.oldDate)} → {displayDate(change.newDate)}.
          </p>
        </div>
      ))}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Entradas" value={money(dashboard.totalInCentavos)} />
        <Metric title="Saídas" value={money(dashboard.totalOutCentavos)} />
        <Metric title="Saldo projetado" value={money(dashboard.projectedBalanceCentavos)} />
        <Metric
          title="Período no vermelho"
          value={
            dashboard.affectedPeriod
              ? `${displayDate(dashboard.affectedPeriod.start)} – ${displayDate(dashboard.affectedPeriod.end)}`
              : "Nenhum"
          }
          detail={
            dashboard.affectedPeriod
              ? `Mínima: ${money(dashboard.affectedPeriod.lowestBalanceCentavos)}`
              : undefined
          }
        />
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Saldo previsto por dia</CardTitle>
            <CardDescription>O destaque vermelho indica dias com saldo negativo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {dashboard.timeline.map((day) => (
              <div
                key={day.date}
                className="grid grid-cols-[56px_1fr_100px] items-center gap-3 text-xs"
              >
                <span className="text-muted-foreground">{displayDate(day.date)}</span>
                <span className="h-2 rounded-full bg-muted">
                  <span
                    className={`block h-2 rounded-full ${day.balanceCentavos < 0 ? "bg-destructive" : "bg-primary"}`}
                    style={{
                      width: `${Math.max(3, (Math.abs(day.balanceCentavos) / maximumBalance) * 100)}%`,
                    }}
                  />
                </span>
                <span
                  className={`text-right tabular-nums ${day.balanceCentavos < 0 ? "font-medium text-destructive" : "text-muted-foreground"}`}
                >
                  {money(day.balanceCentavos)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentações</CardTitle>
            <CardDescription>
              As datas alteradas no WhatsApp ou aqui aparecem nos dois canais.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {dashboard.transactions.map((transaction) => (
              <div
                key={transaction._id}
                className="flex min-h-11 items-center gap-3 border-b pb-2 last:border-0"
              >
                <span
                  className={
                    transaction.type === "in" ? "text-emerald-700" : "text-muted-foreground"
                  }
                >
                  {transaction.type === "in" ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.type === "in" ? "+" : "−"}
                    {money(transaction.amountCentavos)}
                  </p>
                </div>
                {transaction.editable ? (
                  <Input
                    aria-label={`Data de ${transaction.description}`}
                    className="max-w-36"
                    type="date"
                    min="2026-11-01"
                    max="2026-11-30"
                    value={transaction.date}
                    onChange={(event) =>
                      void updateDate({ id: transaction._id, newDate: event.target.value })
                    }
                  />
                ) : (
                  <span className="w-24 text-right text-xs text-muted-foreground">
                    {displayDate(transaction.date)}
                  </span>
                )}
              </div>
            ))}
            {dashboard.transactions.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Importe um CSV ou carregue os dados da demonstração.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {detail && <p className="mt-1 text-xs text-destructive">{detail}</p>}
      </CardContent>
    </Card>
  );
}
