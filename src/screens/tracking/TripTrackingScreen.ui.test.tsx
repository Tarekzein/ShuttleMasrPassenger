import React from 'react';
import { act, render } from '@testing-library/react-native';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Map = (props: any) => React.createElement(View, { ...props, testID: 'map-view' }, props.children);
  const Child = (props: any) => React.createElement(View, props, props.children);
  Child.Animated = Child;
  return { __esModule: true, default: Map, Marker: Child, Polyline: Child, PROVIDER_GOOGLE: 'google' };
});
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ bookingId: 'b1' }),
  Stack: { Screen: () => null },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'tracking.connection.ended'
        ? 'Live tracking ended'
        : key === 'tracking.routeAwaitingDriver'
          ? 'Live route and ETA will appear when the driver starts navigation.'
          : typeof values?.value === 'string'
            ? `${key} ${values.value}`
            : key,
    i18n: { language: 'en' },
  }),
}));
const mockInvalidateQueries = jest.fn();
const mockSetQueryData = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries, setQueryData: mockSetQueryData }),
}));
let mockRealtimeHandlers: any;
jest.mock('../../services/realtimeClient', () => ({
  connectTripTracking: jest.fn((_tripId: string, handlers: any) => {
    mockRealtimeHandlers = handlers;
    return Promise.resolve(null);
  }),
}));
jest.mock('../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../components/LiveDriverMarker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LiveDriverMarker: () => React.createElement(View, { testID: 'driver-marker' }) };
});

const mockUseTracking = jest.fn();
jest.mock('../../hooks/usePassengerQueries', () => ({
  useTripTracking: () => mockUseTracking(),
}));

import TripTrackingScreen from './TripTrackingScreen';

const baseData = {
  apiVersion: 2,
  serverTimestamp: '2026-08-22T18:00:00.000Z',
  revision: 3,
  terminal: true,
  tracking: { open: false, state: 'ENDED', lastSeenAt: null },
  trip: {
    id: 't1',
    legacyStatus: 'COMPLETED',
    phase: 'COMPLETED',
    departureTime: '2026-08-22T17:00:00.000Z',
    startedAt: '2026-08-22T17:00:00.000Z',
    completedAt: '2026-08-22T18:00:00.000Z',
  },
  passenger: {
    bookingId: 'b1',
    bookingStatus: 'COMPLETED',
    phase: 'COMPLETED',
    seats: [],
    seatsCount: 1,
    outstandingAmount: 0,
  },
  message: 'This trip has ended. Live tracking is no longer available.',
  currentStop: null,
  stops: [],
  driver: null,
  vehicle: null,
  location: null,
  route: {
    routeSource: 'LINE_STOPS',
    coordinates: [],
    encodedPolyline: null,
    routeRevision: 0,
    calculatedAt: null,
    remainingDistanceMeters: null,
    remainingDurationSeconds: null,
    targetStopId: null,
    stale: false,
    stalenessSeconds: null,
  },
  outstandingCharges: [],
};

describe('TripTrackingScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tears down the map and location marker once the trip is terminal', () => {
    mockUseTracking.mockReturnValue({ data: baseData, isLoading: false, isError: false, refetch: jest.fn() });
    const { getByText, queryByTestId } = render(<TripTrackingScreen />);
    expect(getByText(/no longer available/i)).toBeTruthy();
    expect(queryByTestId('map-view')).toBeNull();
    expect(queryByTestId('driver-marker')).toBeNull();
  });

  it('shows the tracking surface from assignment without exposing precise location', () => {
    mockUseTracking.mockReturnValue({
      data: {
        ...baseData,
        terminal: false,
        tracking: { open: true, state: 'NOT_STARTED', lastSeenAt: null },
        trip: { ...baseData.trip, legacyStatus: 'SCHEDULED', phase: 'ASSIGNED', completedAt: null },
        passenger: { ...baseData.passenger, bookingStatus: 'CONFIRMED', phase: 'WAITING_FOR_DRIVER' },
        message: null,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    const { getByTestId, getByText, queryByTestId } = render(<TripTrackingScreen />);
    expect(getByTestId('map-view')).toBeTruthy();
    expect(queryByTestId('driver-marker')).toBeNull();
    expect(getByText(/route and ETA will appear/i)).toBeTruthy();
  });

  it('refetches instead of applying a generic journey snapshot', () => {
    mockUseTracking.mockReturnValue({
      data: {
        ...baseData,
        terminal: false,
        tracking: { open: true, state: 'NOT_STARTED', lastSeenAt: null },
        trip: { ...baseData.trip, legacyStatus: 'SCHEDULED', phase: 'ASSIGNED', completedAt: null },
        passenger: { ...baseData.passenger, bookingStatus: 'CONFIRMED', phase: 'WAITING_FOR_DRIVER' },
        message: null,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<TripTrackingScreen />);
    mockRealtimeHandlers.onJourneyEvent({
      tripId: 't1',
      revision: 4,
      schemaVersion: 2,
      serverTimestamp: '2026-08-22T18:00:01.000Z',
      event: {
        id: 'event-1',
        action: 'START_EN_ROUTE',
        idempotencyKey: 'key-1',
        clientSequence: 1,
        occurredAt: '2026-08-22T18:00:00.000Z',
        receivedAt: '2026-08-22T18:00:01.000Z',
      },
      snapshot: { apiVersion: 2, revision: 4, trip: { id: 't1' } },
    });
    expect(mockSetQueryData).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['tracking', 'b1'] });
  });

  it('never applies a generic subscribe ACK as passenger tracking data', () => {
    mockUseTracking.mockReturnValue({
      data: {
        ...baseData,
        terminal: false,
        tracking: { open: true, state: 'NOT_STARTED', lastSeenAt: null },
        trip: { ...baseData.trip, legacyStatus: 'SCHEDULED', phase: 'ASSIGNED', completedAt: null },
        passenger: { ...baseData.passenger, bookingStatus: 'CONFIRMED', phase: 'WAITING_FOR_DRIVER' },
        message: null,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<TripTrackingScreen />);
    act(() => {
      mockRealtimeHandlers.onSnapshot({
        apiVersion: 2,
        schemaVersion: 2,
        revision: 4,
        trip: { id: 't1', phase: 'ASSIGNED' },
        seats: [{ passengerName: 'Must not reach the passenger cache' }],
      });
    });
    expect(mockSetQueryData).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['tracking', 'b1'] });
  });

  it('applies fresh driver navigation progress from the socket', () => {
    mockUseTracking.mockReturnValue({
      data: {
        ...baseData,
        terminal: false,
        tracking: { open: true, state: 'LIVE', lastSeenAt: '2026-08-22T18:00:00.000Z' },
        trip: { ...baseData.trip, legacyStatus: 'IN_PROGRESS', phase: 'DRIVER_EN_ROUTE', completedAt: null },
        passenger: { ...baseData.passenger, bookingStatus: 'CONFIRMED', phase: 'DRIVER_EN_ROUTE' },
        message: null,
        route: { ...baseData.route, routeSource: 'DRIVER_NAVIGATION', routeRevision: 1 },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<TripTrackingScreen />);
    act(() => {
      mockRealtimeHandlers.onNavigationProgress({
        tripId: 't1',
        serverTimestamp: '2026-08-22T18:00:02.000Z',
        navigation: {
          remainingDistanceMeters: 900,
          remainingDurationSeconds: 240,
          calculatedAt: '2026-08-22T18:00:02.000Z',
          targetStopId: 'pickup',
          routeRevision: 2,
          encodedPolyline: null,
          coordinates: [
            { latitude: 30, longitude: 31 },
            { latitude: 30.1, longitude: 31.1 },
          ],
          updatedAt: '2026-08-22T18:00:02.000Z',
        },
      });
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['tracking', 'b1'],
      expect.objectContaining({
        route: expect.objectContaining({
          routeSource: 'DRIVER_NAVIGATION',
          routeRevision: 2,
          remainingDurationSeconds: 240,
        }),
      }),
    );
  });

  it('refetches only when the tracked booking is cancelled', () => {
    mockUseTracking.mockReturnValue({
      data: {
        ...baseData,
        terminal: false,
        tracking: { open: true, state: 'LIVE', lastSeenAt: '2026-08-22T18:00:00.000Z' },
        trip: { ...baseData.trip, legacyStatus: 'IN_PROGRESS', phase: 'DRIVER_EN_ROUTE', completedAt: null },
        passenger: { ...baseData.passenger, bookingStatus: 'CONFIRMED', phase: 'DRIVER_EN_ROUTE' },
        message: null,
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    render(<TripTrackingScreen />);
    act(() => {
      mockRealtimeHandlers.onBookingCancelled({ bookingId: 'someone-else' });
    });
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    act(() => {
      mockRealtimeHandlers.onBookingCancelled({ bookingId: 'b1' });
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ['tracking', 'b1'],
      expect.objectContaining({ terminal: true, location: null }),
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['tracking', 'b1'] });
  });
});
