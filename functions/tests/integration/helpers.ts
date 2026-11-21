import { getAdminAuth, getDb } from '../../src/infra/firestore';
import { fixedClock, type Clock } from '../../src/infra/clock';
import { createLogger } from '../../src/infra/logger';
import type { Deps } from '../../src/infra/deps';
import type { AuthContext } from '../../src/infra/session-guard';
import type { HourlyWeather, WeatherProvider } from '../../src/weather/open-meteo-client';

const PROJECT = 'demo-vai-chover';

export async function clearEmulators(): Promise<void> {
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await Promise.all([
    fetch(`http://${firestoreHost}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
      method: 'DELETE',
    }),
    fetch(`http://${authHost}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' }),
  ]);
}

/** Relógio mutável para simular a passagem do tempo nos testes. */
export interface TestClock extends Clock {
  set(iso: string): void;
  advance(ms: number): void;
}

export function testClock(iso: string): TestClock {
  let current = new Date(iso);
  return {
    now: () => fixedClock(current).now(),
    set: (value) => {
      current = new Date(value);
    },
    advance: (ms) => {
      current = new Date(current.getTime() + ms);
    },
  };
}

export class FakeWeather implements WeatherProvider {
  calls = 0;
  constructor(public response: HourlyWeather | Error) {}
  async fetchHourly(): Promise<HourlyWeather> {
    this.calls += 1;
    if (this.response instanceof Error) {
      throw this.response;
    }
    return this.response;
  }
}

export function makeDeps(overrides: Partial<Deps> & { clock: Clock }): Deps {
  return {
    db: getDb(),
    auth: getAdminAuth(),
    logger: createLogger(() => undefined),
    otpPepper: 'test-pepper',
    weather: new FakeWeather(new Error('weather not configured')),
    ...overrides,
  };
}

export function authFor(uid: string, clock: Clock): AuthContext {
  return { uid, token: { auth_time: Math.floor(clock.now().getTime() / 1000) } };
}

/** Série horária de 24 h para uma data local, com valores por hora. */
export function hourlyFor(
  localDate: string,
  probability: (hour: number) => number | null,
  precipitation: (hour: number) => number | null,
): HourlyWeather {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  return {
    time: hours.map((hour) => `${localDate}T${String(hour).padStart(2, '0')}:00`),
    precipitationProbability: hours.map(probability),
    precipitation: hours.map(precipitation),
  };
}
