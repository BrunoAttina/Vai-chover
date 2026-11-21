import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Period, ResolveRegionOutput } from '@vai-chover/shared';
import LocationScreen from '../../src/app/(main)/index';
import VoteScreen from '../../src/app/(main)/vote';
import { useRegionContext } from '../../src/context/region';
import { ApiError } from '../../src/services/api';
import { fetchLastResult, fetchVotedPeriods } from '../../src/services/data';
import { getCurrentLocation } from '../../src/services/location';

const mockApi = {
  resolveRegion: jest.fn(),
  listMunicipalities: jest.fn(),
  submitVotes: jest.fn(),
};
const mockSetRegion = jest.fn();

jest.mock('../../src/services/firebase', () => ({ getApi: () => mockApi }));
jest.mock('../../src/services/location', () => ({ getCurrentLocation: jest.fn() }));
jest.mock('../../src/services/data', () => ({
  fetchVotedPeriods: jest.fn(),
  fetchLastResult: jest.fn(),
}));
jest.mock('../../src/context/region', () => ({ useRegionContext: jest.fn() }));
jest.mock('../../src/context/session', () => ({
  useSignedInUser: () => ({ uid: 'u1', email: 'a@b.co', authTime: new Date() }),
}));

function regionAt(currentPeriod: Period): ResolveRegionOutput {
  return {
    regionId: '3550308',
    name: 'São Paulo',
    state: 'SP',
    timezone: 'America/Sao_Paulo',
    currentPeriod,
    localDate: '2026-11-21',
    serverNow: '2026-11-21T12:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchVotedPeriods).mockResolvedValue([]);
  jest.mocked(fetchLastResult).mockResolvedValue(null);
});

describe('LocationScreen', () => {
  beforeEach(() => {
    jest.mocked(useRegionContext).mockReturnValue({ region: null, setRegion: mockSetRegion });
  });

  it('resolves the city from GPS and goes to voting', async () => {
    jest
      .mocked(getCurrentLocation)
      .mockResolvedValue({ status: 'granted', latitude: -23.5, longitude: -46.6 });
    mockApi.resolveRegion.mockResolvedValue(regionAt('manha'));
    await render(<LocationScreen />);
    await fireEvent.press(screen.getByTestId('use-location-button'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/vote'));
    expect(mockSetRegion).toHaveBeenCalledWith(regionAt('manha'));
  });

  it('offers a manual UF + city picker when permission is denied', async () => {
    jest.mocked(getCurrentLocation).mockResolvedValue({ status: 'denied' });
    mockApi.listMunicipalities.mockResolvedValue({
      items: [
        { ibgeCode: '1400050', name: 'Alto Alegre' },
        { ibgeCode: '1400100', name: 'Boa Vista' },
        { ibgeCode: '1400506', name: 'São João da Baliza' },
      ],
    });
    mockApi.resolveRegion.mockResolvedValue(regionAt('tarde'));
    await render(<LocationScreen />);
    await fireEvent.press(screen.getByTestId('use-location-button'));

    expect(
      await screen.findByText('Sem acesso à localização. Escolha sua cidade na lista.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByTestId('uf-RR'));
    expect(await screen.findByTestId('city-1400100')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('city-filter'), 'boa');
    expect(screen.queryByTestId('city-1400050')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('city-filter'), 'SAO JOAO');
    expect(screen.getByTestId('city-1400506')).toBeTruthy();
    expect(screen.queryByTestId('city-1400100')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('city-filter'), 'boa');

    await fireEvent.press(screen.getByTestId('city-1400100'));
    expect(mockApi.listMunicipalities).toHaveBeenCalledWith({ state: 'RR' });
    expect(mockApi.resolveRegion).toHaveBeenCalledWith({ source: 'manual', ibgeCode: '1400100' });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/vote'));
  });

  it('shows an error when the city list fails', async () => {
    jest.mocked(getCurrentLocation).mockResolvedValue({ status: 'unavailable' });
    mockApi.listMunicipalities.mockRejectedValue(new ApiError('unavailable', null));
    await render(<LocationScreen />);
    await fireEvent.press(screen.getByTestId('use-location-button'));
    await fireEvent.press(await screen.findByTestId('uf-SP'));
    expect(
      await screen.findByText('Sem conexão com o servidor. Verifique sua internet.'),
    ).toBeTruthy();
  });
});

describe('VoteScreen', () => {
  it('redirects to location when there is no region', async () => {
    jest.mocked(useRegionContext).mockReturnValue({ region: null, setRegion: mockSetRegion });
    await render(<VoteScreen />);
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
  });

  it.each([
    ['madrugada', 4],
    ['manha', 3],
    ['tarde', 2],
    ['noite', 1],
  ] as const)('shows the questions of the %s (%i)', async (period, count) => {
    jest
      .mocked(useRegionContext)
      .mockReturnValue({ region: regionAt(period), setRegion: mockSetRegion });
    await render(<VoteScreen />);
    expect(screen.getAllByTestId(/^question-[a-z]+-slider$/)).toHaveLength(count);
  });

  it('enables confirm only after all answers and submits them', async () => {
    jest
      .mocked(useRegionContext)
      .mockReturnValue({ region: regionAt('tarde'), setRegion: mockSetRegion });
    mockApi.submitVotes.mockResolvedValue({
      localDate: '2026-11-21',
      currentPeriod: 'tarde',
      accepted: ['tarde', 'noite'],
      rejected: [],
    });
    await render(<VoteScreen />);
    const confirm = screen.getByTestId('confirm-votes-button');
    await waitFor(() => expect(confirm.props.accessibilityState).toMatchObject({ disabled: true }));

    await fireEvent(screen.getByTestId('question-tarde-slider'), 'valueChange', 2);
    expect(screen.getByTestId('confirm-votes-button').props.accessibilityState.disabled).toBe(true);
    await fireEvent(screen.getByTestId('question-noite-slider'), 'valueChange', 5);
    await waitFor(() =>
      expect(screen.getByTestId('confirm-votes-button').props.accessibilityState.disabled).toBe(
        false,
      ),
    );

    await fireEvent.press(screen.getByTestId('confirm-votes-button'));
    expect(mockApi.submitVotes).toHaveBeenCalledWith({
      regionId: '3550308',
      localDate: '2026-11-21',
      votes: [
        { targetPeriod: 'tarde', value: 2 },
        { targetPeriod: 'noite', value: 5 },
      ],
    });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/results',
      params: { periods: 'tarde,noite', notice: '' },
    });
  });

  it('warns about rejected periods', async () => {
    jest
      .mocked(useRegionContext)
      .mockReturnValue({ region: regionAt('noite'), setRegion: mockSetRegion });
    mockApi.submitVotes.mockRejectedValue(
      new ApiError('failed-precondition', {
        result: { rejected: [{ targetPeriod: 'noite', reason: 'period_ended' }] },
      }),
    );
    await render(<VoteScreen />);
    await fireEvent(screen.getByTestId('question-noite-slider'), 'valueChange', 1);
    await waitFor(() =>
      expect(screen.getByTestId('confirm-votes-button').props.accessibilityState.disabled).toBe(
        false,
      ),
    );
    await fireEvent.press(screen.getByTestId('confirm-votes-button'));
    expect(await screen.findByText('Não registramos: noite (o período já terminou).')).toBeTruthy();
  });

  it('goes to results when every period was already voted', async () => {
    jest
      .mocked(useRegionContext)
      .mockReturnValue({ region: regionAt('noite'), setRegion: mockSetRegion });
    mockApi.submitVotes.mockRejectedValue(
      new ApiError('failed-precondition', {
        result: { rejected: [{ targetPeriod: 'noite', reason: 'already_voted' }] },
      }),
    );
    await render(<VoteScreen />);
    await fireEvent(screen.getByTestId('question-noite-slider'), 'valueChange', 1);
    await waitFor(() =>
      expect(screen.getByTestId('confirm-votes-button').props.accessibilityState.disabled).toBe(
        false,
      ),
    );
    await fireEvent.press(screen.getByTestId('confirm-votes-button'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/results'));
  });

  it('shows generic errors', async () => {
    jest
      .mocked(useRegionContext)
      .mockReturnValue({ region: regionAt('noite'), setRegion: mockSetRegion });
    mockApi.submitVotes.mockRejectedValue(new ApiError('unavailable', null));
    await render(<VoteScreen />);
    await fireEvent(screen.getByTestId('question-noite-slider'), 'valueChange', 1);
    await waitFor(() =>
      expect(screen.getByTestId('confirm-votes-button').props.accessibilityState.disabled).toBe(
        false,
      ),
    );
    await fireEvent.press(screen.getByTestId('confirm-votes-button'));
    expect(
      await screen.findByText('Sem conexão com o servidor. Verifique sua internet.'),
    ).toBeTruthy();
  });

  it('skips voting when the current period was already voted', async () => {
    jest
      .mocked(useRegionContext)
      .mockReturnValue({ region: regionAt('manha'), setRegion: mockSetRegion });
    jest.mocked(fetchVotedPeriods).mockResolvedValue(['manha', 'tarde', 'noite']);
    await render(<VoteScreen />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/results'));
  });

  it('shows the last period card when available', async () => {
    jest
      .mocked(useRegionContext)
      .mockReturnValue({ region: regionAt('tarde'), setRegion: mockSetRegion });
    jest.mocked(fetchLastResult).mockResolvedValue({
      period: 'manha',
      localDate: '2026-11-21',
      myValue: 2,
      regionRoundedMean: 2,
      matchedRegion: true,
      status: 'majorityRight',
    });
    await render(<VoteScreen />);
    expect(await screen.findByTestId('last-period-card')).toBeTruthy();
  });
});
