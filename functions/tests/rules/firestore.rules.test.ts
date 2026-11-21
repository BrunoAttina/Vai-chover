import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';

let env: RulesTestEnvironment;
const nowSeconds = () => Math.floor(Date.now() / 1000);
const DAY = 24 * 60 * 60;

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-vai-chover-rules',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8'),
      host: host!,
      port: Number(port),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/alice'), { displayName: 'Alice', emailLower: 'a@x.co' });
    await setDoc(doc(db, 'users/bob'), { displayName: 'Bob', emailLower: 'b@x.co' });
    await setDoc(doc(db, 'loginCodes/h1'), { codeHash: 'x' });
    await setDoc(doc(db, 'mail/m1'), { to: 'a@x.co' });
    await setDoc(doc(db, 'regions/3550308'), { name: 'São Paulo' });
    await setDoc(doc(db, 'votes/alice_2026-11-21_manha'), { uid: 'alice', value: 3 });
    await setDoc(doc(db, 'votes/bob_2026-11-21_manha'), { uid: 'bob', value: 1 });
    await setDoc(doc(db, 'tallies/3550308_2026-11-21_manha'), { total: 2 });
    await setDoc(doc(db, 'forecasts/3550308_2026-11-21'), { periods: {} });
    await setDoc(doc(db, 'periodAnalyses/3550308_2026-11-21_manha'), { status: 'pending' });
    await setDoc(doc(db, 'other/x'), { a: 1 });
  });
});

const user = (uid: string, authTime = nowSeconds()) =>
  env.authenticatedContext(uid, { auth_time: authTime }).firestore();

describe('unauthenticated', () => {
  it.each([
    'users/alice',
    'loginCodes/h1',
    'mail/m1',
    'regions/3550308',
    'votes/alice_2026-11-21_manha',
    'tallies/3550308_2026-11-21_manha',
    'forecasts/3550308_2026-11-21',
    'periodAnalyses/3550308_2026-11-21_manha',
    'other/x',
  ])('cannot read %s', async (path) => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), path)));
  });
});

describe('authenticated user', () => {
  it('reads own profile but not others', async () => {
    await assertSucceeds(getDoc(doc(user('alice'), 'users/alice')));
    await assertFails(getDoc(doc(user('alice'), 'users/bob')));
  });

  it('reads own votes but not others', async () => {
    await assertSucceeds(getDoc(doc(user('alice'), 'votes/alice_2026-11-21_manha')));
    await assertFails(getDoc(doc(user('alice'), 'votes/bob_2026-11-21_manha')));
  });

  it('can query votes only filtered by own uid', async () => {
    const db = user('alice');
    await assertSucceeds(getDocs(query(collection(db, 'votes'), where('uid', '==', 'alice'))));
    await assertFails(getDocs(collection(db, 'votes')));
  });

  it.each([
    'regions/3550308',
    'tallies/3550308_2026-11-21_manha',
    'forecasts/3550308_2026-11-21',
    'periodAnalyses/3550308_2026-11-21_manha',
  ])('reads aggregated data %s', async (path) => {
    await assertSucceeds(getDoc(doc(user('alice'), path)));
  });

  it.each(['loginCodes/h1', 'mail/m1', 'other/x'])('cannot read %s', async (path) => {
    await assertFails(getDoc(doc(user('alice'), path)));
  });

  it.each([
    'users/alice',
    'votes/alice_2026-11-21_manha',
    'votes/alice_2026-11-21_tarde',
    'tallies/3550308_2026-11-21_manha',
    'regions/3550308',
    'forecasts/3550308_2026-11-21',
    'periodAnalyses/3550308_2026-11-21_manha',
    'loginCodes/h1',
    'mail/m2',
  ])('cannot write %s', async (path) => {
    const db = user('alice');
    await assertFails(setDoc(doc(db, path), { uid: 'alice', value: 5 }));
    await assertFails(deleteDoc(doc(db, path)));
  });
});

describe('session age (FR-007)', () => {
  it('denies reads after 60 days since sign-in', async () => {
    const old = user('alice', nowSeconds() - 61 * DAY);
    await assertFails(getDoc(doc(old, 'tallies/3550308_2026-11-21_manha')));
    await assertFails(getDoc(doc(old, 'users/alice')));
  });

  it('allows reads within 60 days', async () => {
    const recent = user('alice', nowSeconds() - 59 * DAY);
    await assertSucceeds(getDoc(doc(recent, 'tallies/3550308_2026-11-21_manha')));
  });
});
