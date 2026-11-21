/** Períodos do dia, em ordem cronológica (data-model.md, convenção `Period`). */
export const PERIODS = ['madrugada', 'manha', 'tarde', 'noite'] as const;
export type Period = (typeof PERIODS)[number];

/** Escala de palpite 0–5 (data-model.md, convenção `RainValue`). */
export const RAIN_VALUES = [0, 1, 2, 3, 4, 5] as const;
export type RainValue = (typeof RAIN_VALUES)[number];

/** Data local `YYYY-MM-DD` no fuso da região. */
export type LocalDate = string;

export type AnalysisStatus = 'pending' | 'majorityRight' | 'majorityWrong' | 'noData';
