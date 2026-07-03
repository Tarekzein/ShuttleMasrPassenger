import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../src/hooks/usePassengerQueries';

export default function TabLayout() {
  const { t } = useTranslation(); const query = useNotifications();
  const unread = query.data?.filter((item) => !item.isRead).length ?? 0;
  const tabs = [
    ['home', t('tabs.home'), { sf: 'map', md: 'map' }],
    ['bookings', t('tabs.bookings'), { sf: 'ticket', md: 'confirmation_number' }],
    ['notifications', t('tabs.notifications'), { sf: 'bell', md: 'notifications' }],
    ['profile', t('tabs.profile'), { sf: 'person', md: 'person' }],
  ] as const;
  return <NativeTabs tintColor="#F5C000" iconColor={{ default: '#9CA3AF', selected: '#F5C000' }} labelStyle={{ default: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' }, selected: { color: '#F5C000', fontSize: 11, fontWeight: '600' } }} blurEffect="systemMaterial">
    {tabs.map(([name, label, icon]) => <NativeTabs.Trigger key={name} name={name}><NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={icon.sf} md={icon.md} />{name === 'notifications' && unread > 0 ? <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge> : null}</NativeTabs.Trigger>)}
  </NativeTabs>;
}
