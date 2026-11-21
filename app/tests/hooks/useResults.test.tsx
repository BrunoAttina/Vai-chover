import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useForecast, useLastResult, useTallies } from '../../src/hooks/useResults';
import { subscribeTallies } from '../../src/services/data';
import type { LastPeriodResult } from '../../src/components/LastPeriodCard';

jest.mock('../../src/services/firebase', () => ({ getApi: jest.fn() }));
jest.mock('../../src/services/data', () => ({
  subscribeTallies: jest.fn(),
  fetchLastResult: jest.fn(),
}));

describe('useTallies', () => {
  it('subscribes to the periods and unsubscribes on unmount', async () => {
    const unsubscribe = jest.fn();
    let emit: (counts: Record<string, number[]>) => void = () => undefined;
    jest.mocked(subscribeTallies).mockImplementation((_r, _d, _p, callback) => {
      emit = callback;
      return unsubscribe;
    });

    const { result, unmount } = await renderHook(() =>
      useTallies('3550308', '2026-11-21', ['tarde', 'noite']),
    );
    expect(subscribeTallies).toHaveBeenCalledWith(
      '3550308',
      '2026-11-21',
      ['tarde', 'noite'],
      expect.any(Function),
    );

    await act(async () => emit({ tarde: [1, 0, 0, 0, 0, 0] }));
    expect(result.current).toEqual({ tarde: [1, 0, 0, 0, 0, 0] });

    await unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('useForecast', () => {
  it('loads the forecast for the periods', async () => {
    const api = {
      getForecast: jest.fn().mockResolvedValue({
        available: true,
        periods: { noite: { probability: 70, willRain: true } },
        fetchedAt: '2026-11-21T15:00:00Z',
      }),
    };
    const { result } = await renderHook(() => useForecast('3550308', '2026-11-21', ['noite'], api));
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'ready',
        periods: { noite: { probability: 70, willRain: true } },
      }),
    );
    expect(api.getForecast).toHaveBeenCalledWith({
      regionId: '3550308',
      localDate: '2026-11-21',
      periods: ['noite'],
    });
  });

  it('reports unavailable when the provider is down or the call fails', async () => {
    const down = { getForecast: jest.fn().mockResolvedValue({ available: false }) };
    const { result } = await renderHook(() =>
      useForecast('3550308', '2026-11-21', ['noite'], down),
    );
    await waitFor(() => expect(result.current.status).toBe('unavailable'));

    const failing = { getForecast: jest.fn().mockRejectedValue(new Error('offline')) };
    const second = await renderHook(() => useForecast('3550308', '2026-11-21', ['noite'], failing));
    await waitFor(() => expect(second.result.current.status).toBe('unavailable'));
  });
});

describe('useLastResult', () => {
  const lastResult: LastPeriodResult = {
    period: 'manha',
    localDate: '2026-11-21',
    myValue: 2,
    regionRoundedMean: 2,
    matchedRegion: true,
    status: 'pending',
  };

  it('loads the last closed result', async () => {
    const load = jest.fn().mockResolvedValue(lastResult);
    const { result } = await renderHook(() => useLastResult('u1', load));
    await waitFor(() => expect(result.current).toEqual(lastResult));
    expect(load).toHaveBeenCalledWith('u1');
  });

  it('returns null on failure', async () => {
    const load = jest.fn().mockRejectedValue(new Error('denied'));
    const { result } = await renderHook(() => useLastResult('u1', load));
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
