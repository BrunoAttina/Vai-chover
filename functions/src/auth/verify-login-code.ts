import { HttpsError } from 'firebase-functions/v2/https';
import {
  verifyLoginCodeInput,
  type LoginDeniedReason,
  type VerifyLoginCodeOutput,
} from '@vai-chover/shared';
import type { Auth } from 'firebase-admin/auth';
import { parseInput } from '../infra/errors';
import { ensureUserProfile } from '../infra/users-repository';
import type { Deps } from '../infra/deps';
import { hmac, safeEqual } from './otp';
import { MAX_ATTEMPTS, loginCodeRef, toLoginCode } from './login-code-repository';

type CheckResult =
  { ok: true; pendingDisplayName: string | null } | { ok: false; reason: LoginDeniedReason };

/** Valida o código (uso único, 15 min, 5 tentativas) e devolve um custom token do Firebase Auth. */
export async function verifyLoginCode(deps: Deps, data: unknown): Promise<VerifyLoginCodeOutput> {
  const input = parseInput(verifyLoginCodeInput, data);
  const now = deps.clock.now();
  const ref = loginCodeRef(deps.db, hmac(deps.otpPepper, input.email));

  const result = await deps.db.runTransaction<CheckResult>(async (tx) => {
    const code = toLoginCode((await tx.get(ref)).data());
    if (!code) {
      return { ok: false, reason: 'invalid_code' };
    }
    if (code.expiresAt.getTime() <= now.getTime()) {
      tx.delete(ref);
      return { ok: false, reason: 'expired' };
    }
    if (code.attempts >= MAX_ATTEMPTS) {
      return { ok: false, reason: 'locked' };
    }
    if (!safeEqual(hmac(deps.otpPepper, input.code), code.codeHash)) {
      const attempts = code.attempts + 1;
      tx.update(ref, { attempts });
      return { ok: false, reason: attempts >= MAX_ATTEMPTS ? 'locked' : 'invalid_code' };
    }
    tx.delete(ref);
    return { ok: true, pendingDisplayName: code.pendingDisplayName };
  });

  if (!result.ok) {
    deps.logger.warn('auth.codeRejected', { reason: result.reason });
    throw new HttpsError('permission-denied', 'Login code rejected.', { reason: result.reason });
  }

  const { uid, isNewUser } = await findOrCreateUser(deps.auth, input.email);
  const displayName = await ensureUserProfile(
    deps.db,
    uid,
    input.email,
    result.pendingDisplayName,
    now,
  );
  const customToken = await deps.auth.createCustomToken(uid);
  deps.logger.info('auth.signedIn', { isNewUser });
  return { customToken, isNewUser, needsProfile: !displayName };
}

async function findOrCreateUser(
  auth: Auth,
  email: string,
): Promise<{ uid: string; isNewUser: boolean }> {
  try {
    const user = await auth.getUserByEmail(email);
    return { uid: user.uid, isNewUser: false };
  } catch (error) {
    if ((error as { code?: string }).code !== 'auth/user-not-found') {
      throw error;
    }
    const user = await auth.createUser({ email, emailVerified: true });
    return { uid: user.uid, isNewUser: true };
  }
}
