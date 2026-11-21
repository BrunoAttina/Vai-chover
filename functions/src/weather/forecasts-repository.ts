import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Period, PeriodForecast } from '@vai-chover/shared';
import { COLLECTIONS, ids } from '../infra/firestore';

export const FORECAST_CACHE_MS = 60 * 60 * 1000;
const FORECAST_TTL_MS = 2 * 24 * 60 * 60 * 1000;

/** Documento `forecasts/{regionId}_{localDate}` (data-model.md `forecasts.periods`, `forecasts.fetchedAt`, `forecasts.expiresAt`). */
export interface CachedForecast {
  periods: Partial<Record<Period, PeriodForecast>>;
  fetchedAt: Date;
}

export async function getCachedForecast(
  db: Firestore,
  regionId: string,
  localDate: string,
): Promise<CachedForecast | null> {
  const snapshot = await db
    .collection(COLLECTIONS.forecasts)
    .doc(ids.forecast(regionId, localDate))
    .get();
  if (!snapshot.exists) {
    return null;
  }
  const data = snapshot.data() as { periods: CachedForecast['periods']; fetchedAt: Timestamp };
  return { periods: data.periods, fetchedAt: data.fetchedAt.toDate() };
}

export async function saveForecast(
  db: Firestore,
  regionId: string,
  localDate: string,
  forecast: CachedForecast,
): Promise<void> {
  await db
    .collection(COLLECTIONS.forecasts)
    .doc(ids.forecast(regionId, localDate))
    .set({
      periods: forecast.periods,
      fetchedAt: Timestamp.fromDate(forecast.fetchedAt),
      expiresAt: Timestamp.fromMillis(forecast.fetchedAt.getTime() + FORECAST_TTL_MS),
    });
}
