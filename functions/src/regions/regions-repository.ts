import type { Firestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../infra/firestore';
import type { Municipality } from './municipality-matcher';

/** Documento `regions/{ibgeCode}` (data-model.md `regions.name`, `regions.state`, `regions.timezone`, `regions.lat`, `regions.lon`). */
export interface Region {
  id: string;
  name: string;
  state: string;
  timezone: string;
  lat: number;
  lon: number;
}

export async function ensureRegion(db: Firestore, municipality: Municipality): Promise<Region> {
  const region: Region = {
    id: municipality.ibgeCode,
    name: municipality.name,
    state: municipality.state,
    timezone: municipality.timezone,
    lat: municipality.lat,
    lon: municipality.lon,
  };
  const { id, ...doc } = region;
  await db.collection(COLLECTIONS.regions).doc(id).set(doc);
  return region;
}

export async function getRegion(db: Firestore, regionId: string): Promise<Region | null> {
  const snapshot = await db.collection(COLLECTIONS.regions).doc(regionId).get();
  return snapshot.exists ? { id: snapshot.id, ...(snapshot.data() as Omit<Region, 'id'>) } : null;
}
