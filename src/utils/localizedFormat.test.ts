import {
  formatCairoDateTime,
  formatEstimatedArrival,
  formatLastSeen,
  formatLocalizedNumber,
} from './localizedFormat';

describe('localized journey formatting', () => {
  it('formats timestamps in Cairo rather than the test runner timezone', () => {
    expect(formatCairoDateTime('2026-08-22T21:00:00.000Z', 'en')).toMatch(/Aug 23/);
  });

  it('uses Arabic numerals and relative-time copy', () => {
    expect(formatLocalizedNumber(123, 'ar')).toBe('١٢٣');
    expect(formatLastSeen(75, 'ar')).toContain('١');
  });

  it('derives ETA only from the backend calculation timestamp and duration', () => {
    expect(formatEstimatedArrival('2026-08-22T18:00:00.000Z', 30 * 60, 'en')).toMatch(/09:30/);
    expect(formatEstimatedArrival(null, 30 * 60, 'en')).toBeNull();
  });
});
