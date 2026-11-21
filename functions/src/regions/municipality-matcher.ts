import rawMunicipalities from '../data/municipios.json';

export interface Municipality {
  ibgeCode: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  timezone: string;
}

interface RawMunicipality {
  c: string;
  n: string;
  u: string;
  la: number;
  lo: number;
  tz: string;
}

export interface LocationQuery {
  latitude: number;
  longitude: number;
  city?: string | undefined;
  state?: string | undefined;
}

/** Distância máxima (km) até o centróide para o fallback por proximidade. */
const MAX_NEAREST_DISTANCE_KM = 30;

const UF_BY_NAME: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};
const VALID_UFS = new Set(Object.values(UF_BY_NAME));

let cache: Municipality[] | null = null;

export function loadMunicipalities(): Municipality[] {
  cache ??= (rawMunicipalities as RawMunicipality[]).map((raw) => ({
    ibgeCode: raw.c,
    name: raw.n,
    state: raw.u,
    lat: raw.la,
    lon: raw.lo,
    timezone: raw.tz,
  }));
  return cache;
}

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Aceita sigla ("SP") ou nome do estado como vem da geocodificação reversa. */
export function toUf(state: string | undefined): string | null {
  if (!state) {
    return null;
  }
  const upper = state.trim().toUpperCase();
  if (VALID_UFS.has(upper)) {
    return upper;
  }
  const name = normalizeName(state).replace(/^state of /, '');
  return UF_BY_NAME[name] ?? null;
}

export function isInsideBrazil(latitude: number, longitude: number): boolean {
  return latitude >= -34 && latitude <= 5.5 && longitude >= -74.1 && longitude <= -28.6;
}

export function findMunicipality(list: Municipality[], query: LocationQuery): Municipality | null {
  const uf = toUf(query.state);
  const inState = uf ? list.filter((m) => m.state === uf) : list;

  if (query.city) {
    const target = normalizeName(query.city);
    const byName = inState.filter((m) => normalizeName(m.name) === target);
    if (byName.length > 0) {
      return nearest(byName, query);
    }
  }
  const closest = nearest(inState, query);
  return closest && distanceKm(closest, query) <= MAX_NEAREST_DISTANCE_KM ? closest : null;
}

export function findByCode(list: Municipality[], ibgeCode: string): Municipality | null {
  return list.find((m) => m.ibgeCode === ibgeCode) ?? null;
}

export function listByState(list: Municipality[], uf: string): Municipality[] {
  return list.filter((m) => m.state === uf).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function nearest(candidates: Municipality[], point: LocationQuery): Municipality | null {
  let best: Municipality | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = distanceKm(candidate, point);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/** Distância de Haversine em km. */
function distanceKm(m: Municipality, point: LocationQuery): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(point.latitude - m.lat);
  const dLon = toRad(point.longitude - m.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(m.lat)) * Math.cos(toRad(point.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
