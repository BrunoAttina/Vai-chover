import { runClosePeriods } from '../../src/analysis/close-periods';
import { resolveRegion } from '../../src/regions/resolve-region';
import { submitVotes } from '../../src/votes/submit-votes';
import { COLLECTIONS } from '../../src/infra/firestore';
import { WeatherUnavailableError } from '../../src/weather/open-meteo-client';
import {
  FakeWeather,
  authFor,
  clearEmulators,
  hourlyFor,
  makeDeps,
  testClock,
  type TestClock,
} from './helpers';
import type { Deps } from '../../src/infra/deps';

const REGION = '3550308';
const DATE = '2026-11-21';
const AFTER_MORNING = '2026-11-21T15:05:00Z'; // 12:05 local
let clock: TestClock;
let weather: FakeWeather;
let deps: Deps;

const rainyMorning = () =>
  hourlyFor(
    DATE,
    () => 50,
    (hour) => (hour >= 6 && hour < 12 ? 0.5 : 0),
  );
const dryDay = () =>
  hourlyFor(
    DATE,
    () => 0,
    () => 0,
  );

async function vote(uid: string, value: number) {
  await submitVotes(deps, authFor(uid, clock), {
    regionId: REGION,
    localDate: DATE,
    votes: [{ targetPeriod: 'manha', value }],
  });
}

async function analysis(period = 'manha') {
  const doc = await deps.db
    .collection(COLLECTIONS.periodAnalyses)
    .doc(`${REGION}_${DATE}_${period}`)
    .get();
  return doc.data();
}

async function voteDoc(uid: string) {
  return (await deps.db.collection(COLLECTIONS.votes).doc(`${uid}_${DATE}_manha`).get()).data();
}

beforeEach(async () => {
  await clearEmulators();
  clock = testClock('2026-11-21T12:00:00Z'); // 09:00 local
  weather = new FakeWeather(rainyMorning());
  deps = makeDeps({ clock, weather });
  await resolveRegion(deps, authFor('u1', clock), { source: 'manual', ibgeCode: REGION });
});

describe('closePeriods — stage 1 (close tallies)', () => {
  it('does not close a period that has not ended', async () => {
    await vote('u1', 3);
    await runClosePeriods(deps);
    expect(await analysis()).toBeUndefined();
  });

  it('computes the mean, marks each vote and is idempotent', async () => {
    await vote('u1', 3);
    await vote('u2', 2);
    await vote('u3', 0); // média 1,67 → 2
    weather.response = new WeatherUnavailableError('later');
    clock.set(AFTER_MORNING);

    await runClosePeriods(deps);
    await runClosePeriods(deps);

    expect(await analysis()).toMatchObject({
      votes: 3,
      roundedMean: 2,
      crowdSaysRain: true,
      status: 'pending',
      observationAttempts: 2,
    });
    expect(await voteDoc('u2')).toMatchObject({ matchedRegion: true, regionRoundedMean: 2 });
    expect(await voteDoc('u1')).toMatchObject({ matchedRegion: false, regionRoundedMean: 2 });
    const tally = await deps.db
      .collection(COLLECTIONS.tallies)
      .doc(`${REGION}_${DATE}_manha`)
      .get();
    expect(tally.data()?.closed).toBe(true);
    const analyses = await deps.db.collection(COLLECTIONS.periodAnalyses).get();
    expect(analyses.size).toBe(1);
  });
});

describe('closePeriods — stage 2 (observed rain)', () => {
  it('majority right: crowd said rain and it rained', async () => {
    await vote('u1', 3);
    clock.set(AFTER_MORNING);
    await runClosePeriods(deps);
    expect(await analysis()).toMatchObject({
      observedPrecipitationMm: 3,
      observedRain: true,
      status: 'majorityRight',
    });
  });

  it('majority wrong: crowd said rain and it did not rain', async () => {
    weather.response = dryDay();
    await vote('u1', 4);
    clock.set(AFTER_MORNING);
    await runClosePeriods(deps);
    expect(await analysis()).toMatchObject({ observedRain: false, status: 'majorityWrong' });
  });

  it('stays pending and becomes noData after 24 h without observation', async () => {
    weather.response = new WeatherUnavailableError('down');
    await vote('u1', 0);
    clock.set(AFTER_MORNING);
    await runClosePeriods(deps);
    expect(await analysis()).toMatchObject({ status: 'pending' });

    clock.advance(24 * 60 * 60 * 1000 + 60_000);
    await runClosePeriods(deps);
    expect(await analysis()).toMatchObject({ status: 'noData', observedRain: null });
  });

  it('makes one provider request per region and date', async () => {
    await submitVotes(deps, authFor('u1', clock), {
      regionId: REGION,
      localDate: DATE,
      votes: [
        { targetPeriod: 'manha', value: 1 },
        { targetPeriod: 'tarde', value: 1 },
      ],
    });
    clock.set('2026-11-21T21:05:00Z'); // 18:05 — manhã e tarde encerradas
    await runClosePeriods(deps);
    expect(weather.calls).toBe(1);
    expect((await analysis('tarde'))?.status).toBe('majorityWrong');
  });
});
