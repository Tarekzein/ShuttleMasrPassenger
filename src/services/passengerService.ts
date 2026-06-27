import api from '../config/api';
import type { AppNotification, Booking, Coordinates, PaymentMethod, SearchResult, User, WalletTransaction } from '../types/passenger';

export const getProfile = async () => (await api.get<User>('/users/me')).data;
export const updateProfile = async (body: { name?: string; email?: string }) => (await api.patch<User>('/users/me', body)).data;
export const searchTrips = async (origin: Coordinates, destination: Coordinates, date: string) => (await api.post<SearchResult[]>('/lines/search/trips', {
  originLat: origin.latitude, originLng: origin.longitude, destLat: destination.latitude, destLng: destination.longitude, date, daysAhead: 1,
})).data;
export const createBooking = async (input: { tripId: string; pickupStopId: string; dropoffStopId: string; seats: number; promoCode?: string; paymentMethod: PaymentMethod }) => (await api.post<Booking>('/bookings', input)).data;
export const getBookings = async () => (await api.get<Booking[]>('/bookings')).data;
export const getBooking = async (id: string) => (await api.get<Booking>(`/bookings/${id}`)).data;
export const cancelBooking = async (id: string) => (await api.patch<Booking>(`/bookings/${id}/cancel`)).data;
export const rateBooking = async (id: string, input: { rating: number; comment?: string; tags?: string[] }) => (await api.post(`/bookings/${id}/rate`, input)).data;
export const getNotifications = async () => (await api.get<AppNotification[]>('/notifications')).data;
export const markNotificationRead = async (id: string) => (await api.patch(`/notifications/${id}/read`)).data;
export const markAllNotificationsRead = async () => (await api.patch('/notifications/mark-all-read')).data;
export const getWalletTransactions = async () => (await api.get<WalletTransaction[]>('/payments/wallet/transactions')).data;
export const registerPushToken = async (token: string, platform: 'android' | 'ios') => (await api.post('/notifications/push-tokens', { token, platform })).data;
export const unregisterPushToken = async (token: string) => (await api.delete(`/notifications/push-tokens/${encodeURIComponent(token)}`)).data;
