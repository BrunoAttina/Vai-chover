import { Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { isObservedRain, resolveAnalysisStatus } from '@vai-chover/shared';
import { COLLECTIONS } from '../infra/firestore';
import type { Deps } from '../infra/deps';
import { getRegion } from '../regions/regions-repository';
import type { HourlyWeather } from '../weather/open-meteo-client';
import { sumPrecipitation } from '../weather/weather-mapping';
import type { PeriodAnalysisDoc } from './analyses-repository';

export interface ObservationSummary {
  resolved: number;
  pending: number;
  providerErrors: number;
}

/** Etapa 2 do fechamento: obtém a chuva observada e define se a maioria acertou (FR-023, FR-024). */
export async function resolvePendingObservations(deps: Deps): Promise<ObservationSummary> {
  const now = deps.clock.now();
  const snapshot = await deps.db
    .collection(COLLECTIONS.periodAnalyses)
    .where('status', '==', 'pending')
    .get();

  const summary: ObservationSummary = { resolved: 0, pending: 0, providerErrors: 0 };
  for (const [key, group] of groupByRegionAndDate(snapshot.docs)) {
    const [regionId = '', localDate = ''] = key.split('_');
    const hourly = await fetchObserved(deps, regionId, localDate);
    if (!hourly) {
      summary.providerErrors += 1;
    }
    for (const doc of group) {
      const resolved = await applyObservation(doc, hourly, now);
      summary[resolved ? 'resolved' : 'pending'] += 1;
    }
  }
  return summary;
}

function groupByRegionAndDate(docs: QueryDocumentSnapshot[]): Map<string, QueryDocumentSnapshot[]> {
  const groups = new Map<string, QueryDocumentSnapshot[]>();
  for (const doc of docs) {
    const { regionId, localDate } = doc.data() as PeriodAnalysisDoc;
    const key = `${regionId}_${localDate}`;
    groups.set(key, [...(groups.get(key) ?? []), doc]);
  }
  return groups;
}

async function fetchObserved(
  deps: Deps,
  regionId: string,
  localDate: string,
): Promise<HourlyWeather | null> {
  const region = await getRegion(deps.db, regionId);
  if (!region) {
    return null;
  }
  try {
    return await deps.weather.fetchHourly({
      latitude: region.lat,
      longitude: region.lon,
      timezone: region.timezone,
      startDate: localDate,
      endDate: localDate,
    });
  } catch (error) {
    deps.logger.warn('weather.observationUnavailable', { error: (error as Error).name });
    return null;
  }
}

/** Retorna true quando a análise deixou de ser `pending`. */
async function applyObservation(
  doc: QueryDocumentSnapshot,
  hourly: HourlyWeather | null,
  now: Date,
): Promise<boolean> {
  const analysis = doc.data() as PeriodAnalysisDoc;
  const precipitation = hourly
    ? sumPrecipitation(hourly, analysis.localDate, analysis.period)
    : null;
  const observedRain = precipitation === null ? null : isObservedRain(precipitation);
  const status = resolveAnalysisStatus({
    crowdSaysRain: analysis.crowdSaysRain ?? false,
    observedRain,
    closedAt: analysis.closedAt.toDate(),
    now,
  });
  await doc.ref.update({
    observedPrecipitationMm: precipitation,
    observedRain,
    status,
    observationAttempts: analysis.observationAttempts + 1,
    resolvedAt: status === 'pending' ? null : Timestamp.fromDate(now),
  });
  return status !== 'pending';
}
