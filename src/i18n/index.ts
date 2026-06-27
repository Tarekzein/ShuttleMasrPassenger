import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DevSettings, I18nManager } from 'react-native';
import { en } from './en';
import { ar } from './ar';

const LANG_KEY = 'shuttlemasr_passenger_lang';
export const initI18n = async () => {
  const stored = await AsyncStorage.getItem(LANG_KEY);
  const language = stored ?? (getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en');
  await i18n.use(initReactI18next).init({ resources: { en: { translation: en }, ar: { translation: ar } }, lng: language, fallbackLng: 'en', interpolation: { escapeValue: false } });
  const rtl = language === 'ar';
  I18nManager.allowRTL(rtl); I18nManager.forceRTL(rtl);
};
export const changeLanguage = async (language: 'en' | 'ar') => {
  await AsyncStorage.setItem(LANG_KEY, language); await i18n.changeLanguage(language);
  I18nManager.allowRTL(language === 'ar'); I18nManager.forceRTL(language === 'ar');
  setTimeout(() => DevSettings.reload(), 100);
};
export default i18n;
