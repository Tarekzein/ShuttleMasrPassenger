import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';
import type { BookingStatus, Coordinates, JourneyEventV2 } from '../types/passenger';
import { isJourneyEventV2 } from '../utils/trackingContract';

function socketOrigin(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

export type TrackingConnectionState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface DriverLocationEvent {
  tripId: string;
  serverTimestamp: string;
  location: {
    sequence: number;
    recordedAt: string;
    serverTimestamp: string;
    lat: number;
    lng: number;
    accuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
}

export interface NavigationProgressEvent {
  tripId: string;
  serverTimestamp: string;
  navigation: {
    remainingDistanceMeters: number | null;
    remainingDurationSeconds: number | null;
    calculatedAt: string | null;
    targetStopId: string | null;
    routeRevision: number;
    encodedPolyline: string | null;
    coordinates: Coordinates[] | null;
    updatedAt: string;
  };
}

export interface BookingCancelledEvent {
  tripId: string;
  serverTimestamp: string;
  bookingId: string;
  status: Extract<BookingStatus, 'CANCELLED' | 'REFUNDED'>;
}

export interface TripAccessRevokedEvent {
  tripId: string;
  serverTimestamp: string;
  bookingId: string;
  code: 'BOOKING_CANCELLED';
}

export type SubscribeTripAck =
  | { ok: true; tripId: string; serverTimestamp: string; snapshot: unknown }
  | {
      ok: false;
      code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'TERMINAL';
      message: string;
      serverTimestamp?: string;
    }
  | { event: 'subscribed'; tripId: string }
  | { event: 'error'; message: string };

export interface PassengerRealtimeHandlers {
  onConnectionState?: (state: TrackingConnectionState) => void;
  onSubscribeError?: (error: { code: string; message: string }) => void;
  onSnapshot?: (snapshot: unknown) => void;
  onDriverLocation?: (loc: DriverLocationEvent) => void;
  onNavigationProgress?: (event: NavigationProgressEvent) => void;
  onBookingCancelled?: (event: BookingCancelledEvent) => void;
  onAccessRevoked?: (event: TripAccessRevokedEvent) => void;
  onJourneyEvent?: (event: JourneyEventV2) => void;
  onLegacyChange?: () => void;
  onResyncRequired?: () => void;
}

export interface TripTrackingConnection {
  disconnect: () => void;
}

let activeSocket: Socket | null = null;
let connectionGeneration = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isNullableNumber(value: unknown): value is number | null {
  return value == null || (typeof value === 'number' && Number.isFinite(value));
}

function isNullableString(value: unknown): value is string | null {
  return value == null || typeof value === 'string';
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value == null || isTimestamp(value);
}

function isCoordinate(value: unknown): value is Coordinates {
  return (
    isRecord(value) &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

function isJourneyLocationEvent(value: unknown): value is DriverLocationEvent {
  if (!isRecord(value) || !isRecord(value.location)) return false;
  const location = value.location;
  return (
    typeof value.tripId === 'string' &&
    isTimestamp(value.serverTimestamp) &&
    typeof location.sequence === 'number' &&
    Number.isInteger(location.sequence) &&
    location.sequence >= 0 &&
    isTimestamp(location.recordedAt) &&
    isTimestamp(location.serverTimestamp) &&
    typeof location.lat === 'number' &&
    Number.isFinite(location.lat) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    typeof location.lng === 'number' &&
    Number.isFinite(location.lng) &&
    location.lng >= -180 &&
    location.lng <= 180 &&
    isNullableNumber(location.accuracy) &&
    isNullableNumber(location.heading) &&
    isNullableNumber(location.speed)
  );
}

function normalizeLegacyLocationEvent(value: unknown): DriverLocationEvent | null {
  if (!isRecord(value)) return null;
  const recordedAt = typeof value.recordedAt === 'string'
    ? value.recordedAt
    : typeof value.deviceTimestamp === 'string'
      ? value.deviceTimestamp
      : value.serverTimestamp;
  const sequence = value.sequence == null ? 0 : value.sequence;
  if (
    typeof value.tripId !== 'string' ||
    !isTimestamp(value.serverTimestamp) ||
    !isTimestamp(recordedAt) ||
    typeof sequence !== 'number' ||
    !Number.isInteger(sequence) ||
    sequence < 0 ||
    typeof value.lat !== 'number' ||
    !Number.isFinite(value.lat) ||
    value.lat < -90 ||
    value.lat > 90 ||
    typeof value.lng !== 'number' ||
    !Number.isFinite(value.lng) ||
    value.lng < -180 ||
    value.lng > 180 ||
    !isNullableNumber(value.accuracy) ||
    !isNullableNumber(value.heading) ||
    !isNullableNumber(value.speed)
  ) {
    return null;
  }
  return {
    tripId: value.tripId,
    serverTimestamp: value.serverTimestamp,
    location: {
      sequence,
      recordedAt,
      serverTimestamp: value.serverTimestamp,
      lat: value.lat,
      lng: value.lng,
      accuracy: value.accuracy ?? null,
      heading: value.heading ?? null,
      speed: value.speed ?? null,
    },
  };
}

function isNavigationProgressEvent(value: unknown): value is NavigationProgressEvent {
  if (!isRecord(value) || !isRecord(value.navigation)) return false;
  const navigation = value.navigation;
  return (
    typeof value.tripId === 'string' &&
    isTimestamp(value.serverTimestamp) &&
    isNullableNumber(navigation.remainingDistanceMeters) &&
    (navigation.remainingDistanceMeters == null || navigation.remainingDistanceMeters >= 0) &&
    isNullableNumber(navigation.remainingDurationSeconds) &&
    (navigation.remainingDurationSeconds == null || navigation.remainingDurationSeconds >= 0) &&
    isNullableTimestamp(navigation.calculatedAt) &&
    isNullableString(navigation.targetStopId) &&
    typeof navigation.routeRevision === 'number' &&
    Number.isInteger(navigation.routeRevision) &&
    navigation.routeRevision >= 0 &&
    isNullableString(navigation.encodedPolyline) &&
    (navigation.coordinates == null ||
      (Array.isArray(navigation.coordinates) && navigation.coordinates.every(isCoordinate))) &&
    isTimestamp(navigation.updatedAt)
  );
}

function isBookingCancelledEvent(value: unknown): value is BookingCancelledEvent {
  return (
    isRecord(value) &&
    typeof value.tripId === 'string' &&
    isTimestamp(value.serverTimestamp) &&
    typeof value.bookingId === 'string' &&
    (value.status === 'CANCELLED' || value.status === 'REFUNDED')
  );
}

function isTripAccessRevokedEvent(value: unknown): value is TripAccessRevokedEvent {
  return (
    isRecord(value) &&
    typeof value.tripId === 'string' &&
    isTimestamp(value.serverTimestamp) &&
    typeof value.bookingId === 'string' &&
    value.code === 'BOOKING_CANCELLED'
  );
}

export async function connectTripTracking(
  tripId: string,
  handlers: PassengerRealtimeHandlers,
): Promise<TripTrackingConnection | null> {
  const generation = ++connectionGeneration;
  handlers.onConnectionState?.('connecting');
  const token = await SecureStore.getItemAsync('accessToken');
  if (!token || generation !== connectionGeneration) {
    if (!token) handlers.onConnectionState?.('error');
    return null;
  }

  activeSocket?.removeAllListeners();
  activeSocket?.disconnect();

  const socket = io(`${socketOrigin()}/realtime`, {
    transports: ['websocket'],
    auth: (callback) => {
      void SecureStore.getItemAsync('accessToken')
        .then((freshToken) => callback({ token: freshToken ?? token }))
        .catch(() => callback({ token }));
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.5,
  });
  activeSocket = socket;
  let connectedOnce = false;
  let intentionallyClosed = false;
  let ackAttempt = 0;
  let ackRetryTimer: ReturnType<typeof setTimeout> | null = null;
  let legacyLocationTimer: ReturnType<typeof setTimeout> | null = null;
  let legacyNavigationTimer: ReturnType<typeof setTimeout> | null = null;
  let journeyLocationSeen = false;
  let journeyNavigationSeen = false;

  const close = () => {
    if (intentionallyClosed) return;
    intentionallyClosed = true;
    connectionGeneration += 1;
    if (ackRetryTimer) clearTimeout(ackRetryTimer);
    if (legacyLocationTimer) clearTimeout(legacyLocationTimer);
    if (legacyNavigationTimer) clearTimeout(legacyNavigationTimer);
    if (socket.connected) socket.emit('unsubscribe:trip', { tripId });
    socket.removeAllListeners();
    socket.io.removeAllListeners();
    socket.disconnect();
    if (activeSocket === socket) activeSocket = null;
  };

  const subscribe = () => {
    if (ackRetryTimer) {
      clearTimeout(ackRetryTimer);
      ackRetryTimer = null;
    }
    const reconnecting = connectedOnce;
    socket.timeout(7_000).emit(
      'subscribe:trip',
      { tripId },
      (timeoutError: Error | null, ack?: SubscribeTripAck) => {
        if (intentionallyClosed || generation !== connectionGeneration) return;
        if (timeoutError || !ack) {
          handlers.onConnectionState?.('reconnecting');
          handlers.onSubscribeError?.({
            code: 'ACK_TIMEOUT',
            message: 'The live tracking subscription did not respond.',
          });
          const delay = Math.min(30_000, 1_000 * 2 ** ackAttempt);
          ackAttempt += 1;
          ackRetryTimer = setTimeout(() => {
            if (intentionallyClosed) return;
            if (socket.connected) subscribe();
            else socket.connect();
          }, delay);
          return;
        }
        if ('ok' in ack && ack.ok === false) {
          handlers.onConnectionState?.('error');
          handlers.onSubscribeError?.({ code: ack.code, message: ack.message });
          close();
          return;
        }
        if ('event' in ack && ack.event === 'error') {
          handlers.onConnectionState?.('error');
          handlers.onSubscribeError?.({ code: 'SUBSCRIBE_ERROR', message: ack.message });
          return;
        }
        if ('ok' in ack && ack.ok && ack.tripId !== tripId) {
          handlers.onConnectionState?.('error');
          handlers.onSubscribeError?.({ code: 'TRIP_MISMATCH', message: 'The subscription returned another trip.' });
          close();
          return;
        }
        handlers.onConnectionState?.('live');
        ackAttempt = 0;
        if (ackRetryTimer) clearTimeout(ackRetryTimer);
        connectedOnce = true;
        if ('ok' in ack && ack.ok) handlers.onSnapshot?.(ack.snapshot);
        else if (reconnecting) handlers.onResyncRequired?.();
      },
    );
  };

  socket.on('connect', subscribe);
  socket.on('disconnect', (reason) => {
    if (intentionallyClosed) return;
    handlers.onConnectionState?.(reason === 'io client disconnect' ? 'disconnected' : 'reconnecting');
  });
  socket.on('connect_error', () => {
    if (!intentionallyClosed) handlers.onConnectionState?.(connectedOnce ? 'reconnecting' : 'error');
  });
  socket.io.on('reconnect_attempt', () => {
    if (!intentionallyClosed) handlers.onConnectionState?.('reconnecting');
  });
  socket.io.on('reconnect_failed', () => {
    if (!intentionallyClosed) handlers.onConnectionState?.('error');
  });

  socket.on('journey:location', (event: unknown) => {
    if (!isJourneyLocationEvent(event)) {
      handlers.onResyncRequired?.();
      return;
    }
    if (event.tripId !== tripId) return;
    journeyLocationSeen = true;
    if (legacyLocationTimer) {
      clearTimeout(legacyLocationTimer);
      legacyLocationTimer = null;
    }
    handlers.onDriverLocation?.(event);
  });
  socket.on('driver:location', (event: unknown) => {
    if (journeyLocationSeen) return;
    const normalized = normalizeLegacyLocationEvent(event);
    if (!normalized) {
      handlers.onResyncRequired?.();
      return;
    }
    if (normalized.tripId !== tripId) return;
    if (legacyLocationTimer) clearTimeout(legacyLocationTimer);
    legacyLocationTimer = setTimeout(() => {
      legacyLocationTimer = null;
      if (!journeyLocationSeen) handlers.onDriverLocation?.(normalized);
    }, 100);
  });
  socket.on('journey:navigation', (event: unknown) => {
    if (!isNavigationProgressEvent(event)) {
      handlers.onResyncRequired?.();
      return;
    }
    if (event.tripId !== tripId) return;
    journeyNavigationSeen = true;
    if (legacyNavigationTimer) {
      clearTimeout(legacyNavigationTimer);
      legacyNavigationTimer = null;
    }
    handlers.onNavigationProgress?.(event);
  });
  socket.on('navigation:progress', (event: unknown) => {
    if (journeyNavigationSeen) return;
    if (!isNavigationProgressEvent(event)) {
      handlers.onResyncRequired?.();
      return;
    }
    if (event.tripId !== tripId) return;
    if (legacyNavigationTimer) clearTimeout(legacyNavigationTimer);
    legacyNavigationTimer = setTimeout(() => {
      legacyNavigationTimer = null;
      if (!journeyNavigationSeen) handlers.onNavigationProgress?.(event);
    }, 100);
  });
  socket.on('journey:event', (event: unknown) => {
    if (!isJourneyEventV2(event)) {
      handlers.onResyncRequired?.();
      return;
    }
    if (event.tripId !== tripId) return;
    if (event.requiresRefetch || event.snapshot == null) handlers.onResyncRequired?.();
    else handlers.onJourneyEvent?.(event);
  });
  socket.on('booking:cancelled', (event: unknown) => {
    if (!isBookingCancelledEvent(event)) {
      handlers.onResyncRequired?.();
      return;
    }
    if (event.tripId === tripId) handlers.onBookingCancelled?.(event);
  });
  socket.on('trip:access-revoked', (event: unknown) => {
    if (!isTripAccessRevokedEvent(event)) {
      handlers.onResyncRequired?.();
      return;
    }
    if (event.tripId === tripId) handlers.onAccessRevoked?.(event);
  });
  socket.on('trip:state', () => handlers.onLegacyChange?.());
  socket.on('stop:update', () => handlers.onLegacyChange?.());
  socket.on('seat:updated', () => handlers.onLegacyChange?.());

  return { disconnect: close };
}

export function disconnectTracking(): void {
  connectionGeneration += 1;
  if (activeSocket) {
    activeSocket.removeAllListeners();
    activeSocket.io.removeAllListeners();
    activeSocket.disconnect();
    activeSocket = null;
  }
}
