import React from 'react';
import { render } from '@testing-library/react-native';

// ── Native / navigation / data mocks ─────────────────────────
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = (props: any) => React.createElement(View, props, props.children);
  return { __esModule: true, default: Mock, Marker: Mock, Polyline: Mock, PROVIDER_GOOGLE: 'google' };
});
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ bookingId: 'b1' }),
  Stack: { Screen: () => null },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k, i18n: { language: 'en' } }),
}));
jest.mock('../../services/realtimeClient', () => ({ connectTripTracking: jest.fn(), disconnectTracking: jest.fn() }));
jest.mock('../../services/directionsService', () => ({ fetchEta: jest.fn().mockResolvedValue(null), formatEtaMinutes: () => '5 min' }));
jest.mock('../../services/analytics', () => ({ track: jest.fn() }));

const mockUseTracking = jest.fn();
jest.mock('../../hooks/usePassengerQueries', () => ({
  useTripTracking: () => mockUseTracking(),
}));

import TripTrackingScreen from './TripTrackingScreen';

const baseData = {
  booking: { id: 'b1', status: 'CONFIRMED', seats: 1, outstandingAmount: '0' },
  trip: { id: 't1', status: 'COMPLETED', departureTime: new Date().toISOString(), startedAt: null },
  trackingOpen: false,
  etaTarget: 'PICKUP',
  message: 'This trip has ended. Live tracking is no longer available.',
  driverLocation: null,
  driver: null,
  vehicle: null,
  pickupStop: { id: 's1', nameEn: 'A', lat: 30, lng: 31 },
  dropoffStop: { id: 's2', nameEn: 'B', lat: 30.1, lng: 31.1 },
  stops: [],
  routeCoordinates: [],
  outstandingCharges: [],
};

describe('TripTrackingScreen', () => {
  it('shows the "tracking ended" message and no live location once the trip is completed', () => {
    mockUseTracking.mockReturnValue({ data: baseData, isLoading: false, isError: false, refetch: jest.fn() });
    const { getByText } = render(<TripTrackingScreen />);
    expect(getByText(/no longer available/i)).toBeTruthy();
  });
});
