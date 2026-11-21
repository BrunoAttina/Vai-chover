import {
  computeMean,
  roundHalfUp,
  crowdSaysRain,
  didMatchRegion,
  isObservedRain,
  isForecastRain,
  resolveAnalysisStatus,
  OBSERVATION_DEADLINE_MS,
} from '../src/analysis';

describe('computeMean', () => {
  it('returns null without votes', () => {
    expect(computeMean(0, 0)).toBeNull();
  });
  it('divides sum by total', () => {
    expect(computeMean(7, 3)).toBeCloseTo(2.3333);
  });
});

describe('roundHalfUp', () => {
  it.each([
    [0, 0],
    [0.49, 0],
    [0.5, 1],
    [2.5, 3],
    [2.4999, 2],
    [4.5, 5],
    [5, 5],
  ])('%p → %p', (mean, expected) => {
    expect(roundHalfUp(mean)).toBe(expected);
  });

  it('rejects values outside the scale', () => {
    expect(() => roundHalfUp(5.1)).toThrow(RangeError);
    expect(() => roundHalfUp(-0.1)).toThrow(RangeError);
  });
});

describe('crowdSaysRain', () => {
  it('is true from Garoa (1) upwards', () => {
    expect(crowdSaysRain(0)).toBe(false);
    expect(crowdSaysRain(1)).toBe(true);
    expect(crowdSaysRain(5)).toBe(true);
  });
});

describe('didMatchRegion', () => {
  it('compares the vote with the rounded mean', () => {
    expect(didMatchRegion(3, 3)).toBe(true);
    expect(didMatchRegion(0, 4)).toBe(false);
  });
});

describe('thresholds', () => {
  it('observed rain starts at 0.1 mm', () => {
    expect(isObservedRain(0)).toBe(false);
    expect(isObservedRain(0.09)).toBe(false);
    expect(isObservedRain(0.1)).toBe(true);
  });
  it('forecast rain starts at 50%', () => {
    expect(isForecastRain(49)).toBe(false);
    expect(isForecastRain(50)).toBe(true);
  });
});

describe('resolveAnalysisStatus', () => {
  const closedAt = new Date('2026-11-21T15:00:00Z');
  const soon = new Date(closedAt.getTime() + 60_000);
  const late = new Date(closedAt.getTime() + OBSERVATION_DEADLINE_MS + 1);

  it('majority right when crowd and reality agree', () => {
    expect(
      resolveAnalysisStatus({ crowdSaysRain: true, observedRain: true, closedAt, now: soon }),
    ).toBe('majorityRight');
    expect(
      resolveAnalysisStatus({ crowdSaysRain: false, observedRain: false, closedAt, now: soon }),
    ).toBe('majorityRight');
  });

  it('majority wrong when they disagree', () => {
    expect(
      resolveAnalysisStatus({ crowdSaysRain: true, observedRain: false, closedAt, now: soon }),
    ).toBe('majorityWrong');
  });

  it('pending while observation is missing within 24 h', () => {
    expect(
      resolveAnalysisStatus({ crowdSaysRain: true, observedRain: null, closedAt, now: soon }),
    ).toBe('pending');
  });

  it('noData after 24 h without observation', () => {
    expect(
      resolveAnalysisStatus({ crowdSaysRain: true, observedRain: null, closedAt, now: late }),
    ).toBe('noData');
  });
});
