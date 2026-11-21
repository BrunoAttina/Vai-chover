import { checkRateLimit, MAX_CODE_REQUESTS_PER_HOUR } from '../../src/auth/rate-limit';

const now = new Date('2026-11-21T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe('checkRateLimit', () => {
  it('allows up to 5 requests per rolling hour', () => {
    expect(MAX_CODE_REQUESTS_PER_HOUR).toBe(5);
    const four = [1, 2, 3, 4].map(minutesAgo);
    expect(checkRateLimit(four, now)).toEqual({ allowed: true, recent: [...four, now] });
  });

  it('blocks the 6th request within the hour', () => {
    const five = [1, 2, 3, 4, 5].map(minutesAgo);
    expect(checkRateLimit(five, now).allowed).toBe(false);
  });

  it('forgets requests older than one hour', () => {
    const old = [61, 62, 63, 64, 65].map(minutesAgo);
    expect(checkRateLimit(old, now)).toEqual({ allowed: true, recent: [now] });
  });
});
