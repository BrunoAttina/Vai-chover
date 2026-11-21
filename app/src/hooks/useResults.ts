import { useEffect, useState } from 'react';
import type { Period, PeriodForecast } from '@vai-chover/shared';
import type { Api } from '../services/api';
import { getApi } from '../services/firebase';
import { fetchLastResult, subscribeTallies, type TallyCounts } from '../services/data';
import type { LastPeriodResult } from '../components/LastPeriodCard';

/** Contagens em tempo real (onSnapshot em `tallies`). */
export function useTallies(regionId: string, localDate: string, periods: Period[]): TallyCounts {
  const [counts, setCounts] = useState<TallyCounts>({});
  const key = periods.join(',');
  useEffect(
    () => subscribeTallies(regionId, localDate, key.split(',') as Period[], setCounts),
    [regionId, localDate, key],
  );
  return counts;
}

export type ForecastState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'ready'; periods: Partial<Record<Period, PeriodForecast>> };

export function useForecast(
  regionId: string,
  localDate: string,
  periods: Period[],
  api?: Pick<Api, 'getForecast'>,
): ForecastState {
  const [state, setState] = useState<ForecastState>({ status: 'loading' });
  const key = periods.join(',');
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    (api ?? getApi())
      .getForecast({ regionId, localDate, periods: key.split(',') as Period[] })
      .then((result) => {
        if (active) {
          setState(
            result.available
              ? { status: 'ready', periods: result.periods }
              : { status: 'unavailable' },
          );
        }
      })
      .catch(() => active && setState({ status: 'unavailable' }));
    return () => {
      active = false;
    };
  }, [api, regionId, localDate, key]);
  return state;
}

export function useLastResult(
  uid: string,
  load: (uid: string) => Promise<LastPeriodResult | null> = fetchLastResult,
): LastPeriodResult | null {
  const [result, setResult] = useState<LastPeriodResult | null>(null);
  useEffect(() => {
    let active = true;
    load(uid)
      .then((value) => active && setResult(value))
      .catch(() => active && setResult(null));
    return () => {
      active = false;
    };
  }, [uid, load]);
  return result;
}
