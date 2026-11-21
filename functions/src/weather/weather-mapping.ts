import {
  getPeriodHours,
  isForecastRain,
  type Period,
  type PeriodForecast,
} from '@vai-chover/shared';
import type { HourlyWeather } from './open-meteo-client';

type Series = 'precipitationProbability' | 'precipitation';

/** Valores das 6 horas do período; `null` se faltar alguma hora ou houver valor nulo. */
function periodValues(
  hourly: HourlyWeather,
  localDate: string,
  period: Period,
  series: Series,
): number[] | null {
  const values: number[] = [];
  for (const hour of getPeriodHours(period)) {
    const index = hourly.time.indexOf(`${localDate}T${String(hour).padStart(2, '0')}:00`);
    const value = index >= 0 ? hourly[series][index] : null;
    if (value === null || value === undefined) {
      return null;
    }
    values.push(value);
  }
  return values;
}

/** Probabilidade do período = máximo horário; `willRain` a partir de 50% (FR-018). */
export function mapForecast(
  hourly: HourlyWeather,
  localDate: string,
  periods: Period[],
): Partial<Record<Period, PeriodForecast>> {
  const result: Partial<Record<Period, PeriodForecast>> = {};
  for (const period of periods) {
    const values = periodValues(hourly, localDate, period, 'precipitationProbability');
    if (values) {
      const probability = Math.round(Math.max(...values));
      result[period] = { probability, willRain: isForecastRain(probability) };
    }
  }
  return result;
}

/** Precipitação total (mm) no período, ou `null` se indisponível. */
export function sumPrecipitation(
  hourly: HourlyWeather,
  localDate: string,
  period: Period,
): number | null {
  const values = periodValues(hourly, localDate, period, 'precipitation');
  if (!values) {
    return null;
  }
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}
