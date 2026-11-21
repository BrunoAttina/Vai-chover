import { act, renderHook } from '@testing-library/react-native';
import {
  SessionProvider,
  useSession,
  useSessionState,
  useSignedInUser,
} from '../../src/context/session';
import {
  subscribeProfile,
  subscribeUser,
  type Profile,
  type SessionUser,
} from '../../src/services/session';

jest.mock('../../src/services/session', () => ({
  subscribeUser: jest.fn(),
  subscribeProfile: jest.fn(),
}));

const mockedSubscribeUser = jest.mocked(subscribeUser);
const mockedSubscribeProfile = jest.mocked(subscribeProfile);

let emitUser: (user: SessionUser | null) => void;
let emitProfile: (profile: Profile | null) => void;
const user: SessionUser = { uid: 'u1', email: 'ana@example.com', authTime: new Date() };

beforeEach(() => {
  mockedSubscribeUser.mockImplementation((callback) => {
    emitUser = callback;
    return jest.fn();
  });
  mockedSubscribeProfile.mockImplementation((_uid, callback) => {
    emitProfile = callback;
    return jest.fn();
  });
});

describe('useSessionState', () => {
  it('starts loading, then reports signed out', async () => {
    const { result } = await renderHook(() => useSessionState());
    expect(result.current.status).toBe('loading');
    await act(async () => emitUser(null));
    expect(result.current.status).toBe('signedOut');
  });

  it('waits for the profile and flags a missing display name', async () => {
    const { result } = await renderHook(() => useSessionState());
    await act(async () => emitUser(user));
    expect(result.current.status).toBe('loading');

    await act(async () => emitProfile({ displayName: null }));
    expect(result.current).toMatchObject({ status: 'signedIn', needsProfile: true });

    await act(async () => emitProfile({ displayName: 'Ana' }));
    expect(result.current).toMatchObject({ status: 'signedIn', needsProfile: false, user });
  });

  it('treats a missing profile document as needing a profile', async () => {
    const { result } = await renderHook(() => useSessionState());
    await act(async () => emitUser(user));
    await act(async () => emitProfile(null));
    expect(result.current).toMatchObject({ status: 'signedIn', needsProfile: true });
  });
});

describe('SessionProvider', () => {
  it('shares the session with children', async () => {
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await act(async () => emitUser(null));
    expect(result.current.status).toBe('signedOut');
  });

  it('useSignedInUser throws without a session', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useSignedInUser())).rejects.toThrow(
      'useSignedInUser requires an active session',
    );
  });
});
