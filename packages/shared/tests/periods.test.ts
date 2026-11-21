import {
  PERIODS,
  getPeriodForHour,
  getLocalClock,
  getOfferedPeriods,
  getPeriodWindow,
  hasPeriodEnded,
  getPeriodHours,
} from '../src/periods';

const SAO_PAULO = 'America/Sao_Paulo'; // UTC-3, sem horário de verão
const MANAUS = 'America/Manaus'; // UTC-4

describe('getPeriodForHour', () => {
  it.each([
    [0, 'madrugada'],
    [5, 'madrugada'],
    [6, 'manha'],
    [11, 'manha'],
    [12, 'tarde'],
    [17, 'tarde'],
    [18, 'noite'],
    [23, 'noite'],
  ] as const)('hour %i → %s', (hour, expected) => {
    expect(getPeriodForHour(hour)).toBe(expected);
  });

  it.each([-1, 24, 3.5])('rejects invalid hour %p', (hour) => {
    expect(() => getPeriodForHour(hour)).toThrow(RangeError);
  });
});

describe('getLocalClock', () => {
  it.each([
    ['2026-11-21T02:59:00Z', '2026-11-20', 'noite'], // 23:59 local
    ['2026-11-21T03:00:00Z', '2026-11-21', 'madrugada'], // 00:00 local — novo dia
    ['2026-11-21T08:59:00Z', '2026-11-21', 'madrugada'], // 05:59
    ['2026-11-21T09:00:00Z', '2026-11-21', 'manha'], // 06:00
    ['2026-11-21T14:59:00Z', '2026-11-21', 'manha'], // 11:59
    ['2026-11-21T15:00:00Z', '2026-11-21', 'tarde'], // 12:00
    ['2026-11-21T20:59:00Z', '2026-11-21', 'tarde'], // 17:59
    ['2026-11-21T21:00:00Z', '2026-11-21', 'noite'], // 18:00
  ])('at %s in São Paulo → %s %s', (iso, localDate, period) => {
    expect(getLocalClock(new Date(iso), SAO_PAULO)).toEqual({ localDate, period });
  });

  it('uses the region time zone (Manaus is one hour behind)', () => {
    expect(getLocalClock(new Date('2026-11-21T15:30:00Z'), MANAUS)).toEqual({
      localDate: '2026-11-21',
      period: 'manha',
    });
  });
});

describe('getOfferedPeriods', () => {
  it.each([
    ['madrugada', ['madrugada', 'manha', 'tarde', 'noite']],
    ['manha', ['manha', 'tarde', 'noite']],
    ['tarde', ['tarde', 'noite']],
    ['noite', ['noite']],
  ] as const)('%s offers %j', (current, expected) => {
    expect(getOfferedPeriods(current)).toEqual(expected);
  });

  it('keeps PERIODS in chronological order', () => {
    expect(PERIODS).toEqual(['madrugada', 'manha', 'tarde', 'noite']);
  });
});

describe('getPeriodWindow', () => {
  it('computes start and end instants in UTC for São Paulo', () => {
    expect(getPeriodWindow('2026-11-21', 'manha', SAO_PAULO)).toEqual({
      start: new Date('2026-11-21T09:00:00Z'),
      end: new Date('2026-11-21T15:00:00Z'),
    });
  });

  it('ends the night at midnight of the next day', () => {
    expect(getPeriodWindow('2026-11-21', 'noite', SAO_PAULO)).toEqual({
      start: new Date('2026-11-21T21:00:00Z'),
      end: new Date('2026-11-22T03:00:00Z'),
    });
  });

  it('handles month and year rollover for the night', () => {
    expect(getPeriodWindow('2026-12-31', 'noite', MANAUS).end).toEqual(
      new Date('2027-01-01T04:00:00Z'),
    );
  });

  it('starts the madrugada at local midnight', () => {
    expect(getPeriodWindow('2026-11-21', 'madrugada', MANAUS).start).toEqual(
      new Date('2026-11-21T04:00:00Z'),
    );
  });

  it('rejects malformed dates', () => {
    expect(() => getPeriodWindow('21/11/2026', 'manha', SAO_PAULO)).toThrow(RangeError);
  });
});

describe('hasPeriodEnded', () => {
  it('is false before the end and true at the end', () => {
    expect(hasPeriodEnded('2026-11-21', 'manha', SAO_PAULO, new Date('2026-11-21T14:59:59Z'))).toBe(
      false,
    );
    expect(hasPeriodEnded('2026-11-21', 'manha', SAO_PAULO, new Date('2026-11-21T15:00:00Z'))).toBe(
      true,
    );
  });
});

describe('getPeriodHours', () => {
  it('lists the six local hours of each period', () => {
    expect(getPeriodHours('madrugada')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(getPeriodHours('noite')).toEqual([18, 19, 20, 21, 22, 23]);
  });
});
