import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { AnalysisStatus, Period, RainValue } from '@vai-chover/shared';
import { getFirebase } from './firebase';
import type { LastPeriodResult } from '../components/LastPeriodCard';

export type TallyCounts = Partial<Record<Period, number[]>>;

const EMPTY_COUNTS = [0, 0, 0, 0, 0, 0];

/** Contagens em tempo real dos períodos informados (FR-016). */
export function subscribeTallies(
  regionId: string,
  localDate: string,
  periods: Period[],
  callback: (counts: TallyCounts) => void,
): () => void {
  const { db } = getFirebase();
  const counts: TallyCounts = Object.fromEntries(periods.map((period) => [period, EMPTY_COUNTS]));
  callback({ ...counts });
  const unsubscribers = periods.map((period) =>
    onSnapshot(doc(db, 'tallies', `${regionId}_${localDate}_${period}`), (snapshot) => {
      counts[period] = snapshot.exists() ? (snapshot.data().counts as number[]) : EMPTY_COUNTS;
      callback({ ...counts });
    }),
  );
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/** Períodos em que a pessoa já votou na data. */
export async function fetchVotedPeriods(uid: string, localDate: string): Promise<Period[]> {
  const { db } = getFirebase();
  const periods: Period[] = ['madrugada', 'manha', 'tarde', 'noite'];
  const snapshots = await Promise.all(
    periods.map((period) => getDoc(doc(db, 'votes', `${uid}_${localDate}_${period}`))),
  );
  return periods.filter((_, index) => snapshots[index]?.exists());
}

interface VoteData {
  regionId: string;
  localDate: string;
  targetPeriod: Period;
  value: RainValue;
  matchedRegion: boolean | null;
  regionRoundedMean: RainValue | null;
}

/** Resultado do período encerrado mais recente em que a pessoa votou (FR-025). */
export async function fetchLastResult(uid: string): Promise<LastPeriodResult | null> {
  const { db } = getFirebase();
  const recent = await getDocs(
    query(
      collection(db, 'votes'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(10),
    ),
  );
  const closed = recent.docs
    .map((snapshot) => snapshot.data() as VoteData)
    .filter((vote) => vote.matchedRegion !== null && vote.regionRoundedMean !== null)
    .sort((a, b) =>
      a.localDate + order(a.targetPeriod) < b.localDate + order(b.targetPeriod) ? 1 : -1,
    )[0];
  if (!closed) {
    return null;
  }
  const analysis = await getDoc(
    doc(db, 'periodAnalyses', `${closed.regionId}_${closed.localDate}_${closed.targetPeriod}`),
  );
  return {
    period: closed.targetPeriod,
    localDate: closed.localDate,
    myValue: closed.value,
    regionRoundedMean: closed.regionRoundedMean as RainValue,
    matchedRegion: closed.matchedRegion as boolean,
    status: (analysis.data()?.status as AnalysisStatus | undefined) ?? 'pending',
  };
}

function order(period: Period): string {
  return String(['madrugada', 'manha', 'tarde', 'noite'].indexOf(period));
}
