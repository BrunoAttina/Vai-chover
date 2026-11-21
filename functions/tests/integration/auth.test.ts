import { requestLoginCode } from '../../src/auth/request-login-code';
import { verifyLoginCode } from '../../src/auth/verify-login-code';
import { completeProfile } from '../../src/auth/complete-profile';
import { hmac } from '../../src/auth/otp';
import { COLLECTIONS } from '../../src/infra/firestore';
import { authFor, clearEmulators, makeDeps, testClock, type TestClock } from './helpers';
import type { Deps } from '../../src/infra/deps';

const EMAIL = 'ana@example.com';

let clock: TestClock;
let deps: Deps;
let codeQueue: string[];

beforeEach(async () => {
  await clearEmulators();
  clock = testClock('2026-11-21T12:00:00Z');
  codeQueue = [];
  deps = makeDeps({ clock });
});

async function request(input: unknown, code = '123456') {
  codeQueue.push(code);
  return requestLoginCode(deps, input, () => codeQueue.shift() ?? '000000');
}

async function mailDocs() {
  const snapshot = await deps.db.collection(COLLECTIONS.mail).get();
  return snapshot.docs.map((doc) => doc.data());
}

describe('requestLoginCode', () => {
  it('returns the same generic response for new and existing accounts', async () => {
    await expect(request({ email: EMAIL, displayName: 'Ana' })).resolves.toEqual({
      sent: true,
      expiresInSeconds: 900,
    });
    await verifyLoginCode(deps, { email: EMAIL, code: '123456' });
    await expect(request({ email: EMAIL })).resolves.toEqual({ sent: true, expiresInSeconds: 900 });
  });

  it('queues an e-mail with the code and stores only its hash', async () => {
    await request({ email: ' Ana@Example.com ', displayName: 'Ana' }, '654321');
    const [mail] = await mailDocs();
    expect(mail?.to).toBe(EMAIL);
    expect(mail?.message.text).toContain('654321');

    const codeDoc = await deps.db
      .collection(COLLECTIONS.loginCodes)
      .doc(hmac('test-pepper', EMAIL))
      .get();
    expect(codeDoc.data()?.codeHash).toBe(hmac('test-pepper', '654321'));
    expect(JSON.stringify(codeDoc.data())).not.toContain('654321');
    expect(codeDoc.data()?.pendingDisplayName).toBe('Ana');
  });

  it('replaces the previous code on resend', async () => {
    await request({ email: EMAIL }, '111111');
    await request({ email: EMAIL }, '222222');
    await expect(verifyLoginCode(deps, { email: EMAIL, code: '111111' })).rejects.toMatchObject({
      code: 'permission-denied',
      details: { reason: 'invalid_code' },
    });
    await expect(verifyLoginCode(deps, { email: EMAIL, code: '222222' })).resolves.toMatchObject({
      isNewUser: true,
    });
  });

  it('blocks the 6th request within one hour', async () => {
    for (let index = 0; index < 5; index += 1) {
      await request({ email: EMAIL });
    }
    await expect(request({ email: EMAIL })).rejects.toMatchObject({ code: 'resource-exhausted' });
    clock.advance(61 * 60_000);
    await expect(request({ email: EMAIL })).resolves.toMatchObject({ sent: true });
  });

  it('rejects invalid input', async () => {
    await expect(request({ email: 'bad' })).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});

describe('verifyLoginCode', () => {
  it('creates the Auth user and profile, returning a custom token', async () => {
    await request({ email: EMAIL, displayName: 'Ana' });
    const result = await verifyLoginCode(deps, { email: EMAIL, code: '123456' });

    expect(result).toMatchObject({ isNewUser: true, needsProfile: false });
    expect(typeof result.customToken).toBe('string');
    const user = await deps.auth.getUserByEmail(EMAIL);
    const profile = await deps.db.collection(COLLECTIONS.users).doc(user.uid).get();
    expect(profile.data()).toMatchObject({
      displayName: 'Ana',
      emailLower: EMAIL,
      lastRegionId: null,
    });
  });

  it('asks for a profile when signing in without a name', async () => {
    await request({ email: EMAIL });
    await expect(verifyLoginCode(deps, { email: EMAIL, code: '123456' })).resolves.toMatchObject({
      isNewUser: true,
      needsProfile: true,
    });
  });

  it('does not duplicate the account nor overwrite the name on a new sign-up', async () => {
    await request({ email: EMAIL, displayName: 'Ana' });
    await verifyLoginCode(deps, { email: EMAIL, code: '123456' });
    await request({ email: EMAIL, displayName: 'Outra' });
    const second = await verifyLoginCode(deps, { email: EMAIL, code: '123456' });

    expect(second).toMatchObject({ isNewUser: false, needsProfile: false });
    const users = await deps.auth.listUsers();
    expect(users.users).toHaveLength(1);
    const profile = await deps.db.collection(COLLECTIONS.users).doc(users.users[0]!.uid).get();
    expect(profile.data()?.displayName).toBe('Ana');
  });

  it('is single use', async () => {
    await request({ email: EMAIL });
    await verifyLoginCode(deps, { email: EMAIL, code: '123456' });
    await expect(verifyLoginCode(deps, { email: EMAIL, code: '123456' })).rejects.toMatchObject({
      details: { reason: 'invalid_code' },
    });
  });

  it('expires after 15 minutes', async () => {
    await request({ email: EMAIL });
    clock.advance(15 * 60_000);
    await expect(verifyLoginCode(deps, { email: EMAIL, code: '123456' })).rejects.toMatchObject({
      code: 'permission-denied',
      details: { reason: 'expired' },
    });
  });

  it('locks after 5 wrong attempts', async () => {
    await request({ email: EMAIL });
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(verifyLoginCode(deps, { email: EMAIL, code: '000000' })).rejects.toMatchObject({
        details: { reason: 'invalid_code' },
      });
    }
    await expect(verifyLoginCode(deps, { email: EMAIL, code: '000000' })).rejects.toMatchObject({
      details: { reason: 'locked' },
    });
    await expect(verifyLoginCode(deps, { email: EMAIL, code: '123456' })).rejects.toMatchObject({
      details: { reason: 'locked' },
    });
  });
});

describe('completeProfile', () => {
  it('saves a valid display name', async () => {
    await request({ email: EMAIL });
    await verifyLoginCode(deps, { email: EMAIL, code: '123456' });
    const { uid } = await deps.auth.getUserByEmail(EMAIL);

    await expect(
      completeProfile(deps, authFor(uid, clock), { displayName: '  Bia  ' }),
    ).resolves.toEqual({ ok: true });
    const profile = await deps.db.collection(COLLECTIONS.users).doc(uid).get();
    expect(profile.data()?.displayName).toBe('Bia');
  });

  it('rejects an invalid name and unauthenticated calls', async () => {
    await expect(
      completeProfile(deps, authFor('u1', clock), { displayName: 'B' }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(completeProfile(deps, undefined, { displayName: 'Bia' })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });
});
