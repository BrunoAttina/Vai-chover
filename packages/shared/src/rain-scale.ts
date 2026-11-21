import { RAIN_VALUES, type RainValue } from './types';

export interface RainOption {
  value: RainValue;
  label: string;
}

const LABELS: Record<RainValue, string> = {
  0: 'Não vai chover',
  1: 'Garoa',
  2: 'Chuva fraca',
  3: 'Chuva normal/média',
  4: 'Chuva intensa',
  5: "Pé-d'água",
};

export const RAIN_SCALE: readonly RainOption[] = RAIN_VALUES.map((value) => ({
  value,
  label: LABELS[value],
}));

export function isRainValue(input: unknown): input is RainValue {
  return typeof input === 'number' && (RAIN_VALUES as readonly number[]).includes(input);
}

export function getRainLabel(value: RainValue): string {
  return LABELS[value];
}

/** Formato exibido ao usuário, ex.: "3 - Chuva normal/média". */
export function formatRainValue(value: RainValue): string {
  return `${value} - ${LABELS[value]}`;
}
