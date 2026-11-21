import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
} from 'firebase/functions';
import { createApi, type Api } from './api';

const useEmulators = process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';
const emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? '10.0.2.2';
/** Projeto usado pelo Emulator Suite (npm run emulators). */
const EMULATOR_PROJECT_ID = 'demo-vai-chover';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: useEmulators ? EMULATOR_PROJECT_ID : process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
}

let services: FirebaseServices | null = null;

/** Inicializa o Firebase uma única vez (sessão persistida com AsyncStorage). */
export function getFirebase(): FirebaseServices {
  if (services) {
    return services;
  }
  const isFirstInit = getApps().length === 0;
  const app = isFirstInit ? initializeApp(config) : getApp();
  const auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  const db = getFirestore(app);
  const functions = getFunctions(app, 'southamerica-east1');
  if (useEmulators && isFirstInit) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
  }
  services = { app, auth, db, functions };
  return services;
}

let api: Api | null = null;

export function getApi(): Api {
  api ??= createApi(async (name, data) => {
    const result = await httpsCallable(getFirebase().functions, name)(data);
    return result.data;
  });
  return api;
}
