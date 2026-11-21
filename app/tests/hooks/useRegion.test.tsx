import { act, renderHook } from '@testing-library/react-native';
import type { ResolveRegionOutput } from '@vai-chover/shared';
import { useRegion } from '../../src/hooks/useRegion';
import { ApiError } from '../../src/services/api';

jest.mock('../../src/services/firebase', () => ({ getApi: jest.fn() }));

const region: ResolveRegionOutput = {
  regionId: '3550308',
  name: 'São Paulo',
  state: 'SP',
  timezone: 'America/Sao_Paulo',
  currentPeriod: 'manha',
  localDate: '2026-11-21',
  serverNow: '2026-11-21T12:00:00.000Z',
};

describe('useRegion', () => {
  it('resolves by GPS sending coordinates and city', async () => {
    const api = { resolveRegion: jest.fn().mockResolvedValue(region) };
    const locate = jest.fn().mockResolvedValue({
      status: 'granted',
      latitude: -23.5,
      longitude: -46.6,
      city: 'São Paulo',
      state: 'SP',
    });
    const { result } = await renderHook(() => useRegion({ api, locate }));

    await act(async () => {
      await result.current.locate();
    });

    expect(api.resolveRegion).toHaveBeenCalledWith({
      source: 'gps',
      latitude: -23.5,
      longitude: -46.6,
      city: 'São Paulo',
      state: 'SP',
    });
    expect(result.current.status).toBe('resolved');
    expect(result.current.region).toEqual(region);
  });

  it.each(['denied', 'unavailable'] as const)(
    'falls back to manual when location is %s',
    async (status) => {
      const api = { resolveRegion: jest.fn() };
      const { result } = await renderHook(() =>
        useRegion({ api, locate: jest.fn().mockResolvedValue({ status }) }),
      );
      await act(async () => {
        await result.current.locate();
      });
      expect(result.current.status).toBe('manual');
      expect(result.current.manualReason).toBe(status);
      expect(api.resolveRegion).not.toHaveBeenCalled();
    },
  );

  it('falls back to manual when the city is not identified', async () => {
    const api = { resolveRegion: jest.fn().mockRejectedValue(new ApiError('not-found', null)) };
    const locate = jest
      .fn()
      .mockResolvedValue({ status: 'granted', latitude: -10, longitude: -50 });
    const { result } = await renderHook(() => useRegion({ api, locate }));
    await act(async () => {
      await result.current.locate();
    });
    expect(result.current.status).toBe('manual');
    expect(result.current.manualReason).toBe('notFound');
  });

  it('falls back to manual with a clear reason when the location is outside Brazil', async () => {
    const api = {
      resolveRegion: jest
        .fn()
        .mockRejectedValue(new ApiError('invalid-argument', { reason: 'outside_brazil' })),
    };
    const locate = jest
      .fn()
      .mockResolvedValue({ status: 'granted', latitude: 37.42, longitude: -122.08 });
    const { result } = await renderHook(() => useRegion({ api, locate }));
    await act(async () => {
      await result.current.locate();
    });
    expect(result.current.status).toBe('manual');
    expect(result.current.manualReason).toBe('outsideBrazil');
    expect(result.current.error).toBeNull();
  });

  it('shows an error on other failures', async () => {
    const api = { resolveRegion: jest.fn().mockRejectedValue(new ApiError('unavailable', null)) };
    const locate = jest
      .fn()
      .mockResolvedValue({ status: 'granted', latitude: -10, longitude: -50 });
    const { result } = await renderHook(() => useRegion({ api, locate }));
    await act(async () => {
      await result.current.locate();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Sem conexão com o servidor. Verifique sua internet.');
  });

  it('resolves a manual choice and keeps manual mode on failure', async () => {
    const api = {
      resolveRegion: jest
        .fn()
        .mockRejectedValueOnce(new ApiError('internal', null))
        .mockResolvedValueOnce(region),
    };
    const { result } = await renderHook(() => useRegion({ api, locate: jest.fn() }));

    await act(async () => {
      await result.current.chooseManual('3550308');
    });
    expect(result.current.status).toBe('manual');

    await act(async () => {
      await result.current.chooseManual('3550308');
    });
    expect(api.resolveRegion).toHaveBeenLastCalledWith({ source: 'manual', ibgeCode: '3550308' });
    expect(result.current.status).toBe('resolved');
  });
});
