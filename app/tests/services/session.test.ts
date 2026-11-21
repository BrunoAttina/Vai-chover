import { SESSION_MAX_AGE_MS, isSessionExpired } from '../../src/services/session';

jest.mock('../../src/services/firebase', () => ({ getFirebase: jest.fn() }));

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-21T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);

describe('session duration (FR-007)', () => {
  it('keeps the login saved on the device for 60 days', () => {
    expect(SESSION_MAX_AGE_MS).toBe(60 * DAY_MS);
  });

  it('expires only after 60 days', () => {
    expect(isSessionExpired(daysAgo(1), now)).toBe(false);
    expect(isSessionExpired(daysAgo(59), now)).toBe(false);
    expect(isSessionExpired(daysAgo(60), now)).toBe(false);
    expect(isSessionExpired(daysAgo(61), now)).toBe(true);
  });
});
