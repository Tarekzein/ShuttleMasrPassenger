/**
 * Thin analytics facade for the passenger app (no payment details or
 * unnecessary personal data — spec §17). Logs in development; the single
 * `track()` chokepoint can later forward to an analytics provider.
 */
export type AnalyticsEvent =
  | 'tracking_opened'
  | 'tracking_access_revoked'
  | 'driver_located'
  | 'notification_permission_failure';

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, props);
  }
  // TODO: forward to an analytics provider here.
}
