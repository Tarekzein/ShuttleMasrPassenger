import Constants from 'expo-constants';

const GOOGLE_MAPS_API_KEY: string =
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ??
  (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined) ??
  '';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface EtaResult {
  durationSeconds: number;
  durationInTrafficSeconds: number;
  distanceMeters: number;
}

/**
 * Fetches a traffic-aware driving ETA between two points via the Google
 * Directions API. Read-only — the passenger app only displays ETAs and never
 * influences the driver's route.
 */
export async function fetchEta(origin: LatLng, destination: LatLng): Promise<EtaResult | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: 'driving',
    departure_time: 'now',
    key: GOOGLE_MAPS_API_KEY,
  });
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
    const json = await res.json();
    if (json.status !== 'OK' || !json.routes?.length) return null;
    const legs = json.routes[0].legs ?? [];
    const durationSeconds = legs.reduce((s: number, l: any) => s + (l.duration?.value ?? 0), 0);
    const durationInTrafficSeconds = legs.reduce(
      (s: number, l: any) => s + (l.duration_in_traffic?.value ?? l.duration?.value ?? 0),
      0,
    );
    const distanceMeters = legs.reduce((s: number, l: any) => s + (l.distance?.value ?? 0), 0);
    return { durationSeconds, durationInTrafficSeconds, distanceMeters };
  } catch {
    return null;
  }
}

export function formatEtaMinutes(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}
