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
export interface Booking {
  id: string; seats: number; totalFare: number | string; status: BookingStatus; paymentMethod: PaymentMethod;
  createdAt: string; pickupStop: Stop; dropoffStop: Stop; bookingSeats: BookingSeat[]; payment?: Payment | null;
  review?: { id: string; rating: number; comment?: string | null; tags: string[] } | null;
  trip: Trip & { line: SearchResult['line']; driver?: SearchResult['line']['driver']; vehicle?: Vehicle | null };
}
export interface WalletTransaction { id: string; type: 'CREDIT' | 'DEBIT'; amount: number | string; description?: string | null; createdAt: string }
export interface AppNotification { id: string; title: string; titleAr?: string | null; body: string; bodyAr?: string | null; type?: string | null; payload?: { bookingId?: string } | null; isRead: boolean; createdAt: string }
