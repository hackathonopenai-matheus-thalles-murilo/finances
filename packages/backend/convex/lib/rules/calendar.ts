type NonBusinessDays = {
  dates: string[];
  source: string;
};

const nonBusinessDaysByYear: Record<number, NonBusinessDays> = {
  2025: {
    dates: [
      "2025-01-01",
      "2025-03-03",
      "2025-03-04",
      "2025-04-18",
      "2025-04-21",
      "2025-05-01",
      "2025-06-19",
      "2025-09-07",
      "2025-10-12",
      "2025-11-02",
      "2025-11-15",
      "2025-11-20",
      "2025-12-25",
    ],
    source:
      "Lei 662/1949; Lei 6.802/1980; Lei 14.759/2023; Resolução CMN 4.880/2020, art. 6º; calendário Febraban 2025",
  },
  2026: {
    dates: [
      "2026-01-01",
      "2026-02-16",
      "2026-02-17",
      "2026-04-03",
      "2026-04-21",
      "2026-05-01",
      "2026-06-04",
      "2026-09-07",
      "2026-10-12",
      "2026-11-02",
      "2026-11-15",
      "2026-11-20",
      "2026-12-25",
    ],
    source:
      "Lei 662/1949; Lei 6.802/1980; Lei 14.759/2023; Resolução CMN 4.880/2020, art. 6º; calendário Febraban 2026",
  },
  2027: {
    dates: [
      "2027-01-01",
      "2027-02-08",
      "2027-02-09",
      "2027-03-26",
      "2027-04-21",
      "2027-05-01",
      "2027-05-27",
      "2027-09-07",
      "2027-10-12",
      "2027-11-02",
      "2027-11-15",
      "2027-11-20",
      "2027-12-25",
    ],
    source:
      "Lei 662/1949; Lei 6.802/1980; Lei 14.759/2023; Resolução CMN 4.880/2020, art. 6º; Carnaval, Paixão e Corpus Christi pela Páscoa de 28/03/2027, a conferir com o calendário Febraban 2027",
  },
};

export function hasCalendar(year: number) {
  return nonBusinessDaysByYear[year] !== undefined;
}

export function calendarSource(year: number) {
  return calendarOf(year).source;
}

export function isPaymentDay(dateYYYYMMDD: string) {
  const weekday = new Date(`${dateYYYYMMDD}T12:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  if (dateYYYYMMDD.endsWith("-12-31")) return false;
  return !calendarOf(Number(dateYYYYMMDD.slice(0, 4))).dates.includes(dateYYYYMMDD);
}

export function previousPaymentDay(dateYYYYMMDD: string) {
  let date = dateYYYYMMDD;
  while (!isPaymentDay(date)) date = addDays(date, -1);
  return date;
}

export function nextPaymentDay(dateYYYYMMDD: string) {
  let date = dateYYYYMMDD;
  while (!isPaymentDay(date)) date = addDays(date, 1);
  return date;
}

export function dayOfFollowingMonth(year: number, month: number, day: number) {
  const following = new Date(Date.UTC(year, month, day));
  return following.toISOString().slice(0, 10);
}

export function lastDayOfFollowingMonth(year: number, month: number) {
  const following = new Date(Date.UTC(year, month + 1, 0));
  return following.toISOString().slice(0, 10);
}

function addDays(dateYYYYMMDD: string, days: number) {
  const date = new Date(`${dateYYYYMMDD}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function calendarOf(year: number) {
  const calendar = nonBusinessDaysByYear[year];
  if (calendar === undefined) {
    throw new Error(`No bank calendar for ${year}`);
  }
  return calendar;
}
