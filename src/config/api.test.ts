const mockGetItemAsync = jest.fn(async (key: string) => (key === 'accessToken' ? 'test-access-token' : null));

jest.mock('expo-secure-store', () => ({
  getItemAsync: mockGetItemAsync,
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import api, { API_V2_BASE_URL } from './api';

describe('API v2 authentication', () => {
  it('runs the shared bearer-token interceptor for an absolute v2 URL', async () => {
    const originalAdapter = api.defaults.adapter;
    let authorization: unknown;
    let requestedUrl: string | undefined;
    api.defaults.adapter = async (config) => {
      authorization = config.headers?.Authorization;
      requestedUrl = config.url;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    try {
      await api.get(`${API_V2_BASE_URL}/bookings/booking-1/tracking`);
    } finally {
      api.defaults.adapter = originalAdapter;
    }

    expect(requestedUrl).toBe(`${API_V2_BASE_URL}/bookings/booking-1/tracking`);
    expect(authorization).toBe('Bearer test-access-token');
  });
});
