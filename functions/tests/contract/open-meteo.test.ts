import nock from 'nock';
import rainyDay from './fixtures/rainy-day.json';
import dryDay from './fixtures/dry-day.json';
import nullHours from './fixtures/null-hours.json';
import {
  createOpenMeteoProvider,
  WeatherUnavailableError,
} from '../../src/weather/open-meteo-client';
import { mapForecast, sumPrecipitation } from '../../src/weather/weather-mapping';

const BASE = 'https://api.open-meteo.com';
const request = {
  latitude: -23.5329,
  longitude: -46.6395,
  timezone: 'America/Sao_Paulo',
  startDate: '2026-11-21',
  endDate: '2026-11-21',
};
const expectedQuery = {
  latitude: '-23.5329',
  longitude: '-46.6395',
  hourly: 'precipitation_probability,precipitation',
  timezone: 'America/Sao_Paulo',
  start_date: '2026-11-21',
  end_date: '2026-11-21',
};

const live = process.env.OPEN_METEO_LIVE === 'true';
const provider = createOpenMeteoProvider({ retryDelayMs: 1, timeoutMs: 200 });

(live ? describe.skip : describe)('Open-Meteo contract (fixtures)', () => {
  beforeAll(() => nock.disableNetConnect());
  afterEach(() => nock.cleanAll());
  afterAll(() => nock.enableNetConnect());

  it('sends the documented query and maps a rainy afternoon', async () => {
    nock(BASE).get('/v1/forecast').query(expectedQuery).reply(200, rainyDay);
    const hourly = await provider.fetchHourly(request);

    expect(mapForecast(hourly, '2026-11-21', ['manha', 'tarde'])).toEqual({
      manha: { probability: 20, willRain: false },
      tarde: { probability: 85, willRain: true },
    });
    expect(sumPrecipitation(hourly, '2026-11-21', 'tarde')).toBeCloseTo(7.2);
  });

  it('maps a dry day', async () => {
    nock(BASE).get('/v1/forecast').query(true).reply(200, dryDay);
    const hourly = await provider.fetchHourly(request);
    expect(sumPrecipitation(hourly, '2026-11-21', 'noite')).toBe(0);
  });

  it('treats null hours as unavailable data for the period', async () => {
    nock(BASE).get('/v1/forecast').query(true).reply(200, nullHours);
    const hourly = await provider.fetchHourly(request);
    expect(mapForecast(hourly, '2026-11-21', ['noite'])).toEqual({});
    expect(sumPrecipitation(hourly, '2026-11-21', 'noite')).toBeNull();
  });

  it('retries once after HTTP 500', async () => {
    nock(BASE)
      .get('/v1/forecast')
      .query(true)
      .reply(500)
      .get('/v1/forecast')
      .query(true)
      .reply(200, dryDay);
    await expect(provider.fetchHourly(request)).resolves.toMatchObject({ time: expect.any(Array) });
  });

  it('fails after two HTTP 500 responses', async () => {
    nock(BASE).get('/v1/forecast').query(true).times(2).reply(503);
    await expect(provider.fetchHourly(request)).rejects.toBeInstanceOf(WeatherUnavailableError);
  });

  it('fails after two timeouts', async () => {
    nock(BASE).get('/v1/forecast').query(true).times(2).delay(500).reply(200, dryDay);
    await expect(provider.fetchHourly(request)).rejects.toBeInstanceOf(WeatherUnavailableError);
  });

  it('does not retry client errors', async () => {
    const scope = nock(BASE).get('/v1/forecast').query(true).reply(400, { error: true });
    await expect(provider.fetchHourly(request)).rejects.toBeInstanceOf(WeatherUnavailableError);
    expect(scope.isDone()).toBe(true);
  });

  it('rejects an unexpected response format', async () => {
    nock(BASE)
      .get('/v1/forecast')
      .query(true)
      .reply(200, { hourly: { time: ['x'] } });
    await expect(provider.fetchHourly(request)).rejects.toBeInstanceOf(WeatherUnavailableError);
  });

  it('sends the API key when configured', async () => {
    nock(BASE)
      .get('/v1/forecast')
      .query({ ...expectedQuery, apikey: 'secret-key' })
      .reply(200, dryDay);
    const paid = createOpenMeteoProvider({ apiKey: 'secret-key', retryDelayMs: 1 });
    await expect(paid.fetchHourly(request)).resolves.toBeDefined();
  });
});

(live ? describe : describe.skip)('Open-Meteo contract (live API)', () => {
  it('returns hourly data in the expected format', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const hourly = await createOpenMeteoProvider().fetchHourly({
      ...request,
      startDate: today,
      endDate: today,
    });
    expect(hourly.time).toHaveLength(24);
  });
});
