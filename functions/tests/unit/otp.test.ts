import { generateCode, hmac, safeEqual } from '../../src/auth/otp';

describe('generateCode', () => {
  it('produces six digits, zero-padded', () => {
    expect(generateCode(() => 42)).toBe('000042');
    expect(generateCode(() => 999_999)).toBe('999999');
  });

  it('uses a cryptographic random source by default', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateCode()));
    for (const code of codes) {
      expect(code).toMatch(/^\d{6}$/);
    }
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe('hmac', () => {
  it('is deterministic for the same pepper and value', () => {
    expect(hmac('pepper', '123456')).toBe(hmac('pepper', '123456'));
  });

  it('changes with the pepper and never contains the raw value', () => {
    const hash = hmac('pepper', 'ana@example.com');
    expect(hash).not.toBe(hmac('other', 'ana@example.com'));
    expect(hash).not.toContain('ana');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('safeEqual', () => {
  it('compares strings in constant time', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
