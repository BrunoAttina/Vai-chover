import { requireSession, SESSION_MAX_AGE_MS } from '../../src/infra/session-guard';

const now = new Date('2026-11-21T12:00:00Z');
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

describe('requireSession', () => {
  it('rejects a missing auth context', () => {
    expect(() => requireSession(undefined, now)).toThrow(
      expect.objectContaining({ code: 'unauthenticated' }),
    );
  });

  it('rejects a session older than 60 days', () => {
    const authTime = seconds(new Date(now.getTime() - SESSION_MAX_AGE_MS - 1000));
    expect(() => requireSession({ uid: 'u1', token: { auth_time: authTime } }, now)).toThrow(
      expect.objectContaining({ code: 'unauthenticated' }),
    );
  });

  it('rejects a token without auth_time', () => {
    expect(() => requireSession({ uid: 'u1', token: {} }, now)).toThrow(
      expect.objectContaining({ code: 'unauthenticated' }),
    );
  });

  it('returns the uid for a valid session', () => {
    const authTime = seconds(new Date(now.getTime() - 60_000));
    expect(requireSession({ uid: 'u1', token: { auth_time: authTime } }, now)).toBe('u1');
  });
});

describe('session duration (FR-007)', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it('keeps the login for 60 days', () => {
    expect(SESSION_MAX_AGE_MS).toBe(60 * DAY_MS);
  });

  it('accepts a session signed in 59 days ago and rejects one from 61 days ago', () => {
    const at = (days: number) => seconds(new Date(now.getTime() - days * DAY_MS));
    expect(requireSession({ uid: 'u1', token: { auth_time: at(59) } }, now)).toBe('u1');
    expect(() => requireSession({ uid: 'u1', token: { auth_time: at(61) } }, now)).toThrow(
      expect.objectContaining({ code: 'unauthenticated' }),
    );
  });
});
