import { getForecast } from '../../src/weather/get-forecast';
import { ensureRegion } from '../../src/regions/regions-repository';
import { findByCode, loadMunicipalities } from '../../src/regions/municipality-matcher';
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
const input = { regionId: REGION, localDate: '2026-11-21', periods: ['tarde', 'noite'] };
let clock: TestClock;
let weather: FakeWeather;
let deps: Deps;

beforeEach(async () => {
  await clearEmulators();
  clock = testClock('2026-11-21T15:30:00Z');
  weather = new FakeWeather(
    hourlyFor(
      '2026-11-21',
      (hour) => (hour >= 18 ? 70 : 20),
      () => 0,
    ),
  );
  deps = makeDeps({ clock, weather });
  await ensureRegion(deps.db, findByCode(loadMunicipalities(), REGION)!);
});

describe('getForecast', () => {
  it('returns the forecast of the requested periods', async () => {
    await expect(getForecast(deps, authFor('u1', clock), input)).resolves.toEqual({
      available: true,
      periods: {
        tarde: { probability: 20, willRain: false },
        noite: { probability: 70, willRain: true },
      },
      fetchedAt: '2026-11-21T15:30:00.000Z',
    });
  });

  it('serves from cache within 60 minutes and refreshes after', async () => {
    await getForecast(deps, authFor('u1', clock), input);
    clock.advance(59 * 60_000);
    await getForecast(deps, authFor('u1', clock), { ...input, periods: ['manha'] });
    expect(weather.calls).toBe(1);

    clock.advance(2 * 60_000);
    await getForecast(deps, authFor('u1', clock), input);
    expect(weather.calls).toBe(2);
  });

  it('returns available: false when the provider fails', async () => {
    weather.response = new WeatherUnavailableError('timeout');
    await expect(getForecast(deps, authFor('u1', clock), input)).resolves.toEqual({
      available: false,
    });
  });

  it('returns available: false when the provider lacks data for a period', async () => {
    weather.response = hourlyFor(
      '2026-11-21',
      (hour) => (hour >= 18 ? null : 10),
      () => 0,
    );
    await expect(getForecast(deps, authFor('u1', clock), input)).resolves.toEqual({
      available: false,
    });
  });

  it('validates the region and the session', async () => {
    await expect(
      getForecast(deps, authFor('u1', clock), { ...input, regionId: '1100015' }),
    ).rejects.toMatchObject({ code: 'not-found' });
    await expect(getForecast(deps, undefined, input)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });
});
