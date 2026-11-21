import { resolveRegion, listMunicipalities } from '../../src/regions/resolve-region';
import { submitVotes } from '../../src/votes/submit-votes';
import { COLLECTIONS } from '../../src/infra/firestore';
import { authFor, clearEmulators, makeDeps, testClock, type TestClock } from './helpers';
import type { Deps } from '../../src/infra/deps';

const SAO_PAULO = '3550308';
let clock: TestClock;
let deps: Deps;

beforeEach(async () => {
  await clearEmulators();
  clock = testClock('2026-11-21T12:00:00Z'); // 09:00 em São Paulo (manhã)
  deps = makeDeps({ clock });
});

async function tally(period: string, date = '2026-11-21') {
  const snapshot = await deps.db
    .collection(COLLECTIONS.tallies)
    .doc(`${SAO_PAULO}_${date}_${period}`)
    .get();
  return snapshot.data();
}

describe('resolveRegion', () => {
  it('resolves by GPS, stores the region and never the coordinates', async () => {
    const result = await resolveRegion(deps, authFor('u1', clock), {
      source: 'gps',
      latitude: -23.561,
      longitude: -46.656,
      city: 'São Paulo',
      state: 'São Paulo',
    });

    expect(result).toMatchObject({
      regionId: SAO_PAULO,
      name: 'São Paulo',
      state: 'SP',
      timezone: 'America/Sao_Paulo',
      currentPeriod: 'manha',
      localDate: '2026-11-21',
    });
    const region = await deps.db.collection(COLLECTIONS.regions).doc(SAO_PAULO).get();
    expect(region.data()).toMatchObject({ lat: -23.5329, lon: -46.6395 });
    const user = await deps.db.collection(COLLECTIONS.users).doc('u1').get();
    expect(user.data()).toEqual({ lastRegionId: SAO_PAULO });
    expect(JSON.stringify(user.data())).not.toContain('-23.561');
  });

  it('resolves a manual choice', async () => {
    await expect(
      resolveRegion(deps, authFor('u1', clock), { source: 'manual', ibgeCode: '1302603' }),
    ).resolves.toMatchObject({ name: 'Manaus', state: 'AM' });
  });

  it('returns not-found when the municipality cannot be identified', async () => {
    await expect(
      resolveRegion(deps, authFor('u1', clock), { source: 'manual', ibgeCode: '9999999' }),
    ).rejects.toMatchObject({ code: 'not-found' });
  });

  it('rejects coordinates outside Brazil', async () => {
    await expect(
      resolveRegion(deps, authFor('u1', clock), { source: 'gps', latitude: 40.7, longitude: -74 }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('lists municipalities of a state', async () => {
    const { items } = await listMunicipalities(deps, authFor('u1', clock), { state: 'RR' });
    expect(items).toHaveLength(15);
    expect(items[0]).toEqual({ ibgeCode: '1400050', name: 'Alto Alegre' });
  });
});

describe('submitVotes', () => {
  beforeEach(async () => {
    await resolveRegion(deps, authFor('u1', clock), { source: 'manual', ibgeCode: SAO_PAULO });
  });

  const morningVotes = {
    regionId: SAO_PAULO,
    localDate: '2026-11-21',
    votes: [
      { targetPeriod: 'manha', value: 3 },
      { targetPeriod: 'tarde', value: 0 },
      { targetPeriod: 'noite', value: 5 },
    ],
  };

  it('records votes and increments tallies in one transaction', async () => {
    await expect(submitVotes(deps, authFor('u1', clock), morningVotes)).resolves.toEqual({
      localDate: '2026-11-21',
      currentPeriod: 'manha',
      accepted: ['manha', 'tarde', 'noite'],
      rejected: [],
    });
    await submitVotes(deps, authFor('u2', clock), {
      ...morningVotes,
      votes: [{ targetPeriod: 'manha', value: 3 }],
    });

    expect(await tally('manha')).toMatchObject({
      counts: [0, 0, 0, 2, 0, 0],
      total: 2,
      sum: 6,
      closed: false,
    });
    expect((await tally('noite'))?.periodEndsAt.toDate()).toEqual(new Date('2026-11-22T03:00:00Z'));
    const vote = await deps.db.collection(COLLECTIONS.votes).doc('u1_2026-11-21_tarde').get();
    expect(vote.data()).toMatchObject({
      uid: 'u1',
      regionId: SAO_PAULO,
      targetPeriod: 'tarde',
      askedInPeriod: 'manha',
      value: 0,
      matchedRegion: null,
    });
  });

  it('allows a single vote per person, period and date', async () => {
    await submitVotes(deps, authFor('u1', clock), morningVotes);
    clock.set('2026-11-21T16:00:00Z'); // 13:00, tarde
    await expect(
      submitVotes(deps, authFor('u1', clock), {
        ...morningVotes,
        votes: [{ targetPeriod: 'tarde', value: 4 }],
      }),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { result: { rejected: [{ targetPeriod: 'tarde', reason: 'already_voted' }] } },
    });
    expect(await tally('tarde')).toMatchObject({ total: 1, counts: [1, 0, 0, 0, 0, 0] });
  });

  it('uses the server clock: questions opened at 11:59 and sent at 12:00', async () => {
    clock.set('2026-11-21T15:00:00Z');
    await expect(submitVotes(deps, authFor('u1', clock), morningVotes)).resolves.toEqual({
      localDate: '2026-11-21',
      currentPeriod: 'tarde',
      accepted: ['tarde', 'noite'],
      rejected: [{ targetPeriod: 'manha', reason: 'period_ended' }],
    });
    expect(await tally('manha')).toBeUndefined();
  });

  it('fails for unknown regions and unauthenticated calls', async () => {
    await expect(
      submitVotes(deps, authFor('u1', clock), { ...morningVotes, regionId: '1100015' }),
    ).rejects.toMatchObject({ code: 'not-found' });
    await expect(submitVotes(deps, undefined, morningVotes)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });
});
