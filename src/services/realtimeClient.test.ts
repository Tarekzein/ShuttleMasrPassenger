const mockSocketHandlers = new Map<string, (...args: any[]) => void>();
const mockManagerHandlers = new Map<string, (...args: any[]) => void>();
let mockAck: ((error: Error | null, response?: unknown) => void) | null = null;
let mockSubscribePayload: unknown;
const mockDisconnect = jest.fn();
const mockSocket: any = {
  connected: true,
  on: jest.fn((event: string, handler: (...args: any[]) => void) => {
    mockSocketHandlers.set(event, handler);
    return mockSocket;
  }),
  emit: jest.fn(),
  timeout: jest.fn(() => ({
    emit: jest.fn((_event: string, payload: unknown, callback: typeof mockAck) => {
      mockSubscribePayload = payload;
      mockAck = callback;
    }),
  })),
  removeAllListeners: jest.fn(() => mockSocketHandlers.clear()),
  disconnect: mockDisconnect,
  connect: jest.fn(),
  io: {
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
      mockManagerHandlers.set(event, handler);
    }),
    removeAllListeners: jest.fn(() => mockManagerHandlers.clear()),
  },
};
const mockIo = jest.fn(() => mockSocket);

jest.mock('socket.io-client', () => ({ io: mockIo }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue('access-token') }));

import { connectTripTracking, disconnectTracking } from './realtimeClient';

describe('passenger realtime subscription', () => {
  beforeEach(() => {
    jest.useRealTimers();
    disconnectTracking();
    jest.clearAllMocks();
    mockSocketHandlers.clear();
    mockManagerHandlers.clear();
    mockAck = null;
    mockSubscribePayload = null;
    mockSocket.connected = true;
  });

  afterEach(() => disconnectTracking());

  it('sends the exact trip subscription and accepts an authoritative ACK snapshot', async () => {
    const states: string[] = [];
    const onSnapshot = jest.fn();
    await connectTripTracking('trip-1', { onConnectionState: (state) => states.push(state), onSnapshot });
    mockSocketHandlers.get('connect')?.();

    expect(mockSubscribePayload).toEqual({ tripId: 'trip-1' });
    const snapshot = { apiVersion: 2, revision: 8 };
    mockAck?.(null, {
      ok: true,
      tripId: 'trip-1',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
      snapshot,
    });
    expect(states).toEqual(['connecting', 'live']);
    expect(onSnapshot).toHaveBeenCalledWith(snapshot);
  });

  it('surfaces authorization failure and closes the connection', async () => {
    const onSubscribeError = jest.fn();
    await connectTripTracking('trip-1', { onSubscribeError });
    mockSocketHandlers.get('connect')?.();
    mockAck?.(null, { ok: false, code: 'FORBIDDEN', message: 'Forbidden' });
    expect(onSubscribeError).toHaveBeenCalledWith({ code: 'FORBIDDEN', message: 'Forbidden' });
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('delivers typed monotonic driver-location events to the tracking owner', async () => {
    const onDriverLocation = jest.fn();
    await connectTripTracking('trip-1', { onDriverLocation });
    const location = {
      tripId: 'trip-1',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
      location: {
        lat: 30,
        lng: 31,
        heading: 20,
        speed: 8,
        accuracy: 5,
        recordedAt: '2026-08-22T17:59:58.000Z',
        serverTimestamp: '2026-08-22T18:00:00.000Z',
        sequence: 9,
      },
    };
    mockSocketHandlers.get('journey:location')?.(location);
    expect(onDriverLocation).toHaveBeenCalledWith(location);
  });

  it('normalizes the flat legacy driver-location event when v2 is unavailable', async () => {
    jest.useFakeTimers();
    const onDriverLocation = jest.fn();
    await connectTripTracking('trip-1', { onDriverLocation });
    mockSocketHandlers.get('driver:location')?.({
      tripId: 'trip-1',
      sequence: 9,
      recordedAt: '2026-08-22T17:59:58.000Z',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
      lat: 30,
      lng: 31,
      heading: 20,
      speed: 8,
      accuracy: 5,
    });
    jest.advanceTimersByTime(100);
    expect(onDriverLocation).toHaveBeenCalledWith({
      tripId: 'trip-1',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
      location: {
        sequence: 9,
        recordedAt: '2026-08-22T17:59:58.000Z',
        serverTimestamp: '2026-08-22T18:00:00.000Z',
        lat: 30,
        lng: 31,
        heading: 20,
        speed: 8,
        accuracy: 5,
      },
    });
  });

  it('prefers journey:location when both migration events arrive', async () => {
    jest.useFakeTimers();
    const onDriverLocation = jest.fn();
    await connectTripTracking('trip-1', { onDriverLocation });
    const flat = {
      tripId: 'trip-1',
      sequence: 9,
      recordedAt: '2026-08-22T17:59:58.000Z',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
      lat: 30,
      lng: 31,
      heading: 20,
      speed: 8,
      accuracy: 5,
    };
    const nested = {
      tripId: 'trip-1',
      serverTimestamp: flat.serverTimestamp,
      location: {
        sequence: flat.sequence,
        recordedAt: flat.recordedAt,
        serverTimestamp: flat.serverTimestamp,
        lat: flat.lat,
        lng: flat.lng,
        heading: flat.heading,
        speed: flat.speed,
        accuracy: flat.accuracy,
      },
    };
    mockSocketHandlers.get('driver:location')?.(flat);
    mockSocketHandlers.get('journey:location')?.(nested);
    jest.advanceTimersByTime(100);
    expect(onDriverLocation).toHaveBeenCalledTimes(1);
    expect(onDriverLocation).toHaveBeenCalledWith(nested);
  });

  it('delivers authoritative navigation progress without starting REST polling', async () => {
    const onNavigationProgress = jest.fn();
    await connectTripTracking('trip-1', { onNavigationProgress });
    const progress = {
      tripId: 'trip-1',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
      navigation: {
        remainingDistanceMeters: 1_200,
        remainingDurationSeconds: 360,
        calculatedAt: '2026-08-22T17:59:58.000Z',
        targetStopId: 'stop-1',
        routeRevision: 2,
        encodedPolyline: null,
        coordinates: [{ latitude: 30, longitude: 31 }],
        updatedAt: '2026-08-22T18:00:00.000Z',
      },
    };
    mockSocketHandlers.get('journey:navigation')?.(progress);
    expect(onNavigationProgress).toHaveBeenCalledWith(progress);
  });

  it('uses navigation:progress only when the versioned event is unavailable', async () => {
    jest.useFakeTimers();
    const onNavigationProgress = jest.fn();
    await connectTripTracking('trip-1', { onNavigationProgress });
    const progress = {
      tripId: 'trip-1',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
      navigation: {
        remainingDistanceMeters: null,
        remainingDurationSeconds: null,
        calculatedAt: null,
        targetStopId: null,
        routeRevision: 0,
        encodedPolyline: null,
        coordinates: null,
        updatedAt: '2026-08-22T18:00:00.000Z',
      },
    };
    mockSocketHandlers.get('navigation:progress')?.(progress);
    jest.advanceTimersByTime(100);
    expect(onNavigationProgress).toHaveBeenCalledWith(progress);
  });

  it('scopes booking cancellation events to the subscribed trip', async () => {
    const onBookingCancelled = jest.fn();
    await connectTripTracking('trip-1', { onBookingCancelled });
    mockSocketHandlers.get('booking:cancelled')?.({
      tripId: 'trip-2',
      bookingId: 'booking-1',
      status: 'CANCELLED',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
    });
    expect(onBookingCancelled).not.toHaveBeenCalled();
    const ownEvent = {
      tripId: 'trip-1',
      bookingId: 'booking-1',
      status: 'REFUNDED',
      serverTimestamp: '2026-08-22T18:00:01.000Z',
    };
    mockSocketHandlers.get('booking:cancelled')?.(ownEvent);
    expect(onBookingCancelled).toHaveBeenCalledWith(ownEvent);
  });

  it('delivers the targeted access-revoked event before the server evicts the socket', async () => {
    const onAccessRevoked = jest.fn();
    await connectTripTracking('trip-1', { onAccessRevoked });
    const event = {
      tripId: 'trip-1',
      bookingId: 'booking-1',
      code: 'BOOKING_CANCELLED',
      serverTimestamp: '2026-08-22T18:00:00.000Z',
    };
    mockSocketHandlers.get('trip:access-revoked')?.(event);
    expect(onAccessRevoked).toHaveBeenCalledWith(event);
  });

  it('requests an authoritative resync for a malformed journey envelope', async () => {
    const onResyncRequired = jest.fn();
    const onJourneyEvent = jest.fn();
    await connectTripTracking('trip-1', { onResyncRequired, onJourneyEvent });
    mockSocketHandlers.get('journey:event')?.({ event: { revision: 2 }, snapshot: {} });
    expect(onJourneyEvent).not.toHaveBeenCalled();
    expect(onResyncRequired).toHaveBeenCalledTimes(1);
  });

  it('refetches when the passenger snapshot provider fails', async () => {
    const onResyncRequired = jest.fn();
    const onJourneyEvent = jest.fn();
    await connectTripTracking('trip-1', { onResyncRequired, onJourneyEvent });
    mockSocketHandlers.get('journey:event')?.({
      tripId: 'trip-1',
      revision: 2,
      schemaVersion: 2,
      serverTimestamp: '2026-08-22T18:00:01.000Z',
      event: {
        id: 'event-1',
        action: 'START_EN_ROUTE',
        idempotencyKey: 'key-1',
        clientSequence: 1,
        occurredAt: '2026-08-22T18:00:00.000Z',
        receivedAt: '2026-08-22T18:00:01.000Z',
      },
      snapshot: null,
      requiresRefetch: true,
    });
    expect(onJourneyEvent).not.toHaveBeenCalled();
    expect(onResyncRequired).toHaveBeenCalledTimes(1);
  });
});
