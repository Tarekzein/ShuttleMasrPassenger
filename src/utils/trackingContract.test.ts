import type { Booking, TripTracking, TripTrackingV2 } from '../types/passenger';
import {
  acceptLocationUpdate,
  classifyRevision,
  isBookingTrackingEligible,
  isJourneyEventV2,
  isTripTrackingV2,
  normalizeTrackingSnapshot,
  trackingFallbackInterval,
} from './trackingContract';

const v2: TripTrackingV2 = {
  apiVersion: 2,
  serverTimestamp: '2026-08-22T18:00:00.000Z',
  revision: 4,
  terminal: false,
  tracking: { open: true, state: 'LIVE', lastSeenAt: '2026-08-22T17:59:59.000Z' },
  trip: {
    id: 'trip-1',
    legacyStatus: 'IN_PROGRESS',
    phase: 'DRIVER_EN_ROUTE',
    departureTime: '2026-08-22T18:00:00.000Z',
    startedAt: null,
    completedAt: null,
  },
  passenger: {
    bookingId: 'booking-1',
    bookingStatus: 'CONFIRMED',
    phase: 'DRIVER_EN_ROUTE',
    seats: [{ id: 'seat-1', status: 'PENDING' }],
    outstandingAmount: '12.50',
  },
  booking: { id: 'booking-1', status: 'CONFIRMED', seats: 1, outstandingAmount: '12.50' },
  currentStop: null,
  stops: [
    { stopId: 'pickup', stopOrder: 1, phase: 'PENDING', arrivedAt: null, completedAt: null, name: 'A', nameAr: 'أ', lat: 30, lng: 31 },
    { stopId: 'dropoff', stopOrder: 2, phase: 'PENDING', arrivedAt: null, completedAt: null, name: 'B', nameAr: 'ب', lat: 30.1, lng: 31.1 },
  ],
  driver: { name: 'Driver', phone: '+20000000000' },
  vehicle: { plateNumber: 'ABC 123', type: 'BUS' },
  location: {
    lat: 30,
    lng: 31,
    heading: 45,
    speed: 10,
    accuracy: 8,
    deviceTimestamp: '2026-08-22T17:59:58.000Z',
    serverTimestamp: '2026-08-22T17:59:59.000Z',
    sequence: 8,
  },
  route: {
    routeSource: 'DRIVER_NAVIGATION',
    coordinates: [{ latitude: 30, longitude: 31 }, { latitude: 30.1, longitude: 31.1 }],
    encodedPolyline: null,
    routeRevision: 2,
    calculatedAt: '2026-08-22T17:59:58.000Z',
    remainingDistanceMeters: 1200,
    remainingDurationSeconds: 360,
    targetStopId: 'pickup',
    stale: false,
    stalenessSeconds: 1,
  },
  pickupStop: { id: 'pickup', nameEn: 'A', nameAr: 'أ', lat: 30, lng: 31 },
  dropoffStop: { id: 'dropoff', nameEn: 'B', nameAr: 'ب', lat: 30.1, lng: 31.1 },
  outstandingCharges: [{ tripRef: 'TRIP0001', amount: '12.50', reason: 'NO_SHOW', status: 'PENDING' }],
};

describe('tracking contract normalization', () => {
  it('normalizes the passenger v2 projection and derives pickup/drop-off flags', () => {
    const snapshot = normalizeTrackingSnapshot(v2);
    expect(snapshot.apiVersion).toBe(2);
    expect(snapshot.revision).toBe(4);
    expect(snapshot.stops.find((stop) => stop.stopId === 'pickup')?.isPickup).toBe(true);
    expect(snapshot.stops.find((stop) => stop.stopId === 'dropoff')?.isDropoff).toBe(true);
    expect(snapshot.route.remainingDurationSeconds).toBe(360);
    expect(snapshot.passenger.outstandingAmount).toBe('12.50');
    expect(snapshot.outstandingCharges).toHaveLength(1);
  });

  it('rejects a generic journey snapshot as a passenger projection', () => {
    const { passenger: _passenger, tracking: _tracking, ...generic } = v2;
    expect(isTripTrackingV2(generic)).toBe(false);
  });

  it('tears down and redacts telemetry when passenger tracking access closes', () => {
    const snapshot = normalizeTrackingSnapshot({
      ...v2,
      passenger: { ...v2.passenger, bookingStatus: 'CANCELLED', phase: 'CANCELLED' },
    });
    expect(snapshot.terminal).toBe(true);
    expect(snapshot.location).toBeNull();
    expect(snapshot.route.routeSource).toBe('LINE_STOPS');
    expect(snapshot.route.remainingDurationSeconds).toBeNull();
    expect(snapshot.driver?.phone).toBeNull();
  });

  it('preserves the backend booking-level outstanding amount during v2 rollout', () => {
    const { outstandingAmount: _outstandingAmount, ...passenger } = v2.passenger;
    const snapshot = normalizeTrackingSnapshot({
      ...v2,
      passenger,
      booking: { ...v2.booking!, outstandingAmount: '43.25' },
    });
    expect(snapshot.passenger.outstandingAmount).toBe('43.25');
  });

  it('keeps the deployed v1 payload usable', () => {
    const legacy: TripTracking = {
      booking: { id: 'booking-1', status: 'CONFIRMED', seats: 1, outstandingAmount: 0 },
      trip: { id: 'trip-1', status: 'BOARDING', departureTime: '2026-08-22T18:00:00.000Z' },
      trackingOpen: true,
      etaTarget: 'PICKUP',
      driverLocation: { lat: 30, lng: 31, at: '2026-08-22T17:59:59.000Z' },
      driver: { name: 'Driver' },
      vehicle: null,
      pickupStop: { id: 'pickup', nameEn: 'A', lat: 30, lng: 31 },
      dropoffStop: { id: 'dropoff', nameEn: 'B', lat: 30.1, lng: 31.1 },
      stops: [],
      routeCoordinates: [],
      outstandingCharges: [],
    };
    const snapshot = normalizeTrackingSnapshot(legacy);
    expect(snapshot.apiVersion).toBe(1);
    expect(snapshot.trip.phase).toBe('DRIVER_EN_ROUTE');
    expect(snapshot.stops.some((stop) => stop.isPickup)).toBe(true);
    expect(snapshot.location?.lat).toBe(30);
  });

  it('tears down a cancelled v1 booking even when an older backend reports the trip live', () => {
    const legacy: TripTracking = {
      booking: { id: 'booking-1', status: 'CANCELLED', seats: 1, outstandingAmount: 0 },
      trip: { id: 'trip-1', status: 'BOARDING', departureTime: '2026-08-22T18:00:00.000Z' },
      trackingOpen: true,
      etaTarget: 'PICKUP',
      driverLocation: { lat: 30, lng: 31, at: '2026-08-22T17:59:59.000Z' },
      driver: { name: 'Driver', phone: '+20000000000' },
      vehicle: null,
      pickupStop: { id: 'pickup', nameEn: 'A', lat: 30, lng: 31 },
      dropoffStop: { id: 'dropoff', nameEn: 'B', lat: 30.1, lng: 31.1 },
      stops: [],
      routeCoordinates: [],
      outstandingCharges: [],
    };

    const snapshot = normalizeTrackingSnapshot(legacy);
    expect(snapshot.terminal).toBe(true);
    expect(snapshot.tracking.open).toBe(false);
    expect(snapshot.tracking.lastSeenAt).toBeNull();
    expect(snapshot.location).toBeNull();
    expect(snapshot.driver?.phone).toBeNull();
  });
});

describe('tracking ordering and plausibility', () => {
  it('rejects malformed realtime ledger envelopes', () => {
    expect(isJourneyEventV2({ event: { revision: 2 }, snapshot: {} })).toBe(false);
  });

  it('detects stale, sequential, and revision-gap events', () => {
    expect(classifyRevision(4, 4)).toBe('stale');
    expect(classifyRevision(4, 5)).toBe('next');
    expect(classifyRevision(4, 7)).toBe('gap');
  });

  it('rejects stale sequence numbers and implausible teleports', () => {
    const previous = v2.location!;
    expect(acceptLocationUpdate(previous, { ...previous, sequence: 7 }).reason).toBe('stale');
    expect(
      acceptLocationUpdate(previous, {
        ...previous,
        lat: 31,
        sequence: 9,
        serverTimestamp: '2026-08-22T18:00:00.000Z',
      }).reason,
    ).toBe('implausible');
  });

  it('accepts a nearby monotonic location update', () => {
    const previous = v2.location!;
    expect(
      acceptLocationUpdate(previous, {
        ...previous,
        lat: 30.0001,
        sequence: 9,
        serverTimestamp: '2026-08-22T18:00:02.000Z',
      }).accepted,
    ).toBe(true);
  });
});

describe('assigned tracking surface', () => {
  it('allows tracking for an assigned legacy booking before boarding', () => {
    const booking = {
      id: 'booking-1',
      status: 'CONFIRMED',
      trip: { status: 'SCHEDULED', driver: { user: { name: 'Driver' } } },
    } as Booking;
    expect(isBookingTrackingEligible(booking)).toBe(true);
  });

  it('does not reopen tracking for a cancelled booking on a nonterminal trip', () => {
    const booking = {
      id: 'booking-1',
      status: 'CANCELLED',
      trip: { status: 'SCHEDULED', phase: 'ASSIGNED' },
    } as Booking;
    expect(isBookingTrackingEligible(booking)).toBe(false);
  });
});

describe('adaptive tracking fallback', () => {
  it('polls only while disconnected and never after terminal state', () => {
    const active = normalizeTrackingSnapshot(v2);
    expect(trackingFallbackInterval(active, false)).toBe(false);
    expect(trackingFallbackInterval(active, true)).toBe(15_000);
    expect(trackingFallbackInterval({ ...active, terminal: true }, true)).toBe(false);
  });
});
