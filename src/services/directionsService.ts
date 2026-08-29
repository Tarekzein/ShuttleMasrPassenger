export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface EtaResult {
  durationSeconds: number;
  durationInTrafficSeconds: number;
  distanceMeters: number;
}

/** @deprecated V1 has no trusted server ETA. Never call a web-service route API from the passenger app. */
export async function fetchEta(_origin: LatLng, _destination: LatLng): Promise<EtaResult | null> {
  return null;
}

export function formatEtaMinutes(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}
