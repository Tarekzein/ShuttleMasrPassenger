import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api, { clearStoredSession, setUnauthorizedHandler } from '../config/api';
import type { User } from '../types/passenger';

interface AuthState {
  user: User | null; isAuthenticated: boolean; isLoading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  loadStoredAuth: () => Promise<void>; refreshProfile: () => Promise<void>;
  updateUser: (user: User) => void; logout: () => Promise<void>; clearSession: () => Promise<void>;
}

async function loadPassenger() {
  const { data } = await api.get<User>('/users/me');
  if (data.role !== 'PASSENGER') throw new Error('NOT_PASSENGER');
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, isAuthenticated: false, isLoading: true,
  sendOtp: async (phone) => { await api.post('/auth/otp/send', { phone }); },
  verifyOtp: async (phone, code) => {
    const { data } = await api.post('/auth/otp/verify', { phone, code });
    if (data.user.role !== 'PASSENGER') throw new Error('NOT_PASSENGER');
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    await SecureStore.setItemAsync('userId', data.user.id);
    const user = await loadPassenger();
    set({ user, isAuthenticated: true, isLoading: false });
  },
  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) return set({ isLoading: false });
      const user = await loadPassenger();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch { await get().clearSession(); }
  },
  refreshProfile: async () => set({ user: await loadPassenger() }),
  updateUser: (user) => set({ user }),
  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    await get().clearSession();
  },
  clearSession: async () => {
    await clearStoredSession();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));

setUnauthorizedHandler(() => { void useAuthStore.getState().clearSession(); });
