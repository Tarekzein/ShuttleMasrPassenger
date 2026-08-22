import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { AppCard } from '../../components/AppCard';
import { ErrorState } from '../../components/ErrorState';
import { LiveDriverMarker } from '../../components/LiveDriverMarker';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../theme';
import { useTripTracking } from '../../hooks/usePassengerQueries';
import {
  connectTripTracking,
  type DriverLocationEvent,
  type NavigationProgressEvent,
  type TrackingConnectionState,
  type TripTrackingConnection,
} from '../../services/realtimeClient';
import { track } from '../../services/analytics';
import type { JourneyEventV2, TrackingLocationV2, TrackingSnapshot, TripTrackingV2 } from '../../types/passenger';
import {
  acceptLocationUpdate,
  ageSeconds,
  classifyRevision,
  isTripTrackingV2,
  normalizeTrackingSnapshot,
} from '../../utils/trackingContract';
import {
  formatCairoDateTime,
  formatDistanceMeters,
  formatEstimatedArrival,
  formatLastSeen,
  formatLocalizedNumber,
} from '../../utils/localizedFormat';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
const CAIRO = { latitude: 30.0444, longitude: 31.2357 };
const PRECISE_PHASES = new Set(['DRIVER_EN_ROUTE', 'IN_PROGRESS']);

function TrackingSkeleton({ label }: { label: string }) {
  return (
    <View style={styles.skeletonContainer} accessibilityLabel={label} accessibilityRole="progressbar">
      <View style={styles.skeletonMap} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
      </View>
    </View>
  );
}

function connectionCopy(
  snapshot: TrackingSnapshot,
  state: TrackingConnectionState,
  age: number | null,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): { label: string; tone: 'live' | 'warning' | 'muted' } {
  if (snapshot.terminal) return { label: t('tracking.connection.ended'), tone: 'muted' };
  if (state === 'connecting' || state === 'reconnecting') {
    return { label: t('tracking.connection.reconnecting'), tone: 'warning' };
  }
  if (age != null && (age > 15 || snapshot.tracking.state === 'STALE')) {
    return {
      label: t('tracking.connection.lastSeen', { value: formatLastSeen(age, language) }),
      tone: 'warning',
    };
  }
  if (state === 'live' && snapshot.tracking.state === 'LIVE') {
    return { label: t('tracking.connection.live'), tone: 'live' };
  }
  if (state === 'error' || state === 'disconnected') {
    return { label: t('tracking.connection.unavailable'), tone: 'warning' };
  }
  return { label: t('tracking.connection.waiting'), tone: 'muted' };
}

function isOwnPassengerProjection(
  value: unknown,
  tripId: string,
  bookingId: string,
): value is TripTrackingV2 {
  return (
    isTripTrackingV2(value) &&
    value.trip.id === tripId &&
    value.passenger.bookingId === bookingId
  );
}

export default function TripTrackingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const id = bookingId ?? '';
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isAr = language.startsWith('ar');
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<TrackingConnectionState>('connecting');
  const [subscriptionErrorCode, setSubscriptionErrorCode] = useState<string | null>(null);
  const fatalSubscriptionError = ['UNAUTHORIZED', 'FORBIDDEN', 'TERMINAL'].includes(
    subscriptionErrorCode ?? '',
  );
  const disconnectedFallback = !fatalSubscriptionError &&
    ['reconnecting', 'disconnected', 'error'].includes(connectionState);
  const trackingQuery = useTripTracking(id, disconnectedFallback);
  const data = trackingQuery.data;
  const [liveLocation, setLiveLocation] = useState<TrackingLocationV2 | null>(null);
  const [, setClockTick] = useState(0);
  const mapRef = useRef<MapView | null>(null);
  const snapshotRef = useRef<TrackingSnapshot | null>(null);
  const locationRef = useRef<TrackingLocationV2 | null>(null);
  const routeUpdatedAtRef = useRef<string | null>(null);
  const revisionRef = useRef(0);
  const serverOffsetRef = useRef(0);

  const refetchAuthoritative = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['tracking', id] });
  }, [id, queryClient]);

  const applySnapshot = useCallback(
    (raw: TripTrackingV2) => {
      const normalized = normalizeTrackingSnapshot(raw);
      revisionRef.current = normalized.revision;
      const serverNow = Date.parse(normalized.serverTimestamp ?? '');
      if (Number.isFinite(serverNow)) serverOffsetRef.current = serverNow - Date.now();
      queryClient.setQueryData(['tracking', id], normalized);
    },
    [id, queryClient],
  );

  useEffect(() => {
    if (!data) return;
    snapshotRef.current = data;
    revisionRef.current = data.revision;
    const serverNow = Date.parse(data.serverTimestamp ?? '');
    if (Number.isFinite(serverNow)) serverOffsetRef.current = serverNow - Date.now();
    if (data.route.routeSource === 'DRIVER_NAVIGATION' && Number.isFinite(serverNow)) {
      routeUpdatedAtRef.current = new Date(
        serverNow - (data.route.stalenessSeconds ?? 0) * 1_000,
      ).toISOString();
    } else {
      routeUpdatedAtRef.current = null;
    }

    if (data.terminal || !PRECISE_PHASES.has(data.trip.phase) || !data.tracking.open) {
      locationRef.current = null;
      setLiveLocation(null);
      return;
    }
    if (data.location && acceptLocationUpdate(locationRef.current, data.location).accepted) {
      locationRef.current = data.location;
      setLiveLocation(data.location);
    }
  }, [data]);

  useEffect(() => {
    if (!data || data.terminal) return;
    const timer = setInterval(() => setClockTick((value) => value + 1), 5_000);
    return () => clearInterval(timer);
  }, [data?.terminal]);

  useEffect(() => {
    if (!id || !data || data.terminal) return;
    let disposed = false;
    let connection: TripTrackingConnection | null = null;

    const handleLocation = (event: DriverLocationEvent) => {
      const snapshot = snapshotRef.current;
      if (!snapshot || event.tripId !== snapshot.trip.id) return;
      if (!PRECISE_PHASES.has(snapshot.trip.phase) || !snapshot.tracking.open) {
        refetchAuthoritative();
        return;
      }
      const nextLocation: TrackingLocationV2 = {
        ...event.location,
        deviceTimestamp: event.location.recordedAt,
      };
      const previous = locationRef.current;
      if (previous?.sequence && nextLocation.sequence > previous.sequence + 1) refetchAuthoritative();
      const result = acceptLocationUpdate(previous, nextLocation);
      if (!result.accepted) {
        if (result.reason === 'implausible') refetchAuthoritative();
        return;
      }
      locationRef.current = nextLocation;
      setLiveLocation(nextLocation);
      setConnectionState('live');
      setSubscriptionErrorCode(null);
      track('driver_located', { tripId: event.tripId, sequence: nextLocation.sequence });
    };

    const handleNavigationProgress = (event: NavigationProgressEvent) => {
      const snapshot = snapshotRef.current;
      if (!snapshot || event.tripId !== snapshot.trip.id) return;
      if (!PRECISE_PHASES.has(snapshot.trip.phase) || !snapshot.tracking.open) {
        refetchAuthoritative();
        return;
      }
      const incomingAt = Date.parse(event.navigation.updatedAt);
      const previousAt = Date.parse(routeUpdatedAtRef.current ?? '');
      if (Number.isFinite(incomingAt) && Number.isFinite(previousAt) && incomingAt <= previousAt) return;

      const currentRoute = snapshot.route;
      const routeRevision = event.navigation.routeRevision;
      if (routeRevision < currentRoute.routeRevision) return;
      const geometryChanged = routeRevision > currentRoute.routeRevision;
      if (geometryChanged && !event.navigation.coordinates?.length) {
        refetchAuthoritative();
        return;
      }
      const nextSnapshot: TrackingSnapshot = {
        ...snapshot,
        serverTimestamp: event.serverTimestamp,
        route: {
          ...currentRoute,
          routeSource: 'DRIVER_NAVIGATION',
          coordinates: geometryChanged
            ? event.navigation.coordinates ?? currentRoute.coordinates
            : currentRoute.coordinates,
          encodedPolyline: event.navigation.encodedPolyline,
          routeRevision,
          calculatedAt: event.navigation.calculatedAt,
          remainingDistanceMeters: event.navigation.remainingDistanceMeters,
          remainingDurationSeconds: event.navigation.remainingDurationSeconds,
          targetStopId: event.navigation.targetStopId,
          stale: false,
          stalenessSeconds: 0,
        },
      };
      routeUpdatedAtRef.current = event.navigation.updatedAt;
      snapshotRef.current = nextSnapshot;
      const serverNow = Date.parse(event.serverTimestamp);
      if (Number.isFinite(serverNow)) serverOffsetRef.current = serverNow - Date.now();
      queryClient.setQueryData(['tracking', id], nextSnapshot);
    };

    const handleJourneyEvent = (event: JourneyEventV2) => {
      const snapshot = snapshotRef.current;
      if (!snapshot || event.tripId !== snapshot.trip.id) return;
      const disposition = classifyRevision(revisionRef.current, event.revision);
      if (disposition === 'stale') return;
      if (disposition === 'gap') {
        refetchAuthoritative();
        return;
      }
      if (isOwnPassengerProjection(event.snapshot, event.tripId, id)) applySnapshot(event.snapshot);
      else refetchAuthoritative();
    };

    const handleAccessRevoked = (
      bookingId: string,
      status: 'CANCELLED' | 'REFUNDED' | null = null,
    ) => {
      if (bookingId !== id) return;
      locationRef.current = null;
      setLiveLocation(null);
      setConnectionState('reconnecting');
      const current = snapshotRef.current;
      if (current) {
        const redacted: TrackingSnapshot = {
          ...current,
          terminal: true,
          tracking: { open: false, state: 'ENDED', lastSeenAt: null },
          passenger: status
            ? {
                ...current.passenger,
                bookingStatus: status,
                phase: 'CANCELLED',
              }
            : current.passenger,
          driver: current.driver
            ? { ...current.driver, phone: null }
            : null,
          location: null,
          route: {
            routeSource: 'LINE_STOPS',
            coordinates: current.stops
              .filter((stop) => stop.lat != null && stop.lng != null)
              .map((stop) => ({ latitude: stop.lat!, longitude: stop.lng! })),
            encodedPolyline: null,
            routeRevision: 0,
            calculatedAt: null,
            remainingDistanceMeters: null,
            remainingDurationSeconds: null,
            targetStopId: null,
            stale: false,
            stalenessSeconds: null,
          },
        };
        snapshotRef.current = redacted;
        queryClient.setQueryData(['tracking', id], redacted);
      }
      refetchAuthoritative();
    };

    void connectTripTracking(
      data.trip.id,
      {
        onConnectionState: (state) => {
          if (!disposed) {
            setConnectionState(state);
            if (state === 'live') setSubscriptionErrorCode(null);
          }
        },
        onSubscribeError: ({ code }) => {
          if (disposed) return;
          setSubscriptionErrorCode(code);
          if (['UNAUTHORIZED', 'FORBIDDEN', 'TERMINAL'].includes(code)) {
            handleAccessRevoked(id);
          } else {
            refetchAuthoritative();
          }
        },
        onSnapshot: (snapshot) => {
          if (!disposed) {
            setSubscriptionErrorCode(null);
            // The rollout gateway may ACK with a generic journey snapshot.
            // Never apply it to a passenger screen: only the booking-scoped
            // REST projection (or an equivalent guarded payload) is authoritative.
            if (isOwnPassengerProjection(snapshot, data.trip.id, id)) applySnapshot(snapshot);
            else refetchAuthoritative();
          }
        },
        onDriverLocation: handleLocation,
        onNavigationProgress: handleNavigationProgress,
        onBookingCancelled: (event) => {
          handleAccessRevoked(event.bookingId, event.status);
        },
        onAccessRevoked: (event) => handleAccessRevoked(event.bookingId),
        onJourneyEvent: handleJourneyEvent,
        onLegacyChange: refetchAuthoritative,
        onResyncRequired: refetchAuthoritative,
      },
    ).then((nextConnection) => {
      if (disposed) nextConnection?.disconnect();
      else connection = nextConnection;
    });

    return () => {
      disposed = true;
      connection?.disconnect();
    };
  }, [applySnapshot, data?.terminal, data?.trip.id, id, queryClient, refetchAuthoritative]);

  useEffect(() => {
    if (!data) return;
    if (data.tracking.open) track('tracking_opened', { bookingId: id, tripId: data.trip.id });
    if (data.terminal) track('tracking_access_revoked', { bookingId: id, tripId: data.trip.id });
  }, [data?.terminal, data?.tracking.open, data?.trip.id, id]);

  const routeCoordinates = data?.route.coordinates ?? [];
  const pickup = data?.stops.find((stop) => stop.isPickup);
  const dropoff = data?.stops.find((stop) => stop.isDropoff);
  const initialRegion = useMemo(
    () => ({
      latitude: liveLocation?.lat ?? pickup?.lat ?? CAIRO.latitude,
      longitude: liveLocation?.lng ?? pickup?.lng ?? CAIRO.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }),
    [liveLocation?.lat, liveLocation?.lng, pickup?.lat, pickup?.lng],
  );

  useEffect(() => {
    if (!data || data.terminal || routeCoordinates.length < 2) return;
    mapRef.current?.fitToCoordinates(routeCoordinates, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }, [data?.route.routeRevision, data?.terminal, routeCoordinates.length]);

  if (trackingQuery.isLoading) return <TrackingSkeleton label={t('tracking.loading')} />;
  if (trackingQuery.isError || !data) {
    return (
      <ErrorState
        error={trackingQuery.error}
        title={t('tracking.loadErrorTitle')}
        message={t('tracking.loadErrorMessage')}
        retryLabel={t('common.retry')}
        onRetry={() => trackingQuery.refetch()}
      />
    );
  }

  const serverNowMs = Date.now() + serverOffsetRef.current;
  const lastSeenAt = liveLocation?.serverTimestamp ?? data.tracking.lastSeenAt;
  const lastSeenAge = ageSeconds(lastSeenAt, serverNowMs);
  const connection = connectionCopy(data, connectionState, lastSeenAge, language, t);
  const markerStale = connection.tone !== 'live';
  const v2Eta = formatEstimatedArrival(
    data.route.calculatedAt,
    data.route.remainingDurationSeconds,
    language,
  );
  const etaDisplay = data.apiVersion === 2 ? v2Eta : null;
  const phaseLabel = t(`tracking.phase.${data.passenger.phase}`);
  const routeIsDriverNavigation = data.route.routeSource === 'DRIVER_NAVIGATION';
  const etaTarget = data.stops.find((stop) => stop.stopId === data.route.targetStopId);
  const etaTargetName = etaTarget
    ? (isAr ? etaTarget.nameAr : etaTarget.name) ?? etaTarget.name ?? etaTarget.nameAr
    : null;
  const routeProgressUnavailable = data.apiVersion === 2
    ? !routeIsDriverNavigation || etaDisplay == null
    : etaDisplay == null;
  const liveRouteAge = routeIsDriverNavigation
    ? ageSeconds(routeUpdatedAtRef.current, serverNowMs)
    : null;
  const routeIsStale = data.route.stale || (liveRouteAge != null && liveRouteAge > 15);
  const routeStalenessSeconds = Math.max(
    data.route.stalenessSeconds ?? 0,
    liveRouteAge ?? 0,
  );
  const outstanding = Number(data.passenger.outstandingAmount ?? 0);
  const rowDirection = isAr ? styles.rowReverse : null;
  const alignedText = isAr ? styles.textRight : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerTitle: t('tracking.title') }} />

      {!data.terminal ? (
        <MapView ref={mapRef} provider={MAP_PROVIDER} style={styles.map} initialRegion={initialRegion}>
          {routeCoordinates.length > 1 ? (
            <Polyline coordinates={routeCoordinates} strokeColor={COLORS.primary} strokeWidth={5} />
          ) : null}
          {pickup?.lat != null && pickup.lng != null ? (
            <Marker
              coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
              title={t('tracking.yourPickup')}
              pinColor={COLORS.info}
              accessibilityLabel={t('tracking.yourPickup')}
            />
          ) : null}
          {dropoff?.lat != null && dropoff.lng != null ? (
            <Marker
              coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}
              title={t('tracking.destination')}
              pinColor={COLORS.success}
              accessibilityLabel={t('tracking.destination')}
            />
          ) : null}
          {liveLocation && PRECISE_PHASES.has(data.trip.phase) && data.tracking.open ? (
            <LiveDriverMarker
              location={liveLocation}
              stale={markerStale}
              accessibilityLabel={t('tracking.shuttle')}
            />
          ) : null}
        </MapView>
      ) : null}

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
        <View
          style={[
            styles.connectionBanner,
            connection.tone === 'live'
              ? styles.connectionLive
              : connection.tone === 'warning'
                ? styles.connectionWarning
                : styles.connectionMuted,
            rowDirection,
          ]}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
        >
          <View style={styles.connectionDot} />
          <Text style={[styles.connectionText, alignedText]}>{connection.label}</Text>
        </View>

        <AppCard>
          <Text style={[styles.statusLabel, alignedText]}>{t('tracking.status')}</Text>
          <Text style={[styles.statusValue, alignedText]}>{phaseLabel}</Text>
          <Text style={[styles.meta, alignedText]}>{formatCairoDateTime(data.trip.departureTime, language)}</Text>
          {data.message ? <Text style={[styles.message, alignedText]}>{data.message}</Text> : null}
          {subscriptionErrorCode ? (
            <Text style={[styles.warningText, alignedText]}>{t('tracking.subscriptionError')}</Text>
          ) : null}
        </AppCard>

        {!data.terminal ? (
          <AppCard>
            <Text style={[styles.sectionTitle, alignedText]}>{t('tracking.routeProgress')}</Text>
            {routeProgressUnavailable ? (
              <Text style={[styles.message, alignedText]}>
                {data.apiVersion === 2 && data.route.routeSource === 'LINE_STOPS'
                  ? t('tracking.routeAwaitingDriver')
                  : t('tracking.etaUnavailable')}
              </Text>
            ) : (
              <View style={[styles.metricRow, rowDirection]}>
                <View style={styles.metric}>
                  <Text style={[styles.metricValue, alignedText]}>{etaDisplay}</Text>
                  <Text style={[styles.metricLabel, alignedText]}>
                    {etaTargetName ? t('tracking.etaTo', { stop: etaTargetName }) : t('tracking.eta')}
                  </Text>
                </View>
                {data.route.remainingDistanceMeters != null ? (
                  <View style={styles.metric}>
                    <Text style={[styles.metricValue, alignedText]}>
                      {formatDistanceMeters(data.route.remainingDistanceMeters, language)}
                    </Text>
                    <Text style={[styles.metricLabel, alignedText]}>{t('tracking.remainingDistance')}</Text>
                  </View>
                ) : null}
              </View>
            )}
            {routeIsStale ? (
              <Text style={[styles.warningText, alignedText]}>
                {t('tracking.routeStale', {
                  value: formatLocalizedNumber(routeStalenessSeconds, language),
                })}
              </Text>
            ) : null}
          </AppCard>
        ) : null}

        {data.driver ? (
          <AppCard>
            <Text style={[styles.sectionTitle, alignedText]}>{t('tracking.driver')}</Text>
            <View style={[styles.identityRow, rowDirection]}>
              <View style={styles.avatar} accessible accessibilityLabel={data.driver.name}>
                <Text style={styles.avatarText}>{data.driver.name.trim().slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.identityText}>
                <Text style={[styles.driverName, alignedText]}>{data.driver.name}</Text>
                {data.vehicle ? (
                  <Text style={[styles.meta, alignedText]}>
                    {[data.vehicle.color, data.vehicle.model ?? data.vehicle.type, data.vehicle.plateNumber]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>
            {data.driver.phone ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('tracking.callDriver')}
                hitSlop={8}
                style={[styles.callButton, isAr && styles.callButtonRtl]}
                onPress={() => void Linking.openURL(`tel:${data.driver?.phone}`)}
              >
                <Text style={styles.callLink}>{t('tracking.callDriver')}</Text>
              </TouchableOpacity>
            ) : null}
          </AppCard>
        ) : (
          <AppCard>
            <Text style={[styles.sectionTitle, alignedText]}>{t('tracking.driver')}</Text>
            <Text style={[styles.message, alignedText]}>{t('tracking.driverPending')}</Text>
          </AppCard>
        )}

        <AppCard>
          <Text style={[styles.sectionTitle, alignedText]}>{t('tracking.stops')}</Text>
          {data.stops.length ? (
            data.stops.map((stop) => {
              const done = stop.phase === 'COMPLETED';
              const current = stop.phase === 'ARRIVED';
              const name = (isAr ? stop.nameAr : stop.name) ?? stop.name ?? stop.nameAr ?? t('tracking.unnamedStop');
              return (
                <View key={stop.stopId} style={[styles.stopRow, rowDirection]} accessible>
                  <View style={[styles.dot, done ? styles.dotDone : current ? styles.dotCurrent : styles.dotPending]} />
                  <View style={styles.stopInfo}>
                    <Text style={[styles.stopName, stop.isPickup && styles.stopHighlight, alignedText]}>
                      {name}
                      {stop.isPickup ? ` · ${t('tracking.yourPickup')}` : ''}
                      {stop.isDropoff ? ` · ${t('tracking.destination')}` : ''}
                    </Text>
                    <Text style={[styles.stopStatus, alignedText]}>{t(`tracking.stopPhase.${stop.phase}`)}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.message, alignedText]}>{t('tracking.noStops')}</Text>
          )}
        </AppCard>

        {outstanding > 0 ? (
          <AppCard style={styles.outstandingCard}>
            <Text style={[styles.outstandingTitle, alignedText]}>{t('tracking.outstandingTitle')}</Text>
            {data.outstandingCharges.length ? (
              data.outstandingCharges.map((charge) => (
                <Text key={`${charge.tripRef}-${charge.reason}`} style={[styles.outstandingLine, alignedText]}>
                  {t('tracking.outstandingFrom', { ref: charge.tripRef })}:{' '}
                  {formatLocalizedNumber(Number(charge.amount), language, 2)} {t('common.egp')}
                </Text>
              ))
            ) : (
              <Text style={[styles.outstandingLine, alignedText]}>
                {formatLocalizedNumber(outstanding, language, 2)} {t('common.egp')}
              </Text>
            )}
          </AppCard>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { height: '45%', width: '100%' },
  sheet: { flex: 1 },
  sheetContent: { padding: SPACING.lg, paddingBottom: 60, gap: SPACING.md },
  rowReverse: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right', writingDirection: 'rtl' },
  connectionBanner: {
    minHeight: 44,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  connectionLive: { backgroundColor: COLORS.successLight },
  connectionWarning: { backgroundColor: COLORS.warningLight },
  connectionMuted: { backgroundColor: COLORS.borderLight },
  connectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textSecondary },
  connectionText: { flex: 1, color: COLORS.text, fontWeight: '800' },
  statusLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: '800', letterSpacing: 1 },
  statusValue: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800', marginTop: 2 },
  message: { color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 21 },
  warningText: { color: COLORS.warning, fontWeight: '800', marginTop: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  identityRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xl, fontWeight: '900' },
  identityText: { flex: 1 },
  driverName: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  meta: { color: COLORS.textSecondary, marginTop: 2 },
  callButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: SPACING.sm },
  callButtonRtl: { alignSelf: 'flex-end' },
  callLink: { color: COLORS.info, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm },
  metric: { flex: 1 },
  metricValue: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '900' },
  metricLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: SPACING.sm, minHeight: 44 },
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
  skeletonContainer: { flex: 1, backgroundColor: COLORS.background },
  skeletonMap: { height: '45%', backgroundColor: COLORS.border },
  skeletonContent: { padding: SPACING.lg, gap: SPACING.md },
  skeletonBlock: { height: 96, borderRadius: RADIUS.xl, backgroundColor: COLORS.borderLight },
  skeletonTitle: { height: 44 },
});
