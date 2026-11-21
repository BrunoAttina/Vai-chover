import { z } from 'zod';

export interface HourlyRequest {
  latitude: number;
  longitude: number;
  timezone: string;
  startDate: string;
  endDate: string;
}

/** Série horária em hora local (`YYYY-MM-DDTHH:00`). */
export interface HourlyWeather {
  time: string[];
  precipitationProbability: (number | null)[];
  precipitation: (number | null)[];
}

export interface WeatherProvider {
  fetchHourly(request: HourlyRequest): Promise<HourlyWeather>;
}

export class WeatherUnavailableError extends Error {
  constructor(reason: string) {
    super(`Weather provider unavailable: ${reason}`);
    this.name = 'WeatherUnavailableError';
  }
}

export interface OpenMeteoOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryDelayMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.open-meteo.com';
const nullableNumbers = z.array(z.number().nullable());
const responseSchema = z
  .object({
    hourly: z.object({
      time: z.array(z.string()),
      precipitation_probability: nullableNumbers,
      precipitation: nullableNumbers,
    }),
  })
  .refine(
    ({ hourly }) =>
      hourly.time.length === hourly.precipitation.length &&
      hourly.time.length === hourly.precipitation_probability.length,
    'hourly arrays must have the same length',
  );

class RetryableError extends Error {}

/** Cliente do Open-Meteo (contracts/open-meteo.md): timeout de 5 s e 1 nova tentativa. */
export function createOpenMeteoProvider(options: OpenMeteoOptions = {}): WeatherProvider {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  const retryDelayMs = options.retryDelayMs ?? 1000;

  async function attempt(url: string): Promise<HourlyWeather> {
    let response: Response;
    try {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new RetryableError('network or timeout');
    }
    if (response.status >= 500) {
      throw new RetryableError(`HTTP ${response.status}`);
    }
    if (!response.ok) {
      throw new WeatherUnavailableError(`HTTP ${response.status}`);
    }
    const parsed = responseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new WeatherUnavailableError('unexpected response format');
    }
    const { hourly } = parsed.data;
    return {
      time: hourly.time,
      precipitationProbability: hourly.precipitation_probability,
      precipitation: hourly.precipitation,
    };
  }

  return {
    async fetchHourly(request) {
      const url = buildUrl(baseUrl, request, options.apiKey);
      try {
        return await attempt(url);
      } catch (error) {
        if (!(error instanceof RetryableError)) {
          throw error;
        }
        await delay(retryDelayMs);
        try {
          return await attempt(url);
        } catch (retryError) {
          throw retryError instanceof RetryableError
            ? new WeatherUnavailableError(retryError.message)
            : retryError;
        }
      }
    },
  };
}

function buildUrl(baseUrl: string, request: HourlyRequest, apiKey: string | undefined): string {
  const params = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    hourly: 'precipitation_probability,precipitation',
    timezone: request.timezone,
    start_date: request.startDate,
    end_date: request.endDate,
  });
  if (apiKey) {
    params.set('apikey', apiKey);
  }
  return `${baseUrl}/v1/forecast?${params.toString()}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
