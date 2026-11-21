import { FieldValue } from 'firebase-admin/firestore';
import { deleteAccountInput, type OkOutput } from '@vai-chover/shared';
import { parseInput } from '../infra/errors';
import { COLLECTIONS, ids } from '../infra/firestore';
import { requireSession, type AuthContext } from '../infra/session-guard';
import { userRef } from '../infra/users-repository';
import type { Deps } from '../infra/deps';
import type { TallyDoc, VoteDoc } from '../votes/votes-repository';

/**
 * Exclusão de conta (LGPD — data-model.md "Exclusão de conta"): remove perfil, votos e usuário.
 * Votos de períodos abertos são descontados das contagens; períodos fechados ficam só como
 * números agregados anônimos.
 */
export async function deleteAccount(
  deps: Deps,
  auth: AuthContext | undefined,
  data: unknown,
): Promise<OkOutput> {
  const uid = requireSession(auth, deps.clock.now());
  parseInput(deleteAccountInput, data);

  const votes = await deps.db.collection(COLLECTIONS.votes).where('uid', '==', uid).get();
  for (const voteSnapshot of votes.docs) {
    await deps.db.runTransaction(async (tx) => {
      const vote = voteSnapshot.data() as VoteDoc;
      const tallyRef = deps.db
        .collection(COLLECTIONS.tallies)
        .doc(ids.tally(vote.regionId, vote.localDate, vote.targetPeriod));
      const tally = (await tx.get(tallyRef)).data() as TallyDoc | undefined;
      if (tally && !tally.closed) {
        tx.update(tallyRef, {
          counts: tally.counts.map((count, value) => (value === vote.value ? count - 1 : count)),
          total: FieldValue.increment(-1),
          sum: FieldValue.increment(-vote.value),
        });
      }
      tx.delete(voteSnapshot.ref);
    });
  }

  await userRef(deps.db, uid).delete();
  await deps.auth.deleteUser(uid).catch((error: { code?: string }) => {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  });
  deps.logger.info('auth.accountDeleted', { votesRemoved: votes.size });
  return { ok: true };
}
