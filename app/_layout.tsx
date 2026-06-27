import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { initI18n } from '../src/i18n';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/theme';
import { enablePushNotifications } from '../src/services/pushNotifications';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 120_000, retry: 2 } } });
export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments(); const router = useRouter();
  useEffect(() => { void (async () => { await initI18n(); await loadStoredAuth(); setReady(true); })(); }, []);
  useEffect(() => {
    if (!ready || isLoading) return;
    const login = segments[0] === 'login';
    if (!isAuthenticated && !login) router.replace('/login');
    if (isAuthenticated && login) router.replace('/(tabs)/home');
  }, [isAuthenticated, isLoading, ready, segments]);
  useEffect(() => { if (isAuthenticated) void enablePushNotifications(); }, [isAuthenticated]);
  useEffect(() => Notifications.addNotificationResponseReceivedListener((response) => {
    const id = response.notification.request.content.data?.bookingId;
    if (typeof id === 'string') router.push(`/booking/${id}`);
  }).remove, []);
  if (!ready || isLoading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  return <QueryClientProvider client={queryClient}><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="login" /><Stack.Screen name="(tabs)" /><Stack.Screen name="trip/[id]" /><Stack.Screen name="booking/[id]" /></Stack></QueryClientProvider>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background } });
