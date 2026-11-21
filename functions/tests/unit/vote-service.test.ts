import { evaluateVotes } from '../../src/votes/vote-service';

const TZ = 'America/Sao_Paulo';
const morning = new Date('2026-11-21T12:00:00Z'); // 09:00 local
const afternoon = new Date('2026-11-21T15:00:00Z'); // 12:00 local

describe('evaluateVotes', () => {
  it('accepts the current and remaining periods', () => {
    const result = evaluateVotes(
      [
        { targetPeriod: 'manha', value: 1 },
        { targetPeriod: 'tarde', value: 2 },
        { targetPeriod: 'noite', value: 3 },
      ],
      '2026-11-21',
      morning,
      TZ,
    );
    expect(result).toEqual({
      localDate: '2026-11-21',
      currentPeriod: 'manha',
      candidates: [
        { targetPeriod: 'manha', value: 1 },
        { targetPeriod: 'tarde', value: 2 },
        { targetPeriod: 'noite', value: 3 },
      ],
      rejected: [],
    });
  });

  it('rejects a period that ended while the questions were open (11:59 → 12:00)', () => {
    const result = evaluateVotes(
      [
        { targetPeriod: 'manha', value: 1 },
        { targetPeriod: 'tarde', value: 2 },
      ],
      '2026-11-21',
      afternoon,
      TZ,
    );
    expect(result.currentPeriod).toBe('tarde');
    expect(result.candidates).toEqual([{ targetPeriod: 'tarde', value: 2 }]);
    expect(result.rejected).toEqual([{ targetPeriod: 'manha', reason: 'period_ended' }]);
  });

  it('rejects everything from a previous day (questions opened at 23:59, sent at 00:01)', () => {
    const result = evaluateVotes(
      [{ targetPeriod: 'noite', value: 4 }],
      '2026-11-20',
      new Date('2026-11-21T03:01:00Z'),
      TZ,
    );
    expect(result.localDate).toBe('2026-11-21');
    expect(result.candidates).toEqual([]);
    expect(result.rejected).toEqual([{ targetPeriod: 'noite', reason: 'period_ended' }]);
  });

  it('rejects a future day as not offered', () => {
    const result = evaluateVotes([{ targetPeriod: 'manha', value: 0 }], '2026-11-22', morning, TZ);
    expect(result.rejected).toEqual([{ targetPeriod: 'manha', reason: 'not_offered' }]);
  });
});
