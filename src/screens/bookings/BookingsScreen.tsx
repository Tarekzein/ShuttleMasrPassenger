import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../components/AppCard';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingScreen } from '../../components/LoadingScreen';
import { COLORS, FONT_SIZE, RADIUS, SHADOWS, SPACING } from '../../theme';
import { useBookings } from '../../hooks/usePassengerQueries';
import type { Booking } from '../../types/passenger';
import { isBookingTrackingEligible } from '../../utils/trackingContract';

type Filter = 'upcoming' | 'active' | 'completed' | 'cancelled';

const filters: Filter[] = ['upcoming', 'active', 'completed', 'cancelled'];

const statusColors: Record<string, { bg: string; text: string }> = {
  CONFIRMED: { bg: COLORS.successLight, text: COLORS.success },
  COMPLETED: { bg: COLORS.infoLight, text: COLORS.info },
  CANCELLED: { bg: COLORS.dangerLight, text: COLORS.danger },
  REFUNDED: { bg: COLORS.warningLight, text: COLORS.warning },
  PENDING: { bg: COLORS.warningLight, text: COLORS.warning },
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function matchesFilter(booking: Booking, filter: Filter, now: number) {
  if (filter === 'cancelled') return ['CANCELLED', 'REFUNDED'].includes(booking.status);
  if (filter === 'completed') return booking.status === 'COMPLETED';
  if (filter === 'active') return isBookingTrackingEligible(booking);
  return (
    booking.status === 'CONFIRMED' &&
    new Date(booking.trip.departureTime).getTime() > now &&
    booking.trip.status === 'SCHEDULED' &&
    !isBookingTrackingEligible(booking)
  );
}

function StatusPill({ status }: { status: string }) {
  const colors = statusColors[status] ?? { bg: COLORS.borderLight, text: COLORS.textSecondary };
  return (
    <View style={[styles.statusPill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

function BookingCard({ booking, onPress, onTrack }: { booking: Booking; onPress: () => void; onTrack: () => void }) {
  const { t } = useTranslation();
  const seatLabel = `${booking.seats} seat${booking.seats > 1 ? 's' : ''}`;
  const paymentLabel = `${booking.payment?.status ?? 'PENDING'} - ${booking.payment?.method ?? booking.paymentMethod}`;
  const live = isBookingTrackingEligible(booking);

  return (
    <AppCard onPress={onPress} style={styles.bookingCard}>
      <View style={styles.cardTop}>
        <View style={styles.dateTile}>
          <Text style={styles.dateMonth}>{formatDate(booking.trip.departureTime).split(' ')[1]}</Text>
          <Text style={styles.dateDay}>{formatDate(booking.trip.departureTime).split(' ')[2]}</Text>
        </View>
        <View style={styles.cardMain}>
          <View style={styles.lineRow}>
            <Text style={styles.line} numberOfLines={1}>{booking.trip.line.name}</Text>
            <StatusPill status={booking.status} />
          </View>
          <Text style={styles.time}>{formatDate(booking.trip.departureTime)} at {formatTime(booking.trip.departureTime)}</Text>
        </View>
      </View>

      <View style={styles.routeBox}>
        <View style={styles.routeDotColumn}>
          <View style={[styles.routeDot, styles.pickupDot]} />
          <View style={styles.routeLine} />
          <View style={[styles.routeDot, styles.dropoffDot]} />
        </View>
        <View style={styles.routeTextColumn}>
          <Text style={styles.routeLabel}>Pickup</Text>
          <Text style={styles.routeName} numberOfLines={1}>{booking.pickupStop.nameEn}</Text>
          <Text style={[styles.routeLabel, styles.dropoffLabel]}>Drop-off</Text>
          <Text style={styles.routeName} numberOfLines={1}>{booking.dropoffStop.nameEn}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}><Text style={styles.metaPillText}>{seatLabel}</Text></View>
        <View style={styles.metaPill}><Text style={styles.metaPillText}>{Number(booking.totalFare).toFixed(0)} EGP</Text></View>
        <View style={styles.metaPill}><Text style={styles.metaPillText}>{paymentLabel}</Text></View>
      </View>

      {live ? (
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={(event) => {
            event.stopPropagation();
            onTrack();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('tracking.resume')}
        >
          <Text style={styles.trackBtnText}>{t('tracking.resume')}</Text>
        </TouchableOpacity>
      ) : null}
    </AppCard>
  );
}

export default function BookingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useBookings();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const now = Date.now();
  const allBookings = query.data ?? [];
  const counts = useMemo(
    () =>
      filters.reduce(
        (acc, item) => ({ ...acc, [item]: allBookings.filter((booking) => matchesFilter(booking, item, now)).length }),
        {} as Record<Filter, number>,
      ),
    [allBookings, now],
  );
  const bookings = allBookings.filter((booking) => matchesFilter(booking, filter, now));

  if (query.isLoading) return <LoadingScreen />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Your rides</Text>
          <Text style={styles.title}>{t('bookings.title')}</Text>
          <Text style={styles.subtitle}>Track every ShuttleMasr ride from confirmation to ticket history.</Text>
        </View>

        <View style={styles.summaryPanel}>
          <View>
            <Text style={styles.summaryNumber}>{allBookings.length}</Text>
            <Text style={styles.summaryLabel}>Total bookings</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryNumber}>{counts.active}</Text>
            <Text style={styles.summaryLabel}>Active now</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryNumber}>{counts.upcoming}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filter, filter === item && styles.activeFilter]}
            >
              <Text style={[styles.filterText, filter === item && styles.activeText]}>
                {t(`bookings.${item}`)} ({counts[item]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.list}>
          {bookings.length ? (
            bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={() => router.push(`/booking/${booking.id}`)}
                onTrack={() => router.push(`/tracking/${booking.id}`)}
              />
            ))
          ) : (
            <EmptyState title={t('bookings.empty')} icon="BK" />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 56, paddingBottom: 120 },
  header: { marginBottom: SPACING.lg },
  kicker: { color: COLORS.primaryDark, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: FONT_SIZE.display, fontWeight: '900', color: COLORS.text, marginTop: SPACING.xs },
  subtitle: { color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 20 },
  summaryPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.text, borderRadius: RADIUS.xxl, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  summaryNumber: { color: COLORS.primary, fontSize: FONT_SIZE.xxl, fontWeight: '900', textAlign: 'center' },
  summaryLabel: { color: COLORS.white, opacity: 0.8, fontSize: FONT_SIZE.xs, fontWeight: '800', marginTop: SPACING.xs, textAlign: 'center' },
  summaryDivider: { width: 1, height: 42, backgroundColor: 'rgba(255,255,255,0.16)' },
  filters: { gap: SPACING.sm, paddingVertical: SPACING.md },
  filter: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  activeFilter: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textSecondary, fontWeight: '800' },
  activeText: { color: COLORS.text },
  list: { flexGrow: 1, paddingTop: SPACING.sm },
  bookingCard: { padding: SPACING.md },
  cardTop: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  dateTile: { width: 58, height: 62, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  dateMonth: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: '900', textTransform: 'uppercase' },
  dateDay: { color: COLORS.text, fontSize: FONT_SIZE.xxl, fontWeight: '900' },
  cardMain: { flex: 1 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  line: { flex: 1, fontSize: FONT_SIZE.lg, fontWeight: '900', color: COLORS.text },
  time: { color: COLORS.textSecondary, marginTop: SPACING.xs, fontWeight: '700' },
  statusPill: { borderRadius: RADIUS.full, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.sm },
  statusText: { fontSize: FONT_SIZE.xs, fontWeight: '900' },
  routeBox: { flexDirection: 'row', marginTop: SPACING.lg, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, padding: SPACING.md },
  routeDotColumn: { alignItems: 'center', marginRight: SPACING.md, paddingVertical: 3 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  pickupDot: { backgroundColor: COLORS.success },
  dropoffDot: { backgroundColor: COLORS.danger },
  routeLine: { width: 2, flex: 1, minHeight: 28, backgroundColor: COLORS.border, marginVertical: 4 },
  routeTextColumn: { flex: 1 },
  routeLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontWeight: '900', textTransform: 'uppercase' },
  dropoffLabel: { marginTop: SPACING.md },
  routeName: { color: COLORS.text, fontWeight: '800', marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  metaPill: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md },
  metaPillText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: FONT_SIZE.sm },
  trackBtn: { marginTop: SPACING.md, minHeight: 44, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, alignItems: 'center', justifyContent: 'center' },
  trackBtnText: { color: COLORS.text, fontWeight: '900' },
});
