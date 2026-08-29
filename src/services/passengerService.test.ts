const mockGet = jest.fn();

jest.mock('../config/api', () => ({
  __esModule: true,
  API_V2_BASE_URL: 'https://api.example.test/api/v2',
  default: { get: mockGet },
}));

import { getTripTracking } from './passengerService';

const v2Payload = {
  apiVersion: 2,
  serverTimestamp: '2026-08-22T18:00:00.000Z',
  revision: 1,
  terminal: false,
  tracking: { open: true, state: 'NOT_STARTED', lastSeenAt: null },
  trip: {
    id: 'trip-1',
    legacyStatus: 'SCHEDULED',
    phase: 'ASSIGNED',
    departureTime: '2026-08-22T19:00:00.000Z',
    startedAt: null,
    completedAt: null,
  },
  passenger: { bookingId: 'booking-1', bookingStatus: 'CONFIRMED', phase: 'WAITING_FOR_DRIVER', seats: [] },
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
};

function axiosError(status: number, message: string) {
  return { isAxiosError: true, response: { status, data: { message } } };
}

describe('getTripTracking version negotiation', () => {
  beforeEach(() => mockGet.mockReset());

  it('requests the absolute v2 passenger projection first', async () => {
    mockGet.mockResolvedValueOnce({ data: v2Payload });
    const result = await getTripTracking('booking-1');
    expect(mockGet).toHaveBeenCalledWith('https://api.example.test/api/v2/bookings/booking-1/tracking');
    expect(result.apiVersion).toBe(2);
  });

  it('falls back only when Nest reports the v2 route itself is unavailable', async () => {
    mockGet
      .mockRejectedValueOnce(axiosError(404, 'Cannot GET /api/v2/bookings/booking-1/tracking'))
      .mockResolvedValueOnce({
        data: {
          booking: { id: 'booking-1', status: 'CONFIRMED', seats: 1, outstandingAmount: 0 },
          trip: { id: 'trip-1', status: 'SCHEDULED', departureTime: '2026-08-22T19:00:00.000Z' },
          trackingOpen: false,
          etaTarget: 'PICKUP',
          driverLocation: null,
          driver: null,
          vehicle: null,
          pickupStop: { id: 'a', nameEn: 'A', lat: 30, lng: 31 },
          dropoffStop: { id: 'b', nameEn: 'B', lat: 30.1, lng: 31.1 },
          stops: [],
          routeCoordinates: [],
          outstandingCharges: [],
        },
      });
    const result = await getTripTracking('booking-1');
    expect(mockGet).toHaveBeenNthCalledWith(2, '/bookings/booking-1/tracking');
    expect(result.apiVersion).toBe(1);
  });

  it('preserves a real domain 404 instead of masking it with v1', async () => {
    const error = axiosError(404, 'Booking not found');
    mockGet.mockRejectedValueOnce(error);
    await expect(getTripTracking('missing')).rejects.toBe(error);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('rejects a passenger projection for another booking', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        ...v2Payload,
        passenger: { ...v2Payload.passenger, bookingId: 'booking-2' },
      },
    });
    await expect(getTripTracking('booking-1')).rejects.toThrow(/does not match/i);
  });

  it('rejects a malformed v2 projection instead of treating it as v1', async () => {
    mockGet.mockResolvedValueOnce({ data: { apiVersion: 2, revision: 1, trip: { id: 'trip-1' } } });
    await expect(getTripTracking('booking-1')).rejects.toThrow(/unsupported passenger tracking/i);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
