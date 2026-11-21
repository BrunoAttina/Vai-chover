import { z } from 'zod';
import { PERIODS, RAIN_VALUES, type AnalysisStatus, type Period } from './types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const email = z.string().transform(normalizeEmail).pipe(z.email().max(254));
/** data-model.md `users.displayName`: 2–30 caracteres após trim. */
export const displayNameSchema = z.string().trim().min(2).max(30);
const period = z.enum(PERIODS);
const ibgeCode = z.string().regex(/^\d{7}$/);
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rainValue = z.literal(RAIN_VALUES);

function uniquePeriods<T extends { targetPeriod: Period } | Period>(items: T[]): boolean {
  const keys = items.map((item) => (typeof item === 'string' ? item : item.targetPeriod));
  return new Set(keys).size === keys.length;
}

// ---- Inputs (contracts/callable-functions.md) ----

export const requestLoginCodeInput = z.object({
  email,
  displayName: displayNameSchema.optional(),
});

export const verifyLoginCodeInput = z.object({
  email,
  code: z.string().regex(/^\d{6}$/),
});

export const completeProfileInput = z.object({ displayName: displayNameSchema });

export const resolveRegionInput = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('gps'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(50).optional(),
  }),
  z.object({ source: z.literal('manual'), ibgeCode }),
]);

export const listMunicipalitiesInput = z.object({ state: z.string().regex(/^[A-Z]{2}$/) });

export const submitVotesInput = z.object({
  regionId: ibgeCode,
  /** Data local em que as perguntas foram exibidas (vinda de resolveRegion). */
  localDate,
  votes: z
    .array(z.object({ targetPeriod: period, value: rainValue }))
    .min(1)
    .max(PERIODS.length)
    .refine(uniquePeriods, 'duplicate targetPeriod'),
});

export const getForecastInput = z.object({
  regionId: ibgeCode,
  localDate,
  periods: z.array(period).min(1).max(PERIODS.length).refine(uniquePeriods, 'duplicate period'),
});

export const deleteAccountInput = z.object({}).strict();

export type RequestLoginCodeInput = z.infer<typeof requestLoginCodeInput>;
export type VerifyLoginCodeInput = z.infer<typeof verifyLoginCodeInput>;
export type CompleteProfileInput = z.infer<typeof completeProfileInput>;
export type ResolveRegionInput = z.infer<typeof resolveRegionInput>;
export type ListMunicipalitiesInput = z.infer<typeof listMunicipalitiesInput>;
export type SubmitVotesInput = z.infer<typeof submitVotesInput>;
export type GetForecastInput = z.infer<typeof getForecastInput>;

// ---- Outputs ----

export interface RequestLoginCodeOutput {
  sent: true;
  expiresInSeconds: number;
}

export interface VerifyLoginCodeOutput {
  customToken: string;
  isNewUser: boolean;
  needsProfile: boolean;
}

export type LoginDeniedReason = 'invalid_code' | 'expired' | 'locked';

export interface OkOutput {
  ok: true;
}

export interface ResolveRegionOutput {
  regionId: string;
  name: string;
  state: string;
  timezone: string;
  currentPeriod: Period;
  localDate: string;
  serverNow: string;
}

export interface ListMunicipalitiesOutput {
  items: { ibgeCode: string; name: string }[];
}

export type VoteRejectionReason = 'period_ended' | 'already_voted' | 'not_offered';

export interface SubmitVotesOutput {
  localDate: string;
  currentPeriod: Period;
  accepted: Period[];
  rejected: { targetPeriod: Period; reason: VoteRejectionReason }[];
}

export interface PeriodForecast {
  probability: number;
  willRain: boolean;
}

export type GetForecastOutput =
  | { available: true; periods: Partial<Record<Period, PeriodForecast>>; fetchedAt: string }
  | { available: false };

export type { AnalysisStatus };
