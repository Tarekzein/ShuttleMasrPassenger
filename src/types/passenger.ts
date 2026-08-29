export type PaymentMethod = 'CASH' | 'WALLET';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDED';
export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TripJourneyPhase =
  | 'ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type PassengerJourneyPhase =
  | 'WAITING_ASSIGNMENT'
  | 'WAITING_FOR_DRIVER'
  | 'DRIVER_EN_ROUTE'
  | 'ARRIVED_AT_PICKUP'
  | 'PASSENGER_PICKED_UP'
  | 'IN_PROGRESS'
  | 'ARRIVED_AT_STOP'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type PassengerSeatPhase =
  | 'PENDING'
  | 'BOARDED'
  | 'IN_TRANSIT'
  | 'DROPPED_OFF'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface Coordinates { latitude: number; longitude: number }
export interface User {
  id: string; phone: string; name: string; email?: string | null; role: string;
  walletBalance: number | string; outstandingBalance: number | string;
}
export interface Stop { id: string; nameEn: string; nameAr?: string | null; lat: number; lng: number }
export interface LineStop { id: string; stopId: string; stopOrder: number; minutesFromStart: number; stop: Stop }
export interface Vehicle { id: string; plateNumber: string; capacity: number; type: string; model?: string | null; color?: string | null }
export interface Trip {
  id: string; departureTime: string; status: TripStatus; availableSeats: number; pricePerSeat: number | string;
  isBookable?: boolean; pickupStopId?: string; dropoffStopId?: string; pickupEtaMinutes?: number; dropoffEtaMinutes?: number;
  phase?: TripJourneyPhase; journeyPhase?: TripJourneyPhase; trackingOpen?: boolean; assignedAt?: string | null;
  vehicle?: Vehicle | null;
}
export interface SearchResult {
  line: { id: string; name: string; nameAr?: string | null; colorHex?: string | null; amenities: string[]; lineStops: LineStop[]; driver?: { user?: { name: string; phone: string }; vehicle?: Vehicle | null } | null };
  pickupLineStop: LineStop; dropoffLineStop: LineStop; pickupDistanceMeters: number; dropoffDistanceMeters: number; trips: Trip[];
}
export interface BookingSeat { id: string; seatNumber?: string | null; status: string; isBoarded: boolean }
export interface Payment { id: string; method: PaymentMethod | string; status: string; amount: number | string }
export interface NoShowChargeSummary { id: string; tripId: string; amount: number | string; reason: string; status: string }
export interface Booking {
  id: string; seats: number; totalFare: number | string; outstandingAmount?: number | string; status: BookingStatus; paymentMethod: PaymentMethod;
  createdAt: string; pickupStop: Stop; dropoffStop: Stop; bookingSeats: BookingSeat[]; payment?: Payment | null;
  review?: { id: string; rating: number; comment?: string | null; tags: string[] } | null;
  settledNoShowCharges?: NoShowChargeSummary[];
  trip: Trip & { line: SearchResult['line']; driver?: SearchResult['line']['driver']; vehicle?: Vehicle | null };
}
export interface WalletTransaction { id: string; type: 'CREDIT' | 'DEBIT'; amount: number | string; description?: string | null; createdAt: string }
export interface AppNotification { id: string; title: string; titleAr?: string | null; body: string; bodyAr?: string | null; type?: string | null; payload?: { bookingId?: string; tripId?: string; screen?: string } | null; isRead: boolean; createdAt: string }

export interface TrackingDriverLocation { lat: number; lng: number; heading?: number | null; speed?: number | null; at?: string | null }
export interface TrackingStop {
  stopId: string; stopOrder: number; status: 'PENDING' | 'ARRIVED' | 'WAITING' | 'COMPLETED' | 'SKIPPED';
  arrivedAt?: string | null; completedAt?: string | null;
  name?: string | null; nameAr?: string | null; lat?: number; lng?: number; isPickup: boolean; isDropoff: boolean;
}
export interface TripTracking {
  booking: { id: string; status: BookingStatus; seats: number; outstandingAmount: number | string };
  trip: { id: string; status: TripStatus; departureTime: string; startedAt?: string | null };
  trackingOpen: boolean;
  etaTarget: 'PICKUP' | 'DESTINATION';
  message?: string | null;
  driverLocation?: TrackingDriverLocation | null;
  driver?: { name: string; avatarUrl?: string | null; phone?: string | null } | null;
  vehicle?: Vehicle | null;
  pickupStop: Stop; dropoffStop: Stop;
  stops: TrackingStop[];
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  outstandingCharges: Array<{ tripRef: string; amount: number | string; reason: string; status: string }>;
}
export interface OutstandingCharge {
  id: string; tripRef: string; tripId: string; bookingId: string; missedTripDate?: string | null;
  lineName?: string | null; lineNameAr?: string | null; amount: number | string; reason: string; status: string;
  settledBookingId?: string | null; createdAt: string;
}
export interface OutstandingResponse { outstandingBalance: number | string; charges: OutstandingCharge[] }

// Versioned live-journey contract. V1 remains above because deployed backend and
// app builds continue to use it while `/api/v2` rolls out.
export type TrackingStateV2 = 'NOT_STARTED' | 'LIVE' | 'STALE' | 'ENDED';
export type TrackingStopPhaseV2 = 'PENDING' | 'ARRIVED' | 'COMPLETED' | 'SKIPPED';
export type TrackingRouteSourceV2 = 'DRIVER_NAVIGATION' | 'LINE_STOPS';

export interface TrackingLocationV2 {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  deviceTimestamp: string | null;
  serverTimestamp: string;
  sequence: number;
}

export interface TrackingStopV2 {
  stopId: string;
  stopOrder: number;
  phase: TrackingStopPhaseV2;
  arrivedAt: string | null;
  completedAt: string | null;
  name: string | null;
  nameAr: string | null;
  lat: number | null;
  lng: number | null;
  isPickup?: boolean;
  isDropoff?: boolean;
}

export interface TrackingDriverIdentity {
  id?: string;
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
}

export interface TrackingVehicleIdentity {
  id?: string;
  plateNumber?: string | null;
  capacity?: number | null;
  type?: string | null;
  model?: string | null;
  color?: string | null;
}

export interface TrackingRouteV2 {
  routeSource: TrackingRouteSourceV2;
  coordinates: Coordinates[];
  encodedPolyline: string | null;
  routeRevision: number;
  calculatedAt: string | null;
  remainingDistanceMeters: number | null;
  remainingDurationSeconds: number | null;
  targetStopId: string | null;
  stale: boolean;
  stalenessSeconds: number | null;
  // Accepted during the short v2 rollout window; normalized into the fields
  // above and never treated as a second route source.
  source?: TrackingRouteSourceV2;
  etaToPickupSeconds?: number | null;
  etaToDropoffSeconds?: number | null;
}

export interface TripTrackingV2 {
  apiVersion: 2;
  schemaVersion?: 2;
  serverTimestamp: string;
  revision: number;
  terminal: boolean;
  tracking: {
    open: boolean;
    state: TrackingStateV2;
    lastSeenAt: string | null;
  };
  trip: {
    id: string;
    legacyStatus: TripStatus;
    phase: TripJourneyPhase;
    departureTime: string;
    startedAt: string | null;
    completedAt: string | null;
  };
  passenger: {
    bookingId: string;
    bookingStatus: BookingStatus;
    phase: PassengerJourneyPhase;
    seats: Array<{ id: string; status: PassengerSeatPhase }>;
    outstandingAmount?: number | string;
  };
  // The backend keeps fare fields on the booking projection. The optional
  // passenger-level amount above is retained for early v2 builds.
  booking?: {
    id: string;
    status: BookingStatus;
    seats: number;
    outstandingAmount: number | string;
  };
  currentStop: TrackingStopV2 | null;
  stops: TrackingStopV2[];
  driver: TrackingDriverIdentity | null;
  vehicle: TrackingVehicleIdentity | null;
  location: TrackingLocationV2 | null;
  route: TrackingRouteV2;
  pickupStop?: Stop;
  dropoffStop?: Stop;
  outstandingCharges?: TripTracking['outstandingCharges'];
}

export interface JourneyEventV2 {
  tripId: string;
  revision: number;
  schemaVersion: 2;
  serverTimestamp: string;
  warnings?: unknown[];
  requiresRefetch?: boolean;
  event: {
    id: string;
    action: string;
    idempotencyKey: string;
    clientInstanceId?: string;
    clientSequence: number;
    expectedRevision?: number;
    occurredAt: string;
    receivedAt: string;
  };
  // The realtime gateway may carry the generic journey snapshot rather than
  // the passenger-scoped tracking projection. Consumers must runtime-check it
  // and refetch the tracking REST projection when it is generic.
  snapshot: unknown;
}

export interface TrackingSnapshot {
  apiVersion: 1 | 2;
  serverTimestamp: string | null;
  revision: number;
  terminal: boolean;
  tracking: { open: boolean; state: TrackingStateV2; lastSeenAt: string | null };
  trip: {
    id: string;
    legacyStatus: TripStatus;
    phase: TripJourneyPhase;
    departureTime: string;
    startedAt: string | null;
    completedAt: string | null;
  };
  passenger: {
    bookingId: string;
    bookingStatus: BookingStatus;
    phase: PassengerJourneyPhase;
    seats: Array<{ id: string; status: PassengerSeatPhase }>;
    seatsCount: number;
    outstandingAmount: number | string;
  };
  message: string | null;
  currentStop: TrackingStopV2 | null;
  stops: TrackingStopV2[];
  driver: TrackingDriverIdentity | null;
  vehicle: TrackingVehicleIdentity | null;
  location: TrackingLocationV2 | null;
  route: TrackingRouteV2;
  outstandingCharges: TripTracking['outstandingCharges'];
  legacy?: TripTracking;
}
