const SAO_PAULO = "America/Sao_Paulo";
const DAY_IN_MS = 86_400_000;

export function formatMoney(minorUnits: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(minorUnits / 100);
}

export function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO }).format(new Date());
}

export function currentAnoCalendario() {
  return Number(todayInSaoPaulo().slice(0, 4));
}

export function daysUntil(dateYYYYMMDD: string) {
  return (Date.parse(dateYYYYMMDD) - Date.parse(todayInSaoPaulo())) / DAY_IN_MS;
}

export function formatDayMonth(dateYYYYMMDD: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(Date.parse(dateYYYYMMDD));
}

export function formatWeekdayDayMonth(dateYYYYMMDD: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(Date.parse(dateYYYYMMDD));
}

export function formatTimestampDayMonth(timestampMs: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: SAO_PAULO,
  }).format(timestampMs);
}

export function monthName(month: number) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
    Date.UTC(2000, month - 1, 15),
  );
}

export function shortMonthName(month: number) {
  return monthName(month).slice(0, 3);
}

export function formatDay(dateYYYYMMDD: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", timeZone: "UTC" }).format(
    Date.parse(dateYYYYMMDD),
  );
}

export function formatShortMonth(dateYYYYMMDD: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" })
    .format(Date.parse(dateYYYYMMDD))
    .slice(0, 3);
}

export function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: SAO_PAULO,
    }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatDaysUntil(days: number) {
  if (days < 0) return "vencido";
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}
