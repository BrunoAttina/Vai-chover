import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export const COLLECTIONS = {
  users: 'users',
  loginCodes: 'loginCodes',
  mail: 'mail',
  regions: 'regions',
  votes: 'votes',
  tallies: 'tallies',
  forecasts: 'forecasts',
  periodAnalyses: 'periodAnalyses',
} as const;

function ensureApp(): void {
  if (getApps().length === 0) {
    initializeApp();
  }
}

export function getDb(): Firestore {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth(): Auth {
  ensureApp();
  return getAuth();
}

/** IDs determinísticos (data-model.md). */
export const ids = {
  vote: (uid: string, localDate: string, period: string) => `${uid}_${localDate}_${period}`,
  tally: (regionId: string, localDate: string, period: string) =>
    `${regionId}_${localDate}_${period}`,
  forecast: (regionId: string, localDate: string) => `${regionId}_${localDate}`,
  analysis: (regionId: string, localDate: string, period: string) =>
    `${regionId}_${localDate}_${period}`,
};
