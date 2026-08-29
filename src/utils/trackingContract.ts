import type {
  Booking,
  Coordinates,
  JourneyEventV2,
  PassengerJourneyPhase,
  PassengerSeatPhase,
  TrackingLocationV2,
  TrackingRouteV2,
  TrackingSnapshot,
  TrackingStopPhaseV2,
  TrackingStopV2,
  TripJourneyPhase,
  TripTracking,
  TripTrackingV2,
} from '../types/passenger';

const TERMINAL_PHASES = new Set<TripJourneyPhase>(['COMPLETED', 'CANCELLED', 'NO_SHOW']);
const PRECISE_LOCATION_PHASES = new Set<TripJourneyPhase>(['DRIVER_EN_ROUTE', 'IN_PROGRESS']);
const TRACKING_STATES = new Set(['NOT_STARTED', 'LIVE', 'STALE', 'ENDED']);
const TRIP_STATUSES = new Set(['SCHEDULED', 'BOARDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const BOOKING_STATUSES = new Set(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED']);
const STOP_PHASES = new Set(['PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED']);
const TRIP_PHASES = new Set([
  'ASSIGNED',
  'DRIVER_EN_ROUTE',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
const PASSENGER_PHASES = new Set([
  'WAITING_ASSIGNMENT',
  'WAITING_FOR_DRIVER',
  'DRIVER_EN_ROUTE',
  'ARRIVED_AT_PICKUP',
  'PASSENGER_PICKED_UP',
  'IN_PROGRESS',
  'ARRIVED_AT_STOP',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
const SEAT_PHASES = new Set(['PENDING', 'BOARDED', 'IN_TRANSIT', 'DROPPED_OFF', 'NO_SHOW', 'CANCELLED']);
const ROUTE_SOURCES = new Set(['DRIVER_NAVIGATION', 'LINE_STOPS']);
export const TRACKING_FALLBACK_POLL_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isNullableString(value: unknown): boolean {
  return value == null || typeof value === 'string';
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isNullableTimestamp(value: unknown): boolean {
  return value == null || isTimestamp(value);
}

function isCoordinate(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
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

function isTrackingLocation(value: unknown): value is TrackingLocationV2 {
  if (!isRecord(value)) return false;
  return (
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180 &&
    (value.heading == null || (typeof value.heading === 'number' && Number.isFinite(value.heading))) &&
    (value.speed == null || (typeof value.speed === 'number' && Number.isFinite(value.speed) && value.speed >= 0)) &&
    (value.accuracy == null || (typeof value.accuracy === 'number' && Number.isFinite(value.accuracy) && value.accuracy >= 0)) &&
    isNullableTimestamp(value.deviceTimestamp) &&
    isTimestamp(value.serverTimestamp) &&
    typeof value.sequence === 'number' && Number.isInteger(value.sequence) && value.sequence >= 0
  );
}

function isTrackingStop(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.stopId === 'string' &&
    typeof value.stopOrder === 'number' &&
    Number.isInteger(value.stopOrder) &&
    typeof value.phase === 'string' &&
    STOP_PHASES.has(value.phase) &&
    isNullableTimestamp(value.arrivedAt) &&
    isNullableTimestamp(value.completedAt) &&
    isNullableString(value.name) &&
    isNullableString(value.nameAr) &&
    (value.lat == null || (typeof value.lat === 'number' && Number.isFinite(value.lat) && value.lat >= -90 && value.lat <= 90)) &&
    (value.lng == null || (typeof value.lng === 'number' && Number.isFinite(value.lng) && value.lng >= -180 && value.lng <= 180))
  );
}

function isLegacyStop(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.stopId === 'string' &&
    typeof value.stopOrder === 'number' &&
    typeof value.status === 'string' &&
    typeof value.isPickup === 'boolean' &&
    typeof value.isDropoff === 'boolean'
  );
}

function isStop(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.nameEn === 'string' &&
    isNullableString(value.nameAr) &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180
  );
}

function isLegacyLocation(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lng) &&
    value.lng >= -180 &&
    value.lng <= 180 &&
    isNullableTimestamp(value.at)
  );
}

function isTripTrackingV1(value: unknown): value is TripTracking {
  if (!isRecord(value) || !isRecord(value.booking) || !isRecord(value.trip)) return false;
  return (
    typeof value.booking.id === 'string' &&
    typeof value.booking.status === 'string' && BOOKING_STATUSES.has(value.booking.status) &&
    typeof value.booking.seats === 'number' &&
    typeof value.trip.id === 'string' &&
    typeof value.trip.status === 'string' && TRIP_STATUSES.has(value.trip.status) &&
    isTimestamp(value.trip.departureTime) &&
    typeof value.trackingOpen === 'boolean' &&
    (value.etaTarget === 'PICKUP' || value.etaTarget === 'DESTINATION') &&
    isStop(value.pickupStop) &&
    isStop(value.dropoffStop) &&
    Array.isArray(value.stops) &&
    value.stops.every(isLegacyStop) &&
    Array.isArray(value.routeCoordinates) &&
    value.routeCoordinates.every(isCoordinate) &&
    Array.isArray(value.outstandingCharges) &&
    (value.driverLocation == null || isLegacyLocation(value.driverLocation)) &&
    (value.driver == null || (isRecord(value.driver) && typeof value.driver.name === 'string')) &&
    (value.vehicle == null || isRecord(value.vehicle))
  );
}

function isOutstandingCharge(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.tripRef === 'string' &&
    (typeof value.amount === 'number' || typeof value.amount === 'string') &&
    typeof value.reason === 'string' &&
    typeof value.status === 'string'
  );
}

export function isTripTrackingV2(value: unknown): value is TripTrackingV2 {
  if (!isRecord(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (!isRecord(candidate.tracking) || !isRecord(candidate.trip) || !isRecord(candidate.passenger)) {
    return false;
  }
  if (!isRecord(candidate.route) || !Array.isArray(candidate.stops)) return false;
  const tracking = candidate.tracking;
  const trip = candidate.trip;
  const passenger = candidate.passenger;
  const route = candidate.route;
  return (
    candidate.apiVersion === 2 &&
    typeof candidate.revision === 'number' && Number.isInteger(candidate.revision) && candidate.revision >= 0 &&
    isTimestamp(candidate.serverTimestamp) &&
    typeof candidate.terminal === 'boolean' &&
    typeof tracking.open === 'boolean' &&
    typeof tracking.state === 'string' && TRACKING_STATES.has(tracking.state) &&
    isNullableTimestamp(tracking.lastSeenAt) &&
    typeof trip.id === 'string' &&
    typeof trip.legacyStatus === 'string' && TRIP_STATUSES.has(trip.legacyStatus) &&
    typeof trip.phase === 'string' && TRIP_PHASES.has(trip.phase) &&
    isTimestamp(trip.departureTime) &&
    isNullableTimestamp(trip.startedAt) &&
    isNullableTimestamp(trip.completedAt) &&
    typeof passenger.bookingId === 'string' &&
    typeof passenger.bookingStatus === 'string' && BOOKING_STATUSES.has(passenger.bookingStatus) &&
    typeof passenger.phase === 'string' && PASSENGER_PHASES.has(passenger.phase) &&
    Array.isArray(passenger.seats) &&
    passenger.seats.every(
      (seat) => isRecord(seat) && typeof seat.id === 'string' && typeof seat.status === 'string' && SEAT_PHASES.has(seat.status),
    ) &&
    (passenger.outstandingAmount == null || typeof passenger.outstandingAmount === 'number' || typeof passenger.outstandingAmount === 'string') &&
    typeof route.routeSource === 'string' && ROUTE_SOURCES.has(route.routeSource) &&
    Array.isArray(route.coordinates) && route.coordinates.every(isCoordinate) &&
    typeof route.routeRevision === 'number' && Number.isInteger(route.routeRevision) && route.routeRevision >= 0 &&
    isNullableString(route.encodedPolyline) &&
    isNullableTimestamp(route.calculatedAt) &&
    isNullableString(route.targetStopId) &&
    (route.remainingDistanceMeters == null || (typeof route.remainingDistanceMeters === 'number' && Number.isFinite(route.remainingDistanceMeters) && route.remainingDistanceMeters >= 0)) &&
    (route.remainingDurationSeconds == null || (typeof route.remainingDurationSeconds === 'number' && Number.isFinite(route.remainingDurationSeconds) && route.remainingDurationSeconds >= 0)) &&
    typeof route.stale === 'boolean' &&
    (route.stalenessSeconds == null || (typeof route.stalenessSeconds === 'number' && Number.isFinite(route.stalenessSeconds) && route.stalenessSeconds >= 0)) &&
    candidate.stops.every(isTrackingStop) &&
    (candidate.currentStop == null || isTrackingStop(candidate.currentStop)) &&
    (candidate.driver == null || (
      isRecord(candidate.driver) &&
      typeof candidate.driver.name === 'string' &&
      isNullableString(candidate.driver.avatarUrl) &&
      isNullableString(candidate.driver.phone)
    )) &&
    (candidate.vehicle == null || isRecord(candidate.vehicle)) &&
    (candidate.booking == null || (
      isRecord(candidate.booking) &&
      typeof candidate.booking.id === 'string' &&
      typeof candidate.booking.status === 'string' &&
      BOOKING_STATUSES.has(candidate.booking.status) &&
      typeof candidate.booking.seats === 'number' &&
      (typeof candidate.booking.outstandingAmount === 'number' || typeof candidate.booking.outstandingAmount === 'string')
    )) &&
    (candidate.pickupStop == null || isStop(candidate.pickupStop)) &&
    (candidate.dropoffStop == null || isStop(candidate.dropoffStop)) &&
    (candidate.outstandingCharges == null || (
      Array.isArray(candidate.outstandingCharges) && candidate.outstandingCharges.every(isOutstandingCharge)
    )) &&
    (candidate.location == null || isTrackingLocation(candidate.location))
  );
}

export function isJourneyEventV2(value: unknown): value is JourneyEventV2 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<JourneyEventV2>;
  if (
    typeof candidate.tripId !== 'string' ||
    typeof candidate.revision !== 'number' ||
    !Number.isInteger(candidate.revision) ||
    candidate.revision < 0 ||
    candidate.schemaVersion !== 2 ||
    !isTimestamp(candidate.serverTimestamp) ||
    !candidate.event ||
    typeof candidate.event !== 'object'
  ) {
    return false;
  }
  const event = candidate.event as Partial<JourneyEventV2['event']>;
  return (
    typeof event.id === 'string' &&
    typeof event.action === 'string' &&
    typeof event.idempotencyKey === 'string' &&
    typeof event.clientSequence === 'number' &&
    Number.isInteger(event.clientSequence) &&
    event.clientSequence >= 0 &&
    (event.clientInstanceId == null || typeof event.clientInstanceId === 'string') &&
    isTimestamp(event.occurredAt) &&
    isTimestamp(event.receivedAt) &&
    'snapshot' in candidate
  );
}

function mapLegacyTripPhase(status: TripTracking['trip']['status']): TripJourneyPhase {
  switch (status) {
    case 'BOARDING':
      return 'DRIVER_EN_ROUTE';
    case 'IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'ASSIGNED';
  }
}

function seatStatus(value: string): PassengerSeatPhase {
  switch (value) {
    case 'BOARDED':
    case 'IN_TRANSIT':
    case 'DROPPED_OFF':
    case 'NO_SHOW':
    case 'CANCELLED':
      return value;
    default:
      return 'PENDING';
  }
}

function mapLegacyPassengerPhase(data: TripTracking, tripPhase: TripJourneyPhase): PassengerJourneyPhase {
  if (data.booking.status === 'CANCELLED' || tripPhase === 'CANCELLED') return 'CANCELLED';
  if (tripPhase === 'COMPLETED') return 'COMPLETED';
  if (data.etaTarget === 'DESTINATION') {
    return tripPhase === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PASSENGER_PICKED_UP';
  }
  if (tripPhase === 'DRIVER_EN_ROUTE' || tripPhase === 'IN_PROGRESS') return 'DRIVER_EN_ROUTE';
  return data.driver ? 'WAITING_FOR_DRIVER' : 'WAITING_ASSIGNMENT';
}

function mapLegacyStopPhase(status: TripTracking['stops'][number]['status']): TrackingStopPhaseV2 {
  if (status === 'WAITING') return 'ARRIVED';
  return status;
}

function legacyStops(data: TripTracking): TrackingStopV2[] {
  const stops = data.stops.map((stop) => ({
    stopId: stop.stopId,
    stopOrder: stop.stopOrder,
    phase: mapLegacyStopPhase(stop.status),
    arrivedAt: stop.arrivedAt ?? null,
    completedAt: stop.completedAt ?? null,
    name: stop.name ?? null,
    nameAr: stop.nameAr ?? null,
    lat: stop.lat ?? null,
    lng: stop.lng ?? null,
    isPickup: stop.isPickup,
    isDropoff: stop.isDropoff,
  }));

  if (!stops.some((stop) => stop.isPickup)) {
    stops.push({
      stopId: data.pickupStop.id,
      stopOrder: -1,
      phase: 'PENDING',
      arrivedAt: null,
      completedAt: null,
      name: data.pickupStop.nameEn,
      nameAr: data.pickupStop.nameAr ?? null,
      lat: data.pickupStop.lat,
      lng: data.pickupStop.lng,
      isPickup: true,
      isDropoff: false,
    });
  }
  if (!stops.some((stop) => stop.isDropoff)) {
    stops.push({
      stopId: data.dropoffStop.id,
      stopOrder: Number.MAX_SAFE_INTEGER,
      phase: 'PENDING',
      arrivedAt: null,
      completedAt: null,
      name: data.dropoffStop.nameEn,
      nameAr: data.dropoffStop.nameAr ?? null,
      lat: data.dropoffStop.lat,
      lng: data.dropoffStop.lng,
      isPickup: false,
      isDropoff: true,
    });
  }
  return stops.sort((a, b) => a.stopOrder - b.stopOrder);
}

/** Decodes a Google encoded polyline without adding a runtime map dependency. */
export function decodeEncodedPolyline(encoded: string | null | undefined): Coordinates[] {
  if (!encoded) return [];
  const coordinates: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  const nextDelta = (): number | null => {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      if (index >= encoded.length || shift > 30) return null;
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) return null;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    const latitudeDelta = nextDelta();
    const longitudeDelta = nextDelta();
    if (latitudeDelta == null || longitudeDelta == null) return [];
    latitude += latitudeDelta;
    longitude += longitudeDelta;
    const point = { latitude: latitude / 1e5, longitude: longitude / 1e5 };
    if (!isCoordinate(point)) return [];
    coordinates.push(point);
  }
  return coordinates;
}

function normalizeRoute(route: TripTrackingV2['route']): TrackingRouteV2 {
  const source = route.routeSource ?? route.source ?? 'LINE_STOPS';
  const fallbackEta = route.etaToPickupSeconds ?? route.etaToDropoffSeconds ?? null;
  const decodedCoordinates = source === 'DRIVER_NAVIGATION'
    ? decodeEncodedPolyline(route.encodedPolyline)
    : [];
  return {
    routeSource: source,
    // Prefer the encoded SDK route when supplied. Older rollout servers paired
    // it with line-stop fallback coordinates, which are not the driven route.
    coordinates: decodedCoordinates.length > 0
      ? decodedCoordinates
      : Array.isArray(route.coordinates) ? route.coordinates : [],
    encodedPolyline: route.encodedPolyline ?? null,
    routeRevision: Number.isFinite(route.routeRevision) ? route.routeRevision : 0,
    calculatedAt: route.calculatedAt ?? null,
    remainingDistanceMeters: route.remainingDistanceMeters ?? null,
    remainingDurationSeconds: route.remainingDurationSeconds ?? fallbackEta,
    targetStopId: route.targetStopId ?? null,
    stale: route.stale ?? false,
    stalenessSeconds: route.stalenessSeconds ?? null,
  };
}

export function normalizeTrackingSnapshot(raw: TripTracking | TripTrackingV2): TrackingSnapshot {
  if (isTripTrackingV2(raw)) {
    const stops = raw.stops.map((stop) => ({
      ...stop,
      isPickup: stop.isPickup ?? stop.stopId === raw.pickupStop?.id,
      isDropoff: stop.isDropoff ?? stop.stopId === raw.dropoffStop?.id,
    }));
    const currentStop = raw.currentStop
      ? stops.find((stop) => stop.stopId === raw.currentStop?.stopId) ?? {
          ...raw.currentStop,
          isPickup: raw.currentStop.isPickup ?? raw.currentStop.stopId === raw.pickupStop?.id,
          isDropoff: raw.currentStop.isDropoff ?? raw.currentStop.stopId === raw.dropoffStop?.id,
        }
      : null;
    const bookingStatus = raw.passenger.bookingStatus ?? raw.booking?.status;
    const bookingAccessEnded = bookingStatus === 'CANCELLED' || bookingStatus === 'REFUNDED';
    const terminal =
      raw.terminal || TERMINAL_PHASES.has(raw.trip.phase) || !raw.tracking.open || bookingAccessEnded;
    const preciseAllowed = !terminal && PRECISE_LOCATION_PHASES.has(raw.trip.phase);
    const lineCoordinates = stops
      .filter((stop) => stop.lat != null && stop.lng != null)
      .map((stop) => ({ latitude: stop.lat!, longitude: stop.lng! }));
    const route = preciseAllowed
      ? normalizeRoute(raw.route)
      : {
          routeSource: 'LINE_STOPS' as const,
          coordinates: lineCoordinates,
          encodedPolyline: null,
          routeRevision: 0,
          calculatedAt: null,
          remainingDistanceMeters: null,
          remainingDurationSeconds: null,
          targetStopId: null,
          stale: false,
          stalenessSeconds: null,
        };
    return {
      apiVersion: 2,
      serverTimestamp: raw.serverTimestamp,
      revision: raw.revision,
      terminal,
      tracking: terminal ? { open: false, state: 'ENDED', lastSeenAt: null } : raw.tracking,
      trip: raw.trip,
      passenger: {
        ...raw.passenger,
        seatsCount: raw.passenger.seats.length,
        outstandingAmount: raw.passenger.outstandingAmount ?? raw.booking?.outstandingAmount ?? 0,
      },
      message: null,
      currentStop,
      stops,
      driver: raw.driver
        ? { ...raw.driver, phone: terminal ? null : raw.driver.phone ?? null }
        : null,
      vehicle: raw.vehicle,
      location: preciseAllowed ? raw.location : null,
      route,
      outstandingCharges: raw.outstandingCharges ?? [],
    };
  }

  if (!isTripTrackingV1(raw)) {
    throw new Error('Unsupported passenger tracking response');
  }

  const tripPhase = mapLegacyTripPhase(raw.trip.status);
  const stops = legacyStops(raw);
  const bookingAccessEnded =
    raw.booking.status === 'CANCELLED' || raw.booking.status === 'REFUNDED';
  const terminal = TERMINAL_PHASES.has(tripPhase) || bookingAccessEnded;
  const at = raw.driverLocation?.at ?? raw.trip.startedAt ?? raw.trip.departureTime;
  return {
    apiVersion: 1,
    serverTimestamp: raw.driverLocation?.at ?? null,
    revision: 0,
    terminal,
    tracking: {
      open: raw.trackingOpen && !terminal,
      state: terminal ? 'ENDED' : raw.driverLocation ? 'LIVE' : 'NOT_STARTED',
      lastSeenAt: terminal ? null : raw.driverLocation?.at ?? null,
    },
    trip: {
      id: raw.trip.id,
      legacyStatus: raw.trip.status,
      phase: tripPhase,
      departureTime: raw.trip.departureTime,
      startedAt: raw.trip.startedAt ?? null,
      completedAt: null,
    },
    passenger: {
      bookingId: raw.booking.id,
      bookingStatus: raw.booking.status,
      phase: mapLegacyPassengerPhase(raw, tripPhase),
      seats: [],
      seatsCount: raw.booking.seats,
      outstandingAmount: raw.booking.outstandingAmount,
    },
    message: raw.message ?? null,
    currentStop: stops.find((stop) => stop.phase === 'ARRIVED') ?? stops.find((stop) => stop.phase === 'PENDING') ?? null,
    stops,
    driver: raw.driver
      ? { ...raw.driver, phone: terminal ? null : raw.driver.phone ?? null }
      : null,
    vehicle: raw.vehicle
      ? {
          id: raw.vehicle.id,
          plateNumber: raw.vehicle.plateNumber,
          capacity: raw.vehicle.capacity,
          type: raw.vehicle.type,
          model: raw.vehicle.model,
          color: raw.vehicle.color,
        }
      : null,
    location: !terminal && raw.driverLocation
      ? {
          lat: raw.driverLocation.lat,
          lng: raw.driverLocation.lng,
          heading: raw.driverLocation.heading ?? null,
          speed: raw.driverLocation.speed ?? null,
          accuracy: null,
          deviceTimestamp: null,
          serverTimestamp: at,
          sequence: 0,
        }
      : null,
    route: {
      routeSource: 'LINE_STOPS',
      coordinates: raw.routeCoordinates,
      encodedPolyline: null,
      routeRevision: 0,
      calculatedAt: null,
      remainingDistanceMeters: null,
      remainingDurationSeconds: null,
      targetStopId: raw.etaTarget === 'DESTINATION' ? raw.dropoffStop.id : raw.pickupStop.id,
      stale: false,
      stalenessSeconds: null,
    },
    outstandingCharges: raw.outstandingCharges,
    legacy: raw,
  };
}

export function isTerminalPhase(phase: TripJourneyPhase): boolean {
  return TERMINAL_PHASES.has(phase);
}

export function canShowPreciseLocation(snapshot: TrackingSnapshot): boolean {
  return (
    !snapshot.terminal &&
    snapshot.tracking.open &&
    PRECISE_LOCATION_PHASES.has(snapshot.trip.phase) &&
    snapshot.location != null
  );
}

export function isBookingTrackingEligible(booking: Booking): boolean {
  if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') return false;
  const phase = booking.trip.phase ?? booking.trip.journeyPhase;
  if (phase) return !TERMINAL_PHASES.has(phase);
  if (booking.trip.status === 'BOARDING' || booking.trip.status === 'IN_PROGRESS') return true;
  return (
    booking.trip.status === 'SCHEDULED' &&
    Boolean(booking.trip.trackingOpen || booking.trip.driver || booking.trip.vehicle)
  );
}

export type RevisionDisposition = 'stale' | 'next' | 'gap';

export function classifyRevision(current: number, incoming: number): RevisionDisposition {
  if (incoming <= current) return 'stale';
  if (current === 0 || incoming === current + 1) return 'next';
  return 'gap';
}

export interface LocationAcceptance {
  accepted: boolean;
  reason?: 'invalid' | 'stale' | 'implausible';
}

function validCoordinate(location: TrackingLocationV2): boolean {
  return (
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180 &&
    (location.accuracy == null || (Number.isFinite(location.accuracy) && location.accuracy >= 0))
  );
}

function distanceMeters(a: TrackingLocationV2, b: TrackingLocationV2): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function acceptLocationUpdate(
  previous: TrackingLocationV2 | null,
  next: TrackingLocationV2,
): LocationAcceptance {
  if (!validCoordinate(next) || (next.accuracy != null && next.accuracy > 1_500)) {
    return { accepted: false, reason: 'invalid' };
  }
  if (!previous) return { accepted: true };
  if (next.sequence > 0 && previous.sequence > 0 && next.sequence <= previous.sequence) {
    return { accepted: false, reason: 'stale' };
  }
  const previousAt = Date.parse(previous.serverTimestamp);
  const nextAt = Date.parse(next.serverTimestamp);
  if (Number.isFinite(previousAt) && Number.isFinite(nextAt) && nextAt <= previousAt) {
    return { accepted: false, reason: 'stale' };
  }
  if (Number.isFinite(previousAt) && Number.isFinite(nextAt)) {
    const elapsedSeconds = (nextAt - previousAt) / 1_000;
    const distance = distanceMeters(previous, next);
    const derivedSpeed = distance / Math.max(elapsedSeconds, 0.1);
    const reportedSpeed = Math.max(previous.speed ?? 0, next.speed ?? 0);
    const plausibleSpeed = Math.max(60, reportedSpeed * 3 + 15);
    if (distance > 250 && derivedSpeed > plausibleSpeed) {
      return { accepted: false, reason: 'implausible' };
    }
  }
  return { accepted: true };
}

export function ageSeconds(timestamp: string | null, serverNowMs: number): number | null {
  if (!timestamp) return null;
  const value = Date.parse(timestamp);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor((serverNowMs - value) / 1_000));
}

export function trackingFallbackInterval(
  snapshot: TrackingSnapshot | undefined,
  disconnected: boolean,
): false | number {
  if (snapshot?.terminal || !disconnected) return false;
  return TRACKING_FALLBACK_POLL_MS;
}

export function normalizeSeatStatuses(values: string[]): PassengerSeatPhase[] {
  return values.map(seatStatus);
}
