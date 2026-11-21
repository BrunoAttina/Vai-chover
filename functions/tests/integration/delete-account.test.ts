import { deleteAccount } from '../../src/auth/delete-account';
import { runClosePeriods } from '../../src/analysis/close-periods';
import { resolveRegion } from '../../src/regions/resolve-region';
import { submitVotes } from '../../src/votes/submit-votes';
import { COLLECTIONS } from '../../src/infra/firestore';
import { authFor, clearEmulators, makeDeps, testClock, type TestClock } from './helpers';
import type { Deps } from '../../src/infra/deps';

const REGION = '3550308';
const DATE = '2026-11-21';
let clock: TestClock;
let deps: Deps;

beforeEach(async () => {
  await clearEmulators();
  clock = testClock('2026-11-21T12:00:00Z');
  deps = makeDeps({ clock });
});

async function tally(period: string) {
  return (
    await deps.db.collection(COLLECTIONS.tallies).doc(`${REGION}_${DATE}_${period}`).get()
  ).data();
}

describe('deleteAccount', () => {
  it('removes profile, votes and Auth user, adjusting only open tallies', async () => {
    const user = await deps.auth.createUser({ email: 'ana@example.com' });
    const auth = authFor(user.uid, clock);
    await resolveRegion(deps, auth, { source: 'manual', ibgeCode: REGION });
    await submitVotes(deps, auth, {
      regionId: REGION,
      localDate: DATE,
      votes: [
        { targetPeriod: 'manha', value: 2 },
        { targetPeriod: 'noite', value: 4 },
      ],
    });
    await submitVotes(deps, authFor('other', clock), {
      regionId: REGION,
      localDate: DATE,
      votes: [{ targetPeriod: 'noite', value: 1 }],
    });

    clock.set('2026-11-21T15:05:00Z'); // manhã fechada
    await runClosePeriods(deps);
    await expect(deleteAccount(deps, authFor(user.uid, clock), {})).resolves.toEqual({ ok: true });

    expect(await tally('noite')).toMatchObject({ total: 1, sum: 1, counts: [0, 1, 0, 0, 0, 0] });
    expect(await tally('manha')).toMatchObject({ total: 1, closed: true });
    const votes = await deps.db.collection(COLLECTIONS.votes).where('uid', '==', user.uid).get();
    expect(votes.empty).toBe(true);
    expect((await deps.db.collection(COLLECTIONS.users).doc(user.uid).get()).exists).toBe(false);
    await expect(deps.auth.getUser(user.uid)).rejects.toMatchObject({
      code: 'auth/user-not-found',
    });
  });

  it('requires a session', async () => {
    await expect(deleteAccount(deps, undefined, {})).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });
});
