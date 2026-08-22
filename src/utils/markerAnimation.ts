export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Linear interpolation between two coordinates. Used to animate the shuttle
 * marker smoothly between discrete driver-location pings rather than letting it
 * jump (spec §15: "smooth marker movement rather than making the shuttle marker
 * jump between coordinates").
 */
export function interpolateLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * clamped,
    longitude: from.longitude + (to.longitude - from.longitude) * clamped,
  };
}

/** Bearing (deg, 0=N) from one coordinate to another — used to rotate the marker. */
export function bearing(from: LatLng, to: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLng) * Math.cos(toRad(to.latitude));
  const x =
    Math.cos(toRad(from.latitude)) * Math.sin(toRad(to.latitude)) -
    Math.sin(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Returns an unwrapped target that turns through the shortest arc. */
export function shortestHeadingTarget(current: number, desired: number): number {
  const delta = ((desired - current + 540) % 360) - 180;
  return current + delta;
}
