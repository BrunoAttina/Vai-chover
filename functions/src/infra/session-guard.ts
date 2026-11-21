import { HttpsError } from 'firebase-functions/v2/https';

/** Sessão válida por 60 dias a partir do login (FR-007). */
export const SESSION_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;

export interface AuthContext {
  uid: string;
  token: { auth_time?: number };
}

/** Garante sessão autenticada e não expirada; retorna o uid. */
export function requireSession(auth: AuthContext | undefined, now: Date): string {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  const authTime = auth.token.auth_time;
  if (typeof authTime !== 'number' || now.getTime() - authTime * 1000 > SESSION_MAX_AGE_MS) {
    throw new HttpsError('unauthenticated', 'Session expired.');
  }
  return auth.uid;
}
