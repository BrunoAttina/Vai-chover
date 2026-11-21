import { HttpsError } from 'firebase-functions/v2/https';
import { requestLoginCodeInput, type RequestLoginCodeOutput } from '@vai-chover/shared';
import { parseInput } from '../infra/errors';
import { buildLoginCodeMail, enqueueMail } from '../infra/mailer';
import type { Deps } from '../infra/deps';
import { generateCode, hmac } from './otp';
import { checkRateLimit } from './rate-limit';
import { CODE_TTL_MS, loginCodeRef, toLoginCode, toLoginCodeDoc } from './login-code-repository';

/**
 * Envia um código de acesso por e-mail (cadastro e login). A resposta é sempre a mesma,
 * exista a conta ou não, para não permitir enumeração de e-mails.
 */
export async function requestLoginCode(
  deps: Deps,
  data: unknown,
  newCode: () => string = generateCode,
): Promise<RequestLoginCodeOutput> {
  const input = parseInput(requestLoginCodeInput, data);
  const now = deps.clock.now();
  const ref = loginCodeRef(deps.db, hmac(deps.otpPepper, input.email));

  await deps.db.runTransaction(async (tx) => {
    const existing = toLoginCode((await tx.get(ref)).data());
    const limit = checkRateLimit(existing?.requestTimestamps ?? [], now);
    if (!limit.allowed) {
      throw new HttpsError('resource-exhausted', 'Too many code requests.');
    }
    const code = newCode();
    tx.set(
      ref,
      toLoginCodeDoc({
        codeHash: hmac(deps.otpPepper, code),
        expiresAt: new Date(now.getTime() + CODE_TTL_MS),
        attempts: 0,
        pendingDisplayName: input.displayName ?? existing?.pendingDisplayName ?? null,
        requestTimestamps: limit.recent,
      }),
    );
    enqueueMail(deps.db, tx, buildLoginCodeMail(input.email, code, now));
  });

  deps.logger.info('auth.codeRequested');
  return { sent: true, expiresInSeconds: CODE_TTL_MS / 1000 };
}
