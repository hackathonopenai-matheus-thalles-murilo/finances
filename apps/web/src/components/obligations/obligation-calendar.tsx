import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";
import { Card } from "@my-better-t-app/ui/components/card";
import type { ObligationRow } from "@my-better-t-app/backend/convex/obligations";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { obligationLabel } from "@/lib/obligation";
import { formatMoney, todayInSaoPaulo } from "@/lib/format";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const statusLabel: Record<ObligationRow["status"], string> = {
  upcoming: "Em breve",
  needsUser: "Precisa de você",
  awaitingApproval: "Aguardando aprovação",
  scheduled: "Agendado",
  paid: "Pago",
};

const statusVariant: Record<
  ObligationRow["status"],
  "default" | "success" | "warning" | "secondary"
> = {
  upcoming: "secondary",
  needsUser: "warning",
  awaitingApproval: "default",
  scheduled: "success",
  paid: "success",
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function displayDate(date: Date) {
  const label = weekdayFormatter.format(date);
  return `${label.slice(0, 1).toLocaleUpperCase("pt-BR")}${label.slice(1)}`;
}

function hasDueDate(item: ObligationRow): item is ObligationRow & { dueOn: string } {
  return item.dueOn !== undefined;
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const total = Math.ceil((offset + count) / 7) * 7;
  return Array.from(
    { length: total },
    (_, index) => new Date(first.getFullYear(), first.getMonth(), index - offset + 1, 12),
  );
}

export type ObligationCalendarProps = {
  obligations: ObligationRow[];
};

export function ObligationCalendar({ obligations }: ObligationCalendarProps) {
  const today = dateFromKey(todayInSaoPaulo());
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12),
  );
  const itemsByDate = new Map<string, ObligationRow[]>();
  for (const item of obligations) {
    if (!item.dueOn) continue;
    const items = itemsByDate.get(item.dueOn) ?? [];
    items.push(item);
    itemsByDate.set(item.dueOn, items);
  }
  const selectedItems = itemsByDate.get(dateKey(selectedDate)) ?? [];
  const upcoming = obligations
    .filter(hasDueDate)
    .filter((item) => item.dueOn >= dateKey(selectedDate))
    .slice(0, 4);
  const days = monthDays(month);

  function changeMonth(offset: number) {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(nextMonth);
    setSelectedDate(nextMonth);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              aria-label="Mês anterior"
              variant="outline"
              size="icon-sm"
              onClick={() => changeMonth(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              aria-label="Próximo mês"
              variant="outline"
              size="icon-sm"

              onClick={() => changeMonth(1)}
            >
              <ChevronRight />
            </Button>
          </div>
          <h2 className="min-w-36 text-lg font-semibold tracking-tight capitalize">
            {monthFormatter.format(month)}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
              setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12));
            }}
          >
            Hoje
          </Button>
        </div>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="size-4" /> Datas informadas para suas obrigações
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card size="flush">
          <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            {weekdays.map((day) => (
              <div className="py-2.5" key={day}>
                {day}
              </div>
            ))}
          </div>
          <div
            className="grid h-[calc(100%-38px)] min-h-[460px] grid-cols-7"
            style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
          >
            {days.map((day) => {
              const isMonth = day.getMonth() === month.getMonth();
              const isSelected = dateKey(day) === dateKey(selectedDate);
              const items = itemsByDate.get(dateKey(day)) ?? [];
              return (
                <button
                  key={dateKey(day)}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  aria-label={`${displayDate(day)}${items.length ? `, ${items.length} obrigações` : ""}`}
                  aria-pressed={isSelected}
                  className={`min-w-0 border-r border-b p-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary ${!isMonth ? "text-muted-foreground/55" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <span
                    className={`mb-1 grid size-6 place-items-center rounded-full font-mono text-xs tabular-nums ${isSelected ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {day.getDate()}
                  </span>
                  <span className="flex flex-col gap-1">
                    {items.slice(0, 2).map((item) => (
                      <span
                        key={item.obligationId}
                        className={`truncate rounded-sm border-l-2 px-1 py-0.5 text-[10px] leading-tight ${item.status === "paid" || item.status === "scheduled" ? "border-emerald-700 bg-emerald-50 text-emerald-800" : item.status === "needsUser" ? "border-amber-700 bg-amber-50 text-amber-800" : item.status === "awaitingApproval" ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/50 bg-muted text-muted-foreground"}`}
                      >
                        {obligationLabel(item.obligation)}
                      </span>
                    ))}
                    {items.length > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{items.length - 2}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card size="flush">
            <div className="flex flex-col p-4">
              <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Dia selecionado
              </p>
              <h3 className="mt-1 text-base font-semibold tracking-tight">
                {displayDate(selectedDate)}
              </h3>
              {selectedItems.length ? (
                selectedItems.map((item) => (
                  <div className="border-t py-3 first:mt-3" key={item.obligationId}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{obligationLabel(item.obligation)}</p>
                      <Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge>
                    </div>
                    {item.amountCentavos !== undefined && (
                      <p className="mt-2 font-mono text-xs tabular-nums">
                        {formatMoney(item.amountCentavos)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                  Nenhuma obrigação com vencimento nesta data.
                </p>
              )}
            </div>
          </Card>
          <Card size="flush">
            <div className="flex flex-col p-4">
              <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                Próximas datas
              </p>
              {upcoming.length ? (
                upcoming.map((item) => (
                  <button
                    type="button"
                    onClick={() => {
                      const date = dateFromKey(item.dueOn);
                      setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
                      setSelectedDate(date);
                    }}
                    className="w-full border-t py-3 text-left first:mt-2 hover:bg-muted/30"
                    key={item.obligationId}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {obligationLabel(item.obligation)}
                      </span>
                      <Badge variant={statusVariant[item.status]}>
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          timeZone: "UTC",
                        }).format(Date.parse(item.dueOn))}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {statusLabel[item.status]}
                    </span>
                  </button>
                ))
              ) : (
                <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                  Nenhuma data futura para este ano-calendário.
                </p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
