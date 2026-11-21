import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import ResultsScreen from '../../src/app/(main)/results';
import { useRegionContext } from '../../src/context/region';
import { subscribeTallies, type TallyCounts } from '../../src/services/data';

const mockApi = { getForecast: jest.fn() };
jest.mock('../../src/services/firebase', () => ({ getApi: () => mockApi }));
jest.mock('../../src/services/data', () => ({
  subscribeTallies: jest.fn(),
  fetchLastResult: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/context/region', () => ({ useRegionContext: jest.fn() }));
jest.mock('../../src/context/session', () => ({
  useSignedInUser: () => ({ uid: 'u1', email: 'a@b.co', authTime: new Date() }),
}));

let emit: (counts: TallyCounts) => void;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRegionContext).mockReturnValue({
    region: {
      regionId: '3550308',
      name: 'São Paulo',
      state: 'SP',
      timezone: 'America/Sao_Paulo',
      currentPeriod: 'manha',
      localDate: '2026-11-21',
      serverNow: '2026-11-21T12:00:00Z',
    },
    setRegion: jest.fn(),
  });
  jest.mocked(subscribeTallies).mockImplementation((_r, _d, _p, callback) => {
    emit = callback;
    return jest.fn();
  });
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});

describe('ResultsScreen', () => {
  it('shows the counts of every voted period and updates live', async () => {
    mockApi.getForecast.mockResolvedValue({ available: false });
    await render(<ResultsScreen />);
    expect(screen.getByTestId('result-manha')).toBeTruthy();
    expect(screen.getByTestId('result-tarde')).toBeTruthy();
    expect(screen.getByTestId('result-noite')).toBeTruthy();
    expect(screen.getByText('Você acha que vai chover agora pela manhã?')).toBeTruthy();

    await act(async () => emit({ manha: [0, 0, 3, 1, 0, 0] }));
    expect(screen.getByTestId('bars-manha-count-2').props.children).toBe(3);
    expect(screen.getByTestId('bars-tarde-count-0').props.children).toBe(0);
  });

  it('uses the periods passed by the vote screen and shows the notice', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({
      periods: 'tarde,noite,invalid',
      notice: 'Não registramos: manhã (o período já terminou).',
    });
    mockApi.getForecast.mockResolvedValue({ available: false });
    await render(<ResultsScreen />);
    expect(screen.queryByTestId('result-manha')).toBeNull();
    expect(screen.getByText('Não registramos: manhã (o período já terminou).')).toBeTruthy();
    expect(mockApi.getForecast).toHaveBeenCalledWith({
      regionId: '3550308',
      localDate: '2026-11-21',
      periods: ['tarde', 'noite'],
    });
  });

  it('shows the official forecast below the counts', async () => {
    mockApi.getForecast.mockResolvedValue({
      available: true,
      periods: {
        manha: { probability: 10, willRain: false },
        tarde: { probability: 60, willRain: true },
      },
      fetchedAt: '2026-11-21T12:00:00Z',
    });
    await render(<ResultsScreen />);
    await waitFor(() =>
      expect(screen.getByText('Vai chover · 60% de chance de chuva')).toBeTruthy(),
    );
    expect(screen.getByText('Não vai chover · 10% de chance de chuva')).toBeTruthy();
    expect(screen.getAllByText('Previsão temporariamente indisponível')).toHaveLength(1);
  });

  it('keeps counts visible when the forecast is unavailable', async () => {
    mockApi.getForecast.mockResolvedValue({ available: false });
    await render(<ResultsScreen />);
    await waitFor(() =>
      expect(screen.getAllByText('Previsão temporariamente indisponível')).toHaveLength(3),
    );
    expect(screen.getByTestId('bars-manha')).toBeTruthy();
  });

  it('redirects without a region', async () => {
    jest.mocked(useRegionContext).mockReturnValue({ region: null, setRegion: jest.fn() });
    await render(<ResultsScreen />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
  });
});
