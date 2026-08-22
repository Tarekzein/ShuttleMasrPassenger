import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

// Google Maps on Android; Apple Maps on iOS (avoids the react-native-google-maps
// iOS pod). Route/markers render identically on either base map.
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../components/AppCard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ErrorState } from '../../components/ErrorState';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../theme';
import { useTripTracking } from '../../hooks/usePassengerQueries';
import { connectTripTracking, disconnectTracking } from '../../services/realtimeClient';
import { fetchEta, formatEtaMinutes } from '../../services/directionsService';
import { track } from '../../services/analytics';
import { interpolateLatLng, bearing, type LatLng } from '../../utils/markerAnimation';

const CAIRO: LatLng = { latitude: 30.0444, longitude: 31.2357 };

export default function TripTrackingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const id = bookingId ?? '';
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const trackingQuery = useTripTracking(id);
  const data = trackingQuery.data;

  // Smoothly-animated shuttle marker: we interpolate from the currently-shown
  // position to each new ping instead of snapping.
  const [markerPos, setMarkerPos] = useState<LatLng | null>(null);
  const [markerHeading, setMarkerHeading] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const animateTo = (target: LatLng) => {
    setMarkerPos((current) => {
      const from = current ?? target;
      setMarkerHeading(bearing(from, target));
      if (animRef.current) clearInterval(animRef.current);
      let step = 0;
      const steps = 20; // ~1s at 50ms
      animRef.current = setInterval(() => {
        step += 1;
        setMarkerPos(interpolateLatLng(from, target, step / steps));
        if (step >= steps && animRef.current) clearInterval(animRef.current);
      }, 50);
      return from;
    });
  };

  // Seed marker from the REST snapshot.
  useEffect(() => {
    if (data?.driverLocation) {
      const target = { latitude: data.driverLocation.lat, longitude: data.driverLocation.lng };
      setMarkerPos((cur) => cur ?? target);
    }
  }, [data?.driverLocation?.lat, data?.driverLocation?.lng]);

  // Traffic-aware ETA from the driver to the passenger's current target
  // (their pickup before boarding, the destination after). Recomputed whenever
  // the REST snapshot refreshes (~every 20s) to avoid hammering the API.
  useEffect(() => {
    if (!data?.trackingOpen || !data.driverLocation) {
      setEtaSeconds(null);
      return;
    }
    const target =
      data.etaTarget === 'DESTINATION'
        ? { latitude: data.dropoffStop.lat, longitude: data.dropoffStop.lng }
        : { latitude: data.pickupStop.lat, longitude: data.pickupStop.lng };
    let cancelled = false;
    fetchEta({ latitude: data.driverLocation.lat, longitude: data.driverLocation.lng }, target).then((res) => {
      if (!cancelled) setEtaSeconds(res ? res.durationInTrafficSeconds : null);
    });
    return () => {
      cancelled = true;
    };
  }, [data?.driverLocation?.lat, data?.driverLocation?.lng, data?.etaTarget, data?.trackingOpen]);

  // Analytics: tracking opened, and access revoked when the trip ends.
  useEffect(() => {
    if (!data) return;
    if (data.trackingOpen) track('tracking_opened', { bookingId: id, tripId: data.trip.id });
    else if (data.trip.status === 'COMPLETED' || data.trip.status === 'CANCELLED') {
      track('tracking_access_revoked', { bookingId: id, tripId: data.trip.id });
    }
  }, [data?.trackingOpen, data?.trip.status]);

  // Live updates over the socket while tracking is open.
  useEffect(() => {
    if (!id || !data?.trackingOpen) return;
    const tripId = data.trip.id;
    connectTripTracking(tripId, {
      onDriverLocation: (loc) => animateTo({ latitude: loc.lat, longitude: loc.lng }),
      onTripState: () => trackingQuery.refetch(),
      onStopUpdate: () => trackingQuery.refetch(),
    });
    return () => {
      disconnectTracking();
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [id, data?.trackingOpen, data?.trip.id]);

  const pickup = data?.pickupStop;
  const initialRegion = useMemo(
    () => ({
      latitude: markerPos?.latitude ?? pickup?.lat ?? CAIRO.latitude,
      longitude: markerPos?.longitude ?? pickup?.lng ?? CAIRO.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }),
    [markerPos, pickup],
  );

  if (trackingQuery.isLoading) return <LoadingScreen />;
  if (trackingQuery.isError || !data) return <ErrorState error={trackingQuery.error} onRetry={() => trackingQuery.refetch()} />;

  const etaLabel = data.etaTarget === 'DESTINATION' ? t('tracking.etaDestination') : t('tracking.etaPickup');
  const outstanding = Number(data.booking.outstandingAmount ?? 0);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: t('tracking.title') }} />
      <MapView ref={mapRef} provider={MAP_PROVIDER} style={styles.map} initialRegion={initialRegion}>
        {data.routeCoordinates.length > 1 && (
          <Polyline coordinates={data.routeCoordinates} strokeColor={COLORS.primary} strokeWidth={5} />
        )}
        {pickup && (
          <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title={t('tracking.yourPickup')} pinColor={COLORS.info} />
        )}
        {data.dropoffStop && (
          <Marker coordinate={{ latitude: data.dropoffStop.lat, longitude: data.dropoffStop.lng }} title={t('tracking.destination')} pinColor={COLORS.success} />
        )}
        {markerPos && (
          <Marker coordinate={markerPos} title={t('tracking.shuttle')} flat rotation={markerHeading} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.shuttleMarker}><Text style={styles.shuttleGlyph}>🚐</Text></View>
          </Marker>
        )}
      </MapView>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <AppCard>
          <Text style={styles.statusLabel}>{t('tracking.status')}</Text>
          <Text style={styles.statusValue}>{t(`tracking.state.${data.trip.status}`, data.trip.status)}</Text>
          {data.message ? <Text style={styles.message}>{data.message}</Text> : null}
          {data.trackingOpen && data.driverLocation ? (
            <Text style={styles.eta}>
              {etaLabel}
              {etaSeconds != null ? `  ·  ${formatEtaMinutes(etaSeconds)}` : ''}
            </Text>
          ) : null}
        </AppCard>

        {data.driver && (
          <AppCard>
            <Text style={styles.sectionTitle}>{t('tracking.driver')}</Text>
            <Text style={styles.driverName}>{data.driver.name}</Text>
            {data.vehicle ? (
              <Text style={styles.meta}>
                {[data.vehicle.color, data.vehicle.model, data.vehicle.plateNumber].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {data.driver.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${data.driver!.phone}`)}>
                <Text style={styles.callLink}>{t('tracking.callDriver')}</Text>
              </TouchableOpacity>
            ) : null}
          </AppCard>
        )}

        <AppCard>
          <Text style={styles.sectionTitle}>{t('tracking.stops')}</Text>
          {data.stops.map((stop) => {
            const done = stop.status === 'COMPLETED';
            const current = stop.status === 'ARRIVED' || stop.status === 'WAITING';
            return (
              <View key={stop.stopId} style={styles.stopRow}>
                <View style={[styles.dot, done ? styles.dotDone : current ? styles.dotCurrent : styles.dotPending]} />
                <View style={styles.stopInfo}>
                  <Text style={[styles.stopName, stop.isPickup && styles.stopHighlight]}>
                    {(isAr ? stop.nameAr : stop.name) ?? stop.name}
                    {stop.isPickup ? `  · ${t('tracking.yourPickup')}` : ''}
                    {stop.isDropoff ? `  · ${t('tracking.destination')}` : ''}
                  </Text>
                  <Text style={styles.stopStatus}>{t(`tracking.stopState.${stop.status}`, stop.status)}</Text>
                </View>
              </View>
            );
          })}
        </AppCard>

        {outstanding > 0 && (
          <AppCard style={styles.outstandingCard}>
            <Text style={styles.outstandingTitle}>{t('tracking.outstandingTitle')}</Text>
            {data.outstandingCharges.map((c, i) => (
              <Text key={i} style={styles.outstandingLine}>
                {t('tracking.outstandingFrom', { ref: c.tripRef })}: {Number(c.amount).toFixed(2)} {t('common.egp')}
              </Text>
            ))}
          </AppCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { height: '50%', width: '100%' },
  shuttleMarker: { alignItems: 'center', justifyContent: 'center' },
  shuttleGlyph: { fontSize: 30 },
  sheet: { flex: 1 },
  sheetContent: { padding: SPACING.lg, paddingBottom: 60, gap: SPACING.md },
  statusLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1 },
  statusValue: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800', marginTop: 2 },
  message: { color: COLORS.textSecondary, marginTop: SPACING.xs },
  eta: { color: COLORS.info, fontWeight: '800', marginTop: SPACING.xs },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  driverName: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  meta: { color: COLORS.textSecondary, marginTop: 2 },
  callLink: { color: COLORS.info, fontWeight: '800', marginTop: SPACING.xs },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: SPACING.xs },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  dotDone: { backgroundColor: COLORS.success },
  dotCurrent: { backgroundColor: COLORS.primary },
  dotPending: { backgroundColor: COLORS.border },
  stopInfo: { flex: 1 },
  stopName: { color: COLORS.text, fontWeight: '700' },
  stopHighlight: { color: COLORS.info },
  stopStatus: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  outstandingCard: { borderWidth: 1, borderColor: COLORS.danger },
  outstandingTitle: { color: COLORS.danger, fontWeight: '800', marginBottom: SPACING.xs },
  outstandingLine: { color: COLORS.text, fontSize: FONT_SIZE.sm },
});
