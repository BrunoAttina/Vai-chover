import { completeProfileInput, type OkOutput } from '@vai-chover/shared';
import { parseInput } from '../infra/errors';
import { requireSession, type AuthContext } from '../infra/session-guard';
import { setDisplayName } from '../infra/users-repository';
import type { Deps } from '../infra/deps';

export async function completeProfile(
  deps: Deps,
  auth: AuthContext | undefined,
  data: unknown,
): Promise<OkOutput> {
  const uid = requireSession(auth, deps.clock.now());
  const input = parseInput(completeProfileInput, data);
  await setDisplayName(deps.db, uid, input.displayName);
  return { ok: true };
}
