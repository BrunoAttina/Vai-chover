import { Timestamp, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from './firestore';

/** Documento `users/{uid}` (data-model.md `users.displayName`, `users.emailLower`, `users.createdAt`, `users.lastRegionId`). */
export interface UserDoc {
  displayName: string | null;
  emailLower: string;
  createdAt: Timestamp;
  lastRegionId: string | null;
}

export function userRef(db: Firestore, uid: string): DocumentReference {
  return db.collection(COLLECTIONS.users).doc(uid);
}

/** Cria o perfil se não existir, ou aplica o nome pendente se ainda não houver nome. Retorna o nome final. */
export async function ensureUserProfile(
  db: Firestore,
  uid: string,
  emailLower: string,
  pendingDisplayName: string | null,
  now: Date,
): Promise<string | null> {
  const ref = userRef(db, uid);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      const doc: UserDoc = {
        displayName: pendingDisplayName,
        emailLower,
        createdAt: Timestamp.fromDate(now),
        lastRegionId: null,
      };
      tx.create(ref, doc);
      return pendingDisplayName;
    }
    const current = (snapshot.data() as UserDoc).displayName;
    if (!current && pendingDisplayName) {
      tx.update(ref, { displayName: pendingDisplayName });
      return pendingDisplayName;
    }
    return current;
  });
}

export async function setDisplayName(
  db: Firestore,
  uid: string,
  displayName: string,
): Promise<void> {
  await userRef(db, uid).set({ displayName }, { merge: true });
}

export async function setLastRegion(db: Firestore, uid: string, regionId: string): Promise<void> {
  await userRef(db, uid).set({ lastRegionId: regionId }, { merge: true });
}
