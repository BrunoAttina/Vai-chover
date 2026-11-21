import { useCallback, useState } from 'react';
import type { ResolveRegionOutput } from '@vai-chover/shared';
import { ApiError, toUserMessage, type Api } from '../services/api';
import { getApi } from '../services/firebase';
import { getCurrentLocation, type LocationResult } from '../services/location';

export type RegionStatus = 'idle' | 'locating' | 'resolved' | 'manual' | 'error';

interface Dependencies {
  api?: Pick<Api, 'resolveRegion'>;
  locate?: () => Promise<LocationResult>;
}

export interface UseRegion {
  status: RegionStatus;
  region: ResolveRegionOutput | null;
  error: string | null;
  /** Motivo de cair na escolha manual: permissão negada ou município não identificado. */
  manualReason: 'denied' | 'notFound' | 'unavailable' | null;
  locate: () => Promise<ResolveRegionOutput | null>;
  chooseManual: (ibgeCode: string) => Promise<ResolveRegionOutput | null>;
}

/** GPS → resolveRegion; se negado/indisponível ou não identificado, escolha manual (FR-008). */
export function useRegion({ api, locate = getCurrentLocation }: Dependencies = {}): UseRegion {
  const [status, setStatus] = useState<RegionStatus>('idle');
  const [region, setRegion] = useState<ResolveRegionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState<UseRegion['manualReason']>(null);

  const resolve = useCallback(
    async (input: Parameters<Api['resolveRegion']>[0]) => {
      try {
        const resolved = await (api ?? getApi()).resolveRegion(input);
        setRegion(resolved);
        setStatus('resolved');
        setError(null);
        return resolved;
      } catch (caught) {
        if (caught instanceof ApiError && caught.code === 'not-found') {
          setManualReason('notFound');
          setStatus('manual');
        } else {
          setError(toUserMessage(caught));
          setStatus(input.source === 'manual' ? 'manual' : 'error');
        }
        return null;
      }
    },
    [api],
  );

  const locateAndResolve = useCallback(async () => {
    setStatus('locating');
    setError(null);
    const location = await locate();
    if (location.status !== 'granted') {
      setManualReason(location.status);
      setStatus('manual');
      return null;
    }
    const { latitude, longitude, city, state } = location;
    return resolve({
      source: 'gps',
      latitude,
      longitude,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    });
  }, [locate, resolve]);

  const chooseManual = useCallback(
    (ibgeCode: string) => resolve({ source: 'manual', ibgeCode }),
    [resolve],
  );

  return { status, region, error, manualReason, locate: locateAndResolve, chooseManual };
}
