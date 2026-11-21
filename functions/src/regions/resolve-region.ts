import { HttpsError } from 'firebase-functions/v2/https';
import {
  getLocalClock,
  listMunicipalitiesInput,
  resolveRegionInput,
  type ListMunicipalitiesOutput,
  type ResolveRegionOutput,
} from '@vai-chover/shared';
import { parseInput } from '../infra/errors';
import { requireSession, type AuthContext } from '../infra/session-guard';
import { setLastRegion } from '../infra/users-repository';
import type { Deps } from '../infra/deps';
import {
  findByCode,
  findMunicipality,
  isInsideBrazil,
  listByState,
  loadMunicipalities,
  type Municipality,
} from './municipality-matcher';
import { ensureRegion } from './regions-repository';

/** Identifica o município da pessoa. Coordenadas são usadas só aqui e nunca persistidas (FR-028). */
export async function resolveRegion(
  deps: Deps,
  auth: AuthContext | undefined,
  data: unknown,
  municipalities: Municipality[] = loadMunicipalities(),
): Promise<ResolveRegionOutput> {
  const now = deps.clock.now();
  const uid = requireSession(auth, now);
  const input = parseInput(resolveRegionInput, data);

  let municipality: Municipality | null;
  if (input.source === 'gps') {
    if (!isInsideBrazil(input.latitude, input.longitude)) {
      throw new HttpsError('invalid-argument', 'Location outside Brazil.', {
        fields: ['latitude'],
      });
    }
    municipality = findMunicipality(municipalities, input);
  } else {
    municipality = findByCode(municipalities, input.ibgeCode);
  }
  if (!municipality) {
    throw new HttpsError('not-found', 'Municipality not found.');
  }

  const region = await ensureRegion(deps.db, municipality);
  await setLastRegion(deps.db, uid, region.id);
  const { localDate, period } = getLocalClock(now, region.timezone);
  return {
    regionId: region.id,
    name: region.name,
    state: region.state,
    timezone: region.timezone,
    currentPeriod: period,
    localDate,
    serverNow: now.toISOString(),
  };
}

export async function listMunicipalities(
  deps: Deps,
  auth: AuthContext | undefined,
  data: unknown,
  municipalities: Municipality[] = loadMunicipalities(),
): Promise<ListMunicipalitiesOutput> {
  requireSession(auth, deps.clock.now());
  const input = parseInput(listMunicipalitiesInput, data);
  return {
    items: listByState(municipalities, input.state).map((m) => ({
      ibgeCode: m.ibgeCode,
      name: m.name,
    })),
  };
}
