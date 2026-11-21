import { HttpsError } from 'firebase-functions/v2/https';
import { getForecastInput, type GetForecastOutput, type Period } from '@vai-chover/shared';
import { parseInput } from '../infra/errors';
import { requireSession, type AuthContext } from '../infra/session-guard';
import type { Deps } from '../infra/deps';
import { getRegion } from '../regions/regions-repository';
import {
  FORECAST_CACHE_MS,
  getCachedForecast,
  saveForecast,
  type CachedForecast,
} from './forecasts-repository';
import { mapForecast } from './weather-mapping';
import { PERIODS } from '@vai-chover/shared';

/** Previsão oficial por período, com cache de 60 min. Falha do provedor → `available: false` (FR-019). */
export async function getForecast(
  deps: Deps,
  auth: AuthContext | undefined,
  data: unknown,
): Promise<GetForecastOutput> {
  const now = deps.clock.now();
  requireSession(auth, now);
  const input = parseInput(getForecastInput, data);
  const region = await getRegion(deps.db, input.regionId);
  if (!region) {
    throw new HttpsError('not-found', 'Region not found.');
  }

  const cached = await getCachedForecast(deps.db, region.id, input.localDate);
  if (cached && isFresh(cached, now) && covers(cached, input.periods)) {
    return toOutput(cached, input.periods);
  }

  try {
    const hourly = await deps.weather.fetchHourly({
      latitude: region.lat,
      longitude: region.lon,
      timezone: region.timezone,
      startDate: input.localDate,
      endDate: input.localDate,
    });
    const fresh: CachedForecast = {
      periods: mapForecast(hourly, input.localDate, [...PERIODS]),
      fetchedAt: now,
    };
    await saveForecast(deps.db, region.id, input.localDate, fresh);
    return covers(fresh, input.periods) ? toOutput(fresh, input.periods) : { available: false };
  } catch (error) {
    deps.logger.warn('weather.forecastUnavailable', { error: (error as Error).name });
    return { available: false };
  }
}

function isFresh(forecast: CachedForecast, now: Date): boolean {
  return now.getTime() - forecast.fetchedAt.getTime() < FORECAST_CACHE_MS;
}

function covers(forecast: CachedForecast, periods: Period[]): boolean {
  return periods.every((period) => forecast.periods[period] !== undefined);
}

function toOutput(forecast: CachedForecast, periods: Period[]): GetForecastOutput {
  const selected: CachedForecast['periods'] = {};
  for (const period of periods) {
    const value = forecast.periods[period];
    if (value) {
      selected[period] = value;
    }
  }
  return { available: true, periods: selected, fetchedAt: forecast.fetchedAt.toISOString() };
}
