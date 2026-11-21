import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import { RAIN_VALUES, getPeriodWindow, type Period, type RainValue } from '@vai-chover/shared';
import { COLLECTIONS, ids } from '../infra/firestore';
import type { VoteCandidate, VoteRejection } from './vote-service';

/**
 * Documento `votes/{uid}_{localDate}_{period}` — data-model.md `votes.uid`, `votes.regionId`,
 * `votes.localDate`, `votes.targetPeriod`, `votes.askedInPeriod`, `votes.value`, `votes.createdAt`,
 * `votes.matchedRegion`, `votes.regionRoundedMean`.
 */
export interface VoteDoc {
  uid: string;
  regionId: string;
  localDate: string;
  targetPeriod: Period;
  askedInPeriod: Period;
  value: RainValue;
  createdAt: Timestamp;
  matchedRegion: boolean | null;
  regionRoundedMean: RainValue | null;
}

/**
 * Documento `tallies/{regionId}_{localDate}_{period}` — data-model.md `tallies.counts`,
 * `tallies.total`, `tallies.sum`, `tallies.periodEndsAt`, `tallies.closed`.
 */
export interface TallyDoc {
  regionId: string;
  localDate: string;
  period: Period;
  counts: number[];
  total: number;
  sum: number;
  periodEndsAt: Timestamp;
  closed: boolean;
}

export interface RecordVotesInput {
  uid: string;
  regionId: string;
  timezone: string;
  localDate: string;
  askedInPeriod: Period;
  candidates: VoteCandidate[];
  now: Date;
}

export interface RecordVotesResult {
  accepted: Period[];
  rejected: VoteRejection[];
}

/** Grava os votos e incrementa as contagens na MESMA transação (research.md R5). */
export async function recordVotes(
  db: Firestore,
  input: RecordVotesInput,
): Promise<RecordVotesResult> {
  const refs = input.candidates.map((candidate) => ({
    candidate,
    vote: db
      .collection(COLLECTIONS.votes)
      .doc(ids.vote(input.uid, input.localDate, candidate.targetPeriod)),
    tally: db
      .collection(COLLECTIONS.tallies)
      .doc(ids.tally(input.regionId, input.localDate, candidate.targetPeriod)),
  }));

  return db.runTransaction(async (tx) => {
    const voteSnapshots = await Promise.all(refs.map((ref) => tx.get(ref.vote)));
    const tallySnapshots = await Promise.all(refs.map((ref) => tx.get(ref.tally)));
    const result: RecordVotesResult = { accepted: [], rejected: [] };

    refs.forEach(({ candidate, vote, tally }, index) => {
      if (voteSnapshots[index]?.exists) {
        result.rejected.push({ targetPeriod: candidate.targetPeriod, reason: 'already_voted' });
        return;
      }
      tx.create(vote, buildVote(input, candidate));
      writeTallyIncrement(
        tx,
        tally,
        tallySnapshots[index]?.data() as TallyDoc | undefined,
        input,
        candidate,
      );
      result.accepted.push(candidate.targetPeriod);
    });
    return result;
  });
}

function buildVote(input: RecordVotesInput, candidate: VoteCandidate): VoteDoc {
  return {
    uid: input.uid,
    regionId: input.regionId,
    localDate: input.localDate,
    targetPeriod: candidate.targetPeriod,
    askedInPeriod: input.askedInPeriod,
    value: candidate.value,
    createdAt: Timestamp.fromDate(input.now),
    matchedRegion: null,
    regionRoundedMean: null,
  };
}

function writeTallyIncrement(
  tx: FirebaseFirestore.Transaction,
  ref: DocumentReference,
  existing: TallyDoc | undefined,
  input: RecordVotesInput,
  candidate: VoteCandidate,
): void {
  if (!existing) {
    const counts = RAIN_VALUES.map((value) => (value === candidate.value ? 1 : 0));
    const doc: TallyDoc = {
      regionId: input.regionId,
      localDate: input.localDate,
      period: candidate.targetPeriod,
      counts,
      total: 1,
      sum: candidate.value,
      periodEndsAt: Timestamp.fromDate(
        getPeriodWindow(input.localDate, candidate.targetPeriod, input.timezone).end,
      ),
      closed: false,
    };
    tx.create(ref, doc);
    return;
  }
  // Firestore não incrementa posições de array: a contagem é recalculada a partir da leitura
  // feita na própria transação, o que mantém a consistência.
  const counts = existing.counts.map((count, value) =>
    value === candidate.value ? count + 1 : count,
  );
  tx.update(ref, {
    counts,
    total: FieldValue.increment(1),
    sum: FieldValue.increment(candidate.value),
  });
}
