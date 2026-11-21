export interface Clock {
  now(): Date;
}

type Env = Record<string, string | undefined>;

/**
 * Relógio do servidor. `CLOCK_OVERRIDE` (ISO) só é aceito no emulador, para testes de período;
 * em produção a hora real é sempre usada.
 */
export function createClock(env: Env = process.env): Clock {
  const override = env.FUNCTIONS_EMULATOR === 'true' ? env.CLOCK_OVERRIDE : undefined;
  if (!override) {
    return { now: () => new Date() };
  }
  const fixed = new Date(override);
  if (Number.isNaN(fixed.getTime())) {
    throw new Error('Invalid CLOCK_OVERRIDE');
  }
  return fixedClock(fixed);
}

export function fixedClock(instant: Date): Clock {
  return { now: () => new Date(instant.getTime()) };
}
