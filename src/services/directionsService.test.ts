import { fetchEta } from './directionsService';

describe('legacy passenger ETA', () => {
  it('stays unavailable without making a client-side Directions request', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(
      fetchEta(
        { latitude: 30, longitude: 31 },
        { latitude: 30.1, longitude: 31.1 },
      ),
    ).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
