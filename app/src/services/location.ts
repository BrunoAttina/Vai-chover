import * as Location from 'expo-location';

export type LocationResult =
  | { status: 'granted'; latitude: number; longitude: number; city?: string; state?: string }
  | { status: 'denied' }
  | { status: 'unavailable' };

/**
 * Localização em primeiro plano via expo-location (incluído no Expo Go — sem código nativo).
 * A cidade/UF da geocodificação reversa ajudam o servidor a casar o município.
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return { status: 'denied' };
  }
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;
    const address = await Location.reverseGeocodeAsync({ latitude, longitude })
      .then((results) => results[0])
      .catch(() => undefined);
    const city = address?.city ?? address?.subregion ?? undefined;
    const state = address?.region ?? undefined;
    return {
      status: 'granted',
      latitude,
      longitude,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    };
  } catch {
    return { status: 'unavailable' };
  }
}
