import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Booking } from '../types/passenger';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';
import { formatCairoDateTime } from '../utils/localizedFormat';
import { AppCard } from './AppCard';

interface ActiveTripBannerProps {
  booking: Booking;
  onPress: () => void;
}

export function ActiveTripBanner({ booking, onPress }: ActiveTripBannerProps) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const lineName = (isAr ? booking.trip.line.nameAr : booking.trip.line.name) ?? booking.trip.line.name;
  return (
    <AppCard
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('tracking.activeTripA11y', { line: lineName })}
      style={styles.card}
    >
      <View style={[styles.row, isAr && styles.rowReverse]}>
        <View style={styles.liveDot} />
        <View style={styles.content}>
          <Text style={[styles.kicker, isAr && styles.textRight]}>{t('tracking.activeTrip')}</Text>
          <Text style={[styles.title, isAr && styles.textRight]} numberOfLines={1}>
            {lineName}
          </Text>
          <Text style={[styles.meta, isAr && styles.textRight]}>
            {formatCairoDateTime(booking.trip.departureTime, i18n.language)}
          </Text>
        </View>
        <Text style={styles.action}>{t('tracking.resume')}</Text>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.text, borderColor: COLORS.text, marginBottom: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 52 },
  rowReverse: { flexDirection: 'row-reverse' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  content: { flex: 1 },
  kicker: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '900' },
  title: { color: COLORS.white, fontSize: FONT_SIZE.lg, fontWeight: '900', marginTop: 2 },
  meta: { color: COLORS.white, opacity: 0.75, fontSize: FONT_SIZE.sm, marginTop: 2 },
  textRight: { textAlign: 'right', writingDirection: 'rtl' },
  action: {
    color: COLORS.text,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    overflow: 'hidden',
    fontWeight: '900',
  },
});
