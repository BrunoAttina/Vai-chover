import type { Timestamp } from 'firebase-admin/firestore';
import type { AnalysisStatus, Period, RainValue } from '@vai-chover/shared';

/**
 * Documento `periodAnalyses/{regionId}_{localDate}_{period}` — data-model.md
 * `periodAnalyses.votes`, `periodAnalyses.mean`, `periodAnalyses.roundedMean`,
 * `periodAnalyses.crowdSaysRain`, `periodAnalyses.observedPrecipitationMm`,
 * `periodAnalyses.observedRain`, `periodAnalyses.status`, `periodAnalyses.observationAttempts`,
 * `periodAnalyses.closedAt`, `periodAnalyses.resolvedAt`.
 *
 * Transições de `status`: noData (sem votos) | pending → majorityRight | majorityWrong | noData (24 h).
 */
export interface PeriodAnalysisDoc {
  regionId: string;
  localDate: string;
  period: Period;
  votes: number;
  mean: number | null;
  roundedMean: RainValue | null;
  crowdSaysRain: boolean | null;
  observedPrecipitationMm: number | null;
  observedRain: boolean | null;
  status: AnalysisStatus;
  observationAttempts: number;
  closedAt: Timestamp;
  resolvedAt: Timestamp | null;
}
