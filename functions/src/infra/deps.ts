import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Clock } from './clock';
import type { Logger } from './logger';
import type { WeatherProvider } from '../weather/open-meteo-client';

/** Dependências injetadas nos casos de uso (facilita testes com emuladores e fakes). */
export interface Deps {
  db: Firestore;
  auth: Auth;
  clock: Clock;
  logger: Logger;
  otpPepper: string;
  weather: WeatherProvider;
}
