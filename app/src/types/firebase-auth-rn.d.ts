// O Firebase JS SDK exporta getReactNativePersistence no build "react-native" (usado pelo Metro),
// mas os tipos públicos de `firebase/auth` não o declaram. Esta declaração preenche essa lacuna.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  interface ReactNativeAsyncStorage {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
