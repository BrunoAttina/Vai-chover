import type { Deps } from '../infra/deps';
import { closeEndedTallies } from './close-tallies';
import { resolvePendingObservations } from './resolve-observations';

/** Job agendado (a cada 15 min): fecha períodos e resolve a chuva observada. */
export async function runClosePeriods(deps: Deps): Promise<void> {
  const startedAt = Date.now();
  const talliesClosed = await closeEndedTallies(deps);
  const observations = await resolvePendingObservations(deps);
  deps.logger.info('closePeriods.run', {
    talliesClosed,
    analysesResolved: observations.resolved,
    analysesPending: observations.pending,
    providerErrors: observations.providerErrors,
    durationMs: Date.now() - startedAt,
  });
}
