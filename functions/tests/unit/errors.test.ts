import { z } from 'zod';
import { parseInput } from '../../src/infra/errors';
import { createLogger } from '../../src/infra/logger';

describe('parseInput', () => {
  const schema = z.object({ name: z.string().min(2) });

  it('returns parsed data', () => {
    expect(parseInput(schema, { name: 'Ana' })).toEqual({ name: 'Ana' });
  });

  it('throws invalid-argument with field paths only', () => {
    expect(() => parseInput(schema, { name: 'A' })).toThrow(
      expect.objectContaining({
        code: 'invalid-argument',
        details: { fields: ['name'] },
      }),
    );
  });
});

describe('createLogger', () => {
  it('writes structured entries through the sink', () => {
    const sink = jest.fn();
    createLogger(sink).info('closePeriods.run', { talliesClosed: 2 });
    expect(sink).toHaveBeenCalledWith('INFO', { event: 'closePeriods.run', talliesClosed: 2 });
  });

  it('logs errors with severity ERROR', () => {
    const sink = jest.fn();
    createLogger(sink).error('weather.failed', { reason: 'timeout' });
    expect(sink).toHaveBeenCalledWith('ERROR', { event: 'weather.failed', reason: 'timeout' });
  });
});
