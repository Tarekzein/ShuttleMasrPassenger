describe('native Maps configuration', () => {
  const originalNativeKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  afterEach(() => {
    if (originalNativeKey == null) delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
    else process.env.GOOGLE_MAPS_ANDROID_API_KEY = originalNativeKey;
    jest.resetModules();
  });

  it('injects only the build-time native key and never copies it to Expo extra', () => {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = 'native-test-value';
    jest.resetModules();
    const createConfig = require('../../app.config.js') as () => {
      android?: { config?: { googleMaps?: { apiKey?: string } } };
      extra?: Record<string, unknown>;
    };
    const config = createConfig();

    expect(config.android?.config?.googleMaps?.apiKey).toBe('native-test-value');
    expect(config.extra?.googleMapsApiKey).toBeUndefined();
    expect(JSON.stringify(config.extra ?? {})).not.toContain('native-test-value');
  });
});
