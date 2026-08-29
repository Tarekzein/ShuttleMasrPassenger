const CAIRO_TIME_ZONE = 'Africa/Cairo';

function locale(language: string): string {
  return language.startsWith('ar') ? 'ar-EG' : 'en-EG';
}

export function formatLocalizedNumber(value: number, language: string, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale(language), { maximumFractionDigits }).format(value);
}

export function formatCairoDateTime(value: string, language: string): string {
  return new Intl.DateTimeFormat(locale(language), {
    timeZone: CAIRO_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatEstimatedArrival(
  calculatedAt: string | null,
  remainingDurationSeconds: number | null,
  language: string,
): string | null {
  if (!calculatedAt || remainingDurationSeconds == null || remainingDurationSeconds < 0) return null;
  const calculatedAtMs = Date.parse(calculatedAt);
  if (!Number.isFinite(calculatedAtMs)) return null;
  return new Intl.DateTimeFormat(locale(language), {
    timeZone: CAIRO_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(calculatedAtMs + remainingDurationSeconds * 1_000));
}

export function formatDurationSeconds(value: number, language: string): string {
  const minutes = Math.max(1, Math.round(value / 60));
  return language.startsWith('ar')
    ? `${formatLocalizedNumber(minutes, language)} د`
    : `${formatLocalizedNumber(minutes, language)} min`;
}

export function formatDistanceMeters(value: number, language: string): string {
  if (value >= 1_000) {
    const kilometers = value / 1_000;
    return language.startsWith('ar')
      ? `${formatLocalizedNumber(kilometers, language, 1)} كم`
      : `${formatLocalizedNumber(kilometers, language, 1)} km`;
  }
  return language.startsWith('ar')
    ? `${formatLocalizedNumber(Math.round(value), language)} م`
    : `${formatLocalizedNumber(Math.round(value), language)} m`;
}

export function formatLastSeen(ageSeconds: number, language: string): string {
  if (ageSeconds < 10) return language.startsWith('ar') ? 'الآن' : 'now';
  if (ageSeconds < 60) {
    const value = formatLocalizedNumber(ageSeconds, language);
    return language.startsWith('ar') ? `منذ ${value} ث` : `${value}s ago`;
  }
  const minutes = Math.floor(ageSeconds / 60);
  const value = formatLocalizedNumber(minutes, language);
  return language.startsWith('ar') ? `منذ ${value} د` : `${value}m ago`;
}
