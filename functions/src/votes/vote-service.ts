import {
  PERIODS,
  getLocalClock,
  type Period,
  type RainValue,
  type VoteRejectionReason,
} from '@vai-chover/shared';

export interface VoteCandidate {
  targetPeriod: Period;
  value: RainValue;
}

export interface VoteRejection {
  targetPeriod: Period;
  reason: VoteRejectionReason;
}

export interface VoteEvaluation {
  localDate: string;
  currentPeriod: Period;
  candidates: VoteCandidate[];
  rejected: VoteRejection[];
}

/**
 * Decide quais palpites podem ser aceitos usando a hora do SERVIDOR no fuso da região
 * (FR-011, FR-014). O relógio do aparelho nunca é considerado.
 */
export function evaluateVotes(
  votes: VoteCandidate[],
  askedLocalDate: string,
  now: Date,
  timeZone: string,
): VoteEvaluation {
  const { localDate, period: currentPeriod } = getLocalClock(now, timeZone);
  const currentIndex = PERIODS.indexOf(currentPeriod);
  const candidates: VoteCandidate[] = [];
  const rejected: VoteRejection[] = [];

  for (const vote of votes) {
    const reason = rejectionReason(vote.targetPeriod, askedLocalDate, localDate, currentIndex);
    if (reason) {
      rejected.push({ targetPeriod: vote.targetPeriod, reason });
    } else {
      candidates.push(vote);
    }
  }
  return { localDate, currentPeriod, candidates, rejected };
}

function rejectionReason(
  target: Period,
  askedLocalDate: string,
  serverLocalDate: string,
  currentIndex: number,
): VoteRejectionReason | null {
  if (askedLocalDate < serverLocalDate) {
    return 'period_ended';
  }
  if (askedLocalDate > serverLocalDate) {
    return 'not_offered';
  }
  return PERIODS.indexOf(target) < currentIndex ? 'period_ended' : null;
}
