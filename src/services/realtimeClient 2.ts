import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';

/**
 * Authenticated, receive-only connection to the `/realtime` Socket.IO namespace.
 * The passenger subscribes to their trip to receive live driver-location and
 * trip-state updates. Authorization (active booking only) is enforced server
 * side; the passenger app never sends location or control events.
 */

function socketOrigin(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

let socket: Socket | null = null;

export interface DriverLocationEvent {
  tripId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  serverTimestamp?: string;
}

export interface PassengerRealtimeHandlers {
  onDriverLocation?: (loc: DriverLocationEvent) => void;
  onTripState?: (state: { tripId: string; status: string; ended?: boolean }) => void;
  onStopUpdate?: (stop: any) => void;
}

export async function connectTripTracking(
  tripId: string,
  handlers: PassengerRealtimeHandlers,
): Promise<Socket | null> {
  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) return null;

  disconnectTracking();
  socket = io(`${socketOrigin()}/realtime`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
  });

  socket.on('connect', () => {
    socket?.emit('subscribe:trip', { tripId });
  });
  if (handlers.onDriverLocation) socket.on('driver:location', handlers.onDriverLocation);
  if (handlers.onTripState) socket.on('trip:state', handlers.onTripState);
  if (handlers.onStopUpdate) socket.on('stop:update', handlers.onStopUpdate);

  return socket;
}

export function disconnectTracking(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
