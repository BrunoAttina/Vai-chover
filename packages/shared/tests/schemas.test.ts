import {
  requestLoginCodeInput,
  verifyLoginCodeInput,
  completeProfileInput,
  resolveRegionInput,
  listMunicipalitiesInput,
  submitVotesInput,
  getForecastInput,
  deleteAccountInput,
  normalizeEmail,
} from '../src/schemas';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com');
  });
});

describe('requestLoginCodeInput', () => {
  it('accepts e-mail only (sign-in) and normalizes it', () => {
    expect(requestLoginCodeInput.parse({ email: ' Ana@Example.com ' })).toEqual({
      email: 'ana@example.com',
    });
  });

  it('accepts and trims display name (sign-up)', () => {
    expect(requestLoginCodeInput.parse({ email: 'a@b.co', displayName: '  Ana  ' })).toEqual({
      email: 'a@b.co',
      displayName: 'Ana',
    });
  });

  it.each([
    { email: 'not-an-email' },
    { email: 'a@b.co', displayName: ' A ' },
    {
      email: 'a@b.co',
      displayName: 'x'.repeat(31),
    },
  ])('rejects %j', (input) => {
    expect(requestLoginCodeInput.safeParse(input).success).toBe(false);
  });
});

describe('verifyLoginCodeInput', () => {
  it('accepts exactly six digits', () => {
    expect(verifyLoginCodeInput.safeParse({ email: 'a@b.co', code: '012345' }).success).toBe(true);
  });
  it.each(['12345', '1234567', '12a456'])('rejects code %p', (code) => {
    expect(verifyLoginCodeInput.safeParse({ email: 'a@b.co', code }).success).toBe(false);
  });
});

describe('completeProfileInput', () => {
  it('requires 2 to 30 characters after trim', () => {
    expect(completeProfileInput.safeParse({ displayName: 'Jo' }).success).toBe(true);
    expect(completeProfileInput.safeParse({ displayName: '   ' }).success).toBe(false);
  });
});

describe('resolveRegionInput', () => {
  it('accepts gps source', () => {
    const parsed = resolveRegionInput.parse({
      source: 'gps',
      latitude: -23.55,
      longitude: -46.63,
      city: 'São Paulo',
      state: 'SP',
    });
    expect(parsed.source).toBe('gps');
  });

  it('accepts manual source with IBGE code', () => {
    expect(resolveRegionInput.safeParse({ source: 'manual', ibgeCode: '3550308' }).success).toBe(
      true,
    );
  });

  it.each([
    { source: 'gps', latitude: 91, longitude: 0 },
    { source: 'gps', latitude: 0, longitude: -181 },
    { source: 'manual', ibgeCode: '123' },
    { source: 'other' },
  ])('rejects %j', (input) => {
    expect(resolveRegionInput.safeParse(input).success).toBe(false);
  });
});

describe('listMunicipalitiesInput', () => {
  it('requires a two-letter UF', () => {
    expect(listMunicipalitiesInput.safeParse({ state: 'SP' }).success).toBe(true);
    expect(listMunicipalitiesInput.safeParse({ state: 'sp' }).success).toBe(false);
  });
});

describe('submitVotesInput', () => {
  const base = { regionId: '3550308', localDate: '2026-11-21' };

  it('accepts 1 to 4 votes with values 0–5', () => {
    expect(
      submitVotesInput.safeParse({
        ...base,
        votes: [
          { targetPeriod: 'manha', value: 0 },
          { targetPeriod: 'tarde', value: 5 },
        ],
      }).success,
    ).toBe(true);
  });

  it.each([
    { ...base, votes: [] },
    { ...base, votes: [{ targetPeriod: 'manha', value: 6 }] },
    { ...base, votes: [{ targetPeriod: 'manha', value: 1.5 }] },
    { ...base, votes: [{ targetPeriod: 'almoco', value: 1 }] },
    {
      ...base,
      votes: [
        { targetPeriod: 'manha', value: 1 },
        { targetPeriod: 'manha', value: 2 },
      ],
    },
    { regionId: 'abc', localDate: '2026-11-21', votes: [{ targetPeriod: 'manha', value: 1 }] },
    { regionId: '3550308', votes: [{ targetPeriod: 'manha', value: 1 }] },
  ])('rejects %j', (input) => {
    expect(submitVotesInput.safeParse(input).success).toBe(false);
  });
});

describe('getForecastInput', () => {
  it('validates date format and periods', () => {
    expect(
      getForecastInput.safeParse({
        regionId: '3550308',
        localDate: '2026-11-21',
        periods: ['noite'],
      }).success,
    ).toBe(true);
    expect(
      getForecastInput.safeParse({
        regionId: '3550308',
        localDate: '21/11/2026',
        periods: ['noite'],
      }).success,
    ).toBe(false);
  });
});

describe('deleteAccountInput', () => {
  it('accepts an empty object', () => {
    expect(deleteAccountInput.safeParse({}).success).toBe(true);
  });
});
