import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * In dev, Expo's debugger host gives us the LAN IP (e.g. "192.168.1.3:8081").
 * We strip the Metro port and use the backend port (3000) instead.
 * `localhost` won't work because on a physical device it refers to the phone itself.
 */
function getBaseUrl(): string {
  if (!__DEV__) {
    return 'https://api.shuttlemisr.com/api/v1';
  }

  const debuggerHost = Constants.expoConfig?.hostUri
    ?? Constants.experienceUrl?.match(/\/\/([\d.]+):/)?.[1];

  if (debuggerHost) {
    // hostUri looks like "192.168.1.3:8081" — strip the Metro port
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000/api/v1`;
  }

  // Fallback: Android emulator localhost alias
  return 'http://10.0.2.2:3000/api/v1';
}

export const API_BASE_URL = getBaseUrl();
let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
  await SecureStore.deleteItemAsync('userId');
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → try refreshing token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const userId = await SecureStore.getItemAsync('userId');

        if (refreshToken && userId) {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            userId,
            refreshToken,
          });

          await SecureStore.setItemAsync('accessToken', data.accessToken);
          await SecureStore.setItemAsync('refreshToken', data.refreshToken);

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await clearStoredSession();
        unauthorizedHandler?.();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
