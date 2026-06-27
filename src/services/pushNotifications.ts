import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { registerPushToken, unregisterPushToken } from './passengerService';

const TOKEN_KEY = 'expoPushToken';
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });

export async function enablePushNotifications() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.HIGH });
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerPushToken(token, Platform.OS);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return token;
}

export async function disablePushNotifications() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) { try { await unregisterPushToken(token); } catch {} }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
