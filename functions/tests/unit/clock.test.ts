import { createClock } from '../../src/infra/clock';

describe('createClock', () => {
  it('returns the real time by default', () => {
    const before = Date.now();
    const now = createClock({}).now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it('honors CLOCK_OVERRIDE only inside the emulator', () => {
    const clock = createClock({
      FUNCTIONS_EMULATOR: 'true',
      CLOCK_OVERRIDE: '2026-11-21T12:00:00Z',
    });
    expect(clock.now().toISOString()).toBe('2026-11-21T12:00:00.000Z');
  });

  it('ignores CLOCK_OVERRIDE in production', () => {
    const clock = createClock({ CLOCK_OVERRIDE: '2000-01-01T00:00:00Z' });
    expect(clock.now().getUTCFullYear()).toBeGreaterThan(2000);
  });

  it('rejects an invalid override', () => {
    expect(() => createClock({ FUNCTIONS_EMULATOR: 'true', CLOCK_OVERRIDE: 'nope' })).toThrow(
      'Invalid CLOCK_OVERRIDE',
    );
  });

  it('fixedClock returns the given instant', () => {
    const { fixedClock } = jest.requireActual('../../src/infra/clock');
    expect(fixedClock(new Date('2026-01-01T00:00:00Z')).now().toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });
});
