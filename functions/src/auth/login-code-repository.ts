import { Timestamp, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../infra/firestore';

/** Documento `loginCodes/{emailHash}` (data-model.md `loginCodes.*`). */
export interface LoginCode {
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  pendingDisplayName: string | null;
  requestTimestamps: Date[];
}

interface LoginCodeDoc {
  codeHash: string;
  expiresAt: Timestamp;
  attempts: number;
  pendingDisplayName: string | null;
  requestTimestamps: Timestamp[];
}

export const CODE_TTL_MS = 15 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

export function loginCodeRef(db: Firestore, emailHash: string): DocumentReference {
  return db.collection(COLLECTIONS.loginCodes).doc(emailHash);
}

export function toLoginCode(data: FirebaseFirestore.DocumentData | undefined): LoginCode | null {
  if (!data) {
    return null;
  }
  const doc = data as LoginCodeDoc;
  return {
    codeHash: doc.codeHash,
    expiresAt: doc.expiresAt.toDate(),
    attempts: doc.attempts,
    pendingDisplayName: doc.pendingDisplayName,
    requestTimestamps: doc.requestTimestamps.map((stamp) => stamp.toDate()),
  };
}

export function toLoginCodeDoc(code: LoginCode): LoginCodeDoc {
  return {
    codeHash: code.codeHash,
    expiresAt: Timestamp.fromDate(code.expiresAt),
    attempts: code.attempts,
    pendingDisplayName: code.pendingDisplayName,
    requestTimestamps: code.requestTimestamps.map((date) => Timestamp.fromDate(date)),
  };
}
