import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebase } from './firebase';

/** FR-007: a sessão vale 60 dias a partir do login. */
export const SESSION_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  uid: string;
  email: string | null;
  authTime: Date;
}

export interface Profile {
  displayName: string | null;
}

export function isSessionExpired(authTime: Date, now: Date = new Date()): boolean {
  return now.getTime() - authTime.getTime() > SESSION_MAX_AGE_MS;
}

/** Observa o usuário autenticado; encerra localmente sessões com mais de 60 dias. */
export function subscribeUser(callback: (user: SessionUser | null) => void): () => void {
  const { auth } = getFirebase();
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    const token = await user.getIdTokenResult();
    const authTime = new Date(token.authTime);
    if (isSessionExpired(authTime)) {
      await signOut(auth);
      return;
    }
    callback({ uid: user.uid, email: user.email, authTime });
  });
}

export function subscribeProfile(
  uid: string,
  callback: (profile: Profile | null) => void,
): () => void {
  const { db } = getFirebase();
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => callback(snapshot.exists() ? (snapshot.data() as Profile) : null),
    () => callback(null),
  );
}

export async function signInWithToken(customToken: string): Promise<void> {
  await signInWithCustomToken(getFirebase().auth, customToken);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebase().auth);
}
