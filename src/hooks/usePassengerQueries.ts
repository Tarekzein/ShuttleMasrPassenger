import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from '../services/passengerService';

export const useBookings = () => useQuery({ queryKey: ['bookings'], queryFn: service.getBookings });
export const useBooking = (id: string) => useQuery({ queryKey: ['booking', id], queryFn: () => service.getBooking(id), enabled: Boolean(id) });
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: service.getNotifications, refetchInterval: 60_000 });
export const useWalletTransactions = () => useQuery({ queryKey: ['wallet-transactions'], queryFn: service.getWalletTransactions });
export function useBookingActions() {
  const client = useQueryClient();
  const refresh = async () => { await client.invalidateQueries({ queryKey: ['bookings'] }); };
  return {
    create: useMutation({ mutationFn: service.createBooking, onSuccess: refresh }),
    cancel: useMutation({ mutationFn: service.cancelBooking, onSuccess: refresh }),
    rate: useMutation({ mutationFn: ({ id, ...input }: { id: string; rating: number; comment?: string; tags?: string[] }) => service.rateBooking(id, input), onSuccess: refresh }),
  };
}
export function useNotificationActions() {
  const client = useQueryClient();
  const refresh = async () => { await client.invalidateQueries({ queryKey: ['notifications'] }); };
  return {
    markRead: useMutation({ mutationFn: service.markNotificationRead, onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: service.markAllNotificationsRead, onSuccess: refresh }),
  };
}
