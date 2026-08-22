export type PaymentMethod = 'CASH' | 'WALLET';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REFUNDED';
export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

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
