import { HttpsError } from 'firebase-functions/v2/https';
import { submitVotesInput, type SubmitVotesOutput } from '@vai-chover/shared';
import { parseInput } from '../infra/errors';
import { requireSession, type AuthContext } from '../infra/session-guard';
import type { Deps } from '../infra/deps';
import { getRegion } from '../regions/regions-repository';
import { evaluateVotes } from './vote-service';
import { recordVotes } from './votes-repository';

/** Registra os palpites (um por pessoa, por período, por data — FR-013). */
export async function submitVotes(
  deps: Deps,
  auth: AuthContext | undefined,
  data: unknown,
): Promise<SubmitVotesOutput> {
  const now = deps.clock.now();
  const uid = requireSession(auth, now);
  const input = parseInput(submitVotesInput, data);
  const region = await getRegion(deps.db, input.regionId);
  if (!region) {
    throw new HttpsError('not-found', 'Region not found.');
  }

  const evaluation = evaluateVotes(input.votes, input.localDate, now, region.timezone);
  const recorded = await recordVotes(deps.db, {
    uid,
    regionId: region.id,
    timezone: region.timezone,
    localDate: evaluation.localDate,
    askedInPeriod: evaluation.currentPeriod,
    candidates: evaluation.candidates,
    now,
  });

  const output: SubmitVotesOutput = {
    localDate: evaluation.localDate,
    currentPeriod: evaluation.currentPeriod,
    accepted: recorded.accepted,
    rejected: [...evaluation.rejected, ...recorded.rejected],
  };
  deps.logger.info('votes.submitted', {
    accepted: output.accepted.length,
    rejected: output.rejected.length,
  });
  if (output.accepted.length === 0) {
    throw new HttpsError('failed-precondition', 'No vote accepted.', { result: output });
  }
  return output;
}
