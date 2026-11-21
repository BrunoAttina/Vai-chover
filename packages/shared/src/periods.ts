import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { PERIODS, type LocalDate, type Period } from './types';

export { PERIODS };

/** Hora local de início de cada período; o fim é o início do próximo (noite termina às 24h). */
const PERIOD_START_HOUR: Record<Period, number> = {
  madrugada: 0,
  manha: 6,
  tarde: 12,
  noite: 18,
};
const HOURS_PER_PERIOD = 6;
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface LocalClock {
  localDate: LocalDate;
  period: Period;
}

export interface PeriodWindow {
  start: Date;
  end: Date;
}

export function getPeriodForHour(hour: number): Period {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`Invalid hour: ${hour}`);
  }
  const index = Math.floor(hour / HOURS_PER_PERIOD);
  return PERIODS[index] as Period;
}

/** Data local e período de um instante no fuso informado (madrugada pertence ao novo dia). */
export function getLocalClock(now: Date, timeZone: string): LocalClock {
  const localDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
  const hour = Number(formatInTimeZone(now, timeZone, 'H'));
  return { localDate, period: getPeriodForHour(hour) };
}

/** Período atual seguido dos períodos restantes do dia. */
export function getOfferedPeriods(current: Period): Period[] {
  return PERIODS.slice(PERIODS.indexOf(current));
}

/** Instantes (UTC) de início e fim de um período em uma data local e fuso. */
export function getPeriodWindow(
  localDate: LocalDate,
  period: Period,
  timeZone: string,
): PeriodWindow {
  if (!LOCAL_DATE_PATTERN.test(localDate)) {
    throw new RangeError(`Invalid local date: ${localDate}`);
  }
  const startHour = PERIOD_START_HOUR[period];
  const start = fromZonedTime(`${localDate}T${pad(startHour)}:00:00`, timeZone);
  const endHour = startHour + HOURS_PER_PERIOD;
  const end =
    endHour === 24
      ? fromZonedTime(`${addDays(localDate, 1)}T00:00:00`, timeZone)
      : fromZonedTime(`${localDate}T${pad(endHour)}:00:00`, timeZone);
  return { start, end };
}

export function hasPeriodEnded(
  localDate: LocalDate,
  period: Period,
  timeZone: string,
  now: Date,
): boolean {
  return now.getTime() >= getPeriodWindow(localDate, period, timeZone).end.getTime();
}

/** Horas locais (0–23) que compõem um período. */
export function getPeriodHours(period: Period): number[] {
  const start = PERIOD_START_HOUR[period];
  return Array.from({ length: HOURS_PER_PERIOD }, (_, offset) => start + offset);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function addDays(localDate: LocalDate, days: number): LocalDate {
  const date = new Date(`${localDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
