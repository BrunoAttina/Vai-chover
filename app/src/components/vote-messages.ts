import type { SubmitVotesOutput, VoteRejectionReason } from '@vai-chover/shared';
import { PERIOD_LABELS } from './period-labels';

const REJECTION_TEXT: Record<VoteRejectionReason, string> = {
  period_ended: 'o período já terminou',
  already_voted: 'você já votou',
  not_offered: 'o período não está disponível',
};

/** Aviso sobre palpites não registrados (ex.: período virou durante a votação). */
export function describeRejections(rejected: SubmitVotesOutput['rejected']): string | null {
  if (rejected.length === 0) {
    return null;
  }
  const parts = rejected.map(
    ({ targetPeriod, reason }) => `${PERIOD_LABELS[targetPeriod]} (${REJECTION_TEXT[reason]})`,
  );
  return `Não registramos: ${parts.join(', ')}.`;
}
