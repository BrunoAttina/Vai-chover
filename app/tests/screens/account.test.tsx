import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AccountScreen from '../../src/app/(main)/account';
import { useSession } from '../../src/context/session';
import { ApiError } from '../../src/services/api';
import { signOutUser } from '../../src/services/session';

const mockApi = { deleteAccount: jest.fn() };
jest.mock('../../src/services/firebase', () => ({ getApi: () => mockApi }));
jest.mock('../../src/services/session', () => ({
  signOutUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/context/session', () => ({ useSession: jest.fn() }));

type AlertButtons = { text: string; onPress?: () => void }[];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    status: 'signedIn',
    user: { uid: 'u1', email: 'ana@example.com', authTime: new Date() },
    profile: { displayName: 'Ana' },
    needsProfile: false,
  });
});

function pressDestructive() {
  const buttons = jest.mocked(Alert.alert).mock.calls[0]?.[2] as AlertButtons;
  buttons.find((button) => button.text === 'Excluir')?.onPress?.();
}

describe('AccountScreen', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('shows name and e-mail and signs out', async () => {
    await render(<AccountScreen />);
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sign-out-button'));
    expect(signOutUser).toHaveBeenCalled();
  });

  it('asks for confirmation and deletes the account', async () => {
    mockApi.deleteAccount.mockResolvedValue({ ok: true });
    await render(<AccountScreen />);
    await fireEvent.press(screen.getByTestId('delete-account-button'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Excluir conta',
      expect.any(String),
      expect.any(Array),
    );
    expect(mockApi.deleteAccount).not.toHaveBeenCalled();

    pressDestructive();
    await waitFor(() => expect(signOutUser).toHaveBeenCalled());
    expect(mockApi.deleteAccount).toHaveBeenCalled();
  });

  it('shows an error when deletion fails', async () => {
    mockApi.deleteAccount.mockRejectedValue(new ApiError('unavailable', null));
    await render(<AccountScreen />);
    await fireEvent.press(screen.getByTestId('delete-account-button'));
    pressDestructive();
    expect(
      await screen.findByText('Sem conexão com o servidor. Verifique sua internet.'),
    ).toBeTruthy();
    expect(signOutUser).not.toHaveBeenCalled();
  });

  it('renders nothing without a session', async () => {
    jest.mocked(useSession).mockReturnValue({ status: 'signedOut' });
    await render(<AccountScreen />);
    expect(screen.queryByTestId('account-screen')).toBeNull();
  });
});
