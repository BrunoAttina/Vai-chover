import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import SignInScreen from '../../src/app/(auth)/sign-in';
import SignUpScreen from '../../src/app/(auth)/sign-up';
import VerifyCodeScreen from '../../src/app/(auth)/verify-code';
import ProfileScreen from '../../src/app/(auth)/profile';
import { ApiError } from '../../src/services/api';
import { signInWithToken } from '../../src/services/session';

const mockApi = {
  requestLoginCode: jest.fn(),
  verifyLoginCode: jest.fn(),
  completeProfile: jest.fn(),
};
jest.mock('../../src/services/firebase', () => ({ getApi: () => mockApi }));
jest.mock('../../src/services/session', () => ({ signInWithToken: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.requestLoginCode.mockResolvedValue({ sent: true, expiresInSeconds: 900 });
});

describe('SignInScreen', () => {
  it('validates the e-mail before sending', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('email-input'), 'nope');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
    expect(mockApi.requestLoginCode).not.toHaveBeenCalled();
  });

  it('requests a code and goes to the code screen', async () => {
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('email-input'), ' Ana@Example.com ');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    expect(mockApi.requestLoginCode).toHaveBeenCalledWith({ email: 'ana@example.com' });
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/verify-code',
      params: { email: 'ana@example.com' },
    });
  });

  it('shows the rate-limit message', async () => {
    mockApi.requestLoginCode.mockRejectedValue(new ApiError('resource-exhausted', null));
    await render(<SignInScreen />);
    await fireEvent.changeText(screen.getByTestId('email-input'), 'a@b.co');
    await fireEvent.press(screen.getByTestId('send-code-button'));
    expect(screen.getByText('Muitas solicitações. Tente novamente mais tarde.')).toBeTruthy();
  });
});

describe('SignUpScreen', () => {
  it('validates name and e-mail', async () => {
    await render(<SignUpScreen />);
    await fireEvent.changeText(screen.getByTestId('name-input'), 'A');
    await fireEvent.changeText(screen.getByTestId('email-input'), 'bad');
    await fireEvent.press(screen.getByTestId('sign-up-button'));
    expect(screen.getByText('O nome deve ter de 2 a 30 caracteres.')).toBeTruthy();
    expect(screen.getByText('Informe um e-mail válido.')).toBeTruthy();
    expect(mockApi.requestLoginCode).not.toHaveBeenCalled();
  });

  it('sends name and e-mail without asking for a password', async () => {
    await render(<SignUpScreen />);
    expect(screen.queryByLabelText(/senha/i)).toBeNull();
    await fireEvent.changeText(screen.getByTestId('name-input'), ' Ana ');
    await fireEvent.changeText(screen.getByTestId('email-input'), 'ana@example.com');
    await fireEvent.press(screen.getByTestId('sign-up-button'));
    expect(mockApi.requestLoginCode).toHaveBeenCalledWith({
      email: 'ana@example.com',
      displayName: 'Ana',
    });
    expect(router.push).toHaveBeenCalled();
  });

  it('shows server errors', async () => {
    mockApi.requestLoginCode.mockRejectedValue(new ApiError('unavailable', null));
    await render(<SignUpScreen />);
    await fireEvent.changeText(screen.getByTestId('name-input'), 'Ana');
    await fireEvent.changeText(screen.getByTestId('email-input'), 'ana@example.com');
    await fireEvent.press(screen.getByTestId('sign-up-button'));
    expect(screen.getByText('Sem conexão com o servidor. Verifique sua internet.')).toBeTruthy();
  });
});

describe('VerifyCodeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useLocalSearchParams).mockReturnValue({ email: 'ana@example.com' });
  });
  afterEach(() => jest.useRealTimers());

  it('accepts only digits and requires six of them', async () => {
    await render(<VerifyCodeScreen />);
    await fireEvent.changeText(screen.getByTestId('code-input'), '12a3');
    expect(screen.getByTestId('code-input').props.value).toBe('123');
    await fireEvent.press(screen.getByTestId('verify-button'));
    expect(screen.getByText('O código tem 6 dígitos.')).toBeTruthy();
  });

  it('signs in with the custom token', async () => {
    mockApi.verifyLoginCode.mockResolvedValue({
      customToken: 'tok',
      isNewUser: false,
      needsProfile: false,
    });
    await render(<VerifyCodeScreen />);
    await fireEvent.changeText(screen.getByTestId('code-input'), '123456');
    await fireEvent.press(screen.getByTestId('verify-button'));
    expect(mockApi.verifyLoginCode).toHaveBeenCalledWith({
      email: 'ana@example.com',
      code: '123456',
    });
    expect(signInWithToken).toHaveBeenCalledWith('tok');
  });

  it.each([
    ['invalid_code', 'Código incorreto. Confira o e-mail e tente novamente.'],
    ['expired', 'Este código expirou. Peça um novo código.'],
    ['locked', 'Muitas tentativas erradas. Peça um novo código.'],
  ])('shows the %s message', async (reason, message) => {
    mockApi.verifyLoginCode.mockRejectedValue(new ApiError('permission-denied', { reason }));
    await render(<VerifyCodeScreen />);
    await fireEvent.changeText(screen.getByTestId('code-input'), '123456');
    await fireEvent.press(screen.getByTestId('verify-button'));
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('allows resending only after the 60 s countdown', async () => {
    await render(<VerifyCodeScreen />);
    expect(screen.getByText('Reenviar código em 60s')).toBeTruthy();
    for (let second = 0; second < 60; second += 1) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByText('Reenviar código')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('resend-button'));
    expect(mockApi.requestLoginCode).toHaveBeenCalledWith({ email: 'ana@example.com' });
    expect(screen.getByText('Enviamos um novo código.')).toBeTruthy();
  });

  it('shows the error when resending fails', async () => {
    mockApi.requestLoginCode.mockRejectedValue(new ApiError('resource-exhausted', null));
    await render(<VerifyCodeScreen />);
    for (let second = 0; second < 60; second += 1) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    await fireEvent.press(screen.getByTestId('resend-button'));
    expect(screen.getByText('Muitas solicitações. Tente novamente mais tarde.')).toBeTruthy();
  });
});

describe('ProfileScreen', () => {
  it('validates and saves the display name', async () => {
    mockApi.completeProfile.mockResolvedValue({ ok: true });
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByTestId('save-profile-button'));
    expect(screen.getByText('O nome deve ter de 2 a 30 caracteres.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('name-input'), 'Bia');
    await fireEvent.press(screen.getByTestId('save-profile-button'));
    expect(mockApi.completeProfile).toHaveBeenCalledWith({ displayName: 'Bia' });
  });

  it('shows server errors', async () => {
    mockApi.completeProfile.mockRejectedValue(new ApiError('unauthenticated', null));
    await render(<ProfileScreen />);
    await fireEvent.changeText(screen.getByTestId('name-input'), 'Bia');
    await fireEvent.press(screen.getByTestId('save-profile-button'));
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeTruthy();
  });
});
