import { Timestamp } from 'firebase-admin/firestore';
import {
  computeMean,
  crowdSaysRain,
  didMatchRegion,
  roundHalfUp,
  type RainValue,
} from '@vai-chover/shared';
import { COLLECTIONS, ids } from '../infra/firestore';
import type { Deps } from '../infra/deps';
import type { TallyDoc, VoteDoc } from '../votes/votes-repository';
import type { PeriodAnalysisDoc } from './analyses-repository';

const BATCH_SIZE = 200;

/** Etapa 1 do fechamento (contracts/scheduled-jobs.md): fecha períodos encerrados. */
export async function closeEndedTallies(deps: Deps): Promise<number> {
  const now = deps.clock.now();
  const snapshot = await deps.db
    .collection(COLLECTIONS.tallies)
    .where('closed', '==', false)
    .where('periodEndsAt', '<=', Timestamp.fromDate(now))
    .orderBy('periodEndsAt')
    .limit(BATCH_SIZE)
    .get();

  let closed = 0;
  for (const tallyDoc of snapshot.docs) {
    const roundedMean = await closeTally(deps, tallyDoc.ref, now);
    const tally = tallyDoc.data() as TallyDoc;
    if (roundedMean !== null) {
      await markVotes(deps, tally, roundedMean);
    }
    closed += 1;
  }
  return closed;
}

/** Cria a análise de forma idempotente e marca o tally como fechado. Retorna a média arredondada. */
async function closeTally(
  deps: Deps,
  tallyRef: FirebaseFirestore.DocumentReference,
  now: Date,
): Promise<RainValue | null> {
  return deps.db.runTransaction(async (tx) => {
    const tallySnapshot = await tx.get(tallyRef);
    const tally = tallySnapshot.data() as TallyDoc;
    const analysisRef = deps.db
      .collection(COLLECTIONS.periodAnalyses)
      .doc(ids.analysis(tally.regionId, tally.localDate, tally.period));
    const existing = await tx.get(analysisRef);
    tx.update(tallyRef, { closed: true });
    if (existing.exists) {
      return (existing.data() as PeriodAnalysisDoc).roundedMean;
    }

    const mean = computeMean(tally.sum, tally.total);
    const roundedMean = mean === null ? null : roundHalfUp(mean);
    const analysis: PeriodAnalysisDoc = {
      regionId: tally.regionId,
      localDate: tally.localDate,
      period: tally.period,
      votes: tally.total,
      mean,
      roundedMean,
      crowdSaysRain: roundedMean === null ? null : crowdSaysRain(roundedMean),
      observedPrecipitationMm: null,
      observedRain: null,
      status: roundedMean === null ? 'noData' : 'pending',
      observationAttempts: 0,
      closedAt: Timestamp.fromDate(now),
      resolvedAt: roundedMean === null ? Timestamp.fromDate(now) : null,
    };
    tx.create(analysisRef, analysis);
    return roundedMean;
  });
}

/** Registra em cada voto se ele coincidiu com a média da região (FR-022). */
async function markVotes(deps: Deps, tally: TallyDoc, roundedMean: RainValue): Promise<void> {
  const votes = await deps.db
    .collection(COLLECTIONS.votes)
    .where('regionId', '==', tally.regionId)
    .where('localDate', '==', tally.localDate)
    .where('targetPeriod', '==', tally.period)
    .get();
  const writer = deps.db.bulkWriter();
  for (const vote of votes.docs) {
    const { value } = vote.data() as VoteDoc;
    void writer.update(vote.ref, {
      matchedRegion: didMatchRegion(value, roundedMean),
      regionRoundedMean: roundedMean,
    });
  }
  await writer.close();
}
