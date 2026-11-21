import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  subscribeProfile,
  subscribeUser,
  type Profile,
  type SessionUser,
} from '../services/session';

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: SessionUser; profile: Profile | null; needsProfile: boolean };

/** Estado da sessão: usuário autenticado + perfil (nome de exibição). */
export function useSessionState(): SessionState {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => subscribeUser(setUser), []);

  useEffect(() => {
    if (!user) {
      setProfile(undefined);
      return undefined;
    }
    return subscribeProfile(user.uid, setProfile);
  }, [user]);

  if (user === undefined) {
    return { status: 'loading' };
  }
  if (user === null) {
    return { status: 'signedOut' };
  }
  if (profile === undefined) {
    return { status: 'loading' };
  }
  return { status: 'signedIn', user, profile, needsProfile: !profile?.displayName };
}

const SessionContext = createContext<SessionState>({ status: 'loading' });

export function SessionProvider({ children }: { children: ReactNode }) {
  const state = useSessionState();
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

/** Atalho para telas que só existem com sessão ativa. */
export function useSignedInUser(): SessionUser {
  const session = useSession();
  if (session.status !== 'signedIn') {
    throw new Error('useSignedInUser requires an active session');
  }
  return session.user;
}
