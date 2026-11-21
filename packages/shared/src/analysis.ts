import type { AnalysisStatus, RainValue } from './types';

/** Precipitação mínima (mm) para considerar que choveu (research.md R4). */
export const OBSERVED_RAIN_THRESHOLD_MM = 0.1;
/** Probabilidade mínima (%) para a previsão indicar chuva (FR-018). */
export const FORECAST_RAIN_THRESHOLD_PERCENT = 50;
/** Prazo para obter a chuva observada antes de marcar "sem dados" (FR-024). */
export const OBSERVATION_DEADLINE_MS = 24 * 60 * 60 * 1000;

export function computeMean(sum: number, total: number): number | null {
  return total === 0 ? null : sum / total;
}

/** Arredonda para o inteiro mais próximo, 0,5 para cima (FR-021). */
export function roundHalfUp(mean: number): RainValue {
  if (mean < 0 || mean > 5) {
    throw new RangeError(`Mean outside the 0–5 scale: ${mean}`);
  }
  return Math.floor(mean + 0.5) as RainValue;
}

export function crowdSaysRain(roundedMean: RainValue): boolean {
  return roundedMean >= 1;
}

export function didMatchRegion(value: RainValue, roundedMean: RainValue): boolean {
  return value === roundedMean;
}

export function isObservedRain(precipitationMm: number): boolean {
  return precipitationMm >= OBSERVED_RAIN_THRESHOLD_MM;
}

export function isForecastRain(probabilityPercent: number): boolean {
  return probabilityPercent >= FORECAST_RAIN_THRESHOLD_PERCENT;
}

export interface StatusInput {
  crowdSaysRain: boolean;
  observedRain: boolean | null;
  closedAt: Date;
  now: Date;
}

export function resolveAnalysisStatus(input: StatusInput): AnalysisStatus {
  if (input.observedRain === null) {
    const expired = input.now.getTime() - input.closedAt.getTime() > OBSERVATION_DEADLINE_MS;
    return expired ? 'noData' : 'pending';
  }
  return input.crowdSaysRain === input.observedRain ? 'majorityRight' : 'majorityWrong';
}
