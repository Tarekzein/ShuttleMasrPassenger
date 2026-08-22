const appJson = require('./app.json');

const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  appJson.expo.extra?.googleMapsApiKey ||
  'AIzaSyAus7O2WIdJQU9AKywa7LZDQRrHhgj3i9Y';

// iOS deliberately uses Apple Maps (react-native-maps default) so we don't pull
// the react-native-google-maps iOS pod (not shipped in RN Maps 1.27). Android
// uses Google Maps (requires the native key). The Directions API + route/ETA use
// the runtime key from `extra` and are provider-agnostic.
module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    config: {
      ...(appJson.expo.android?.config ?? {}),
      googleMaps: { apiKey: GOOGLE_MAPS_API_KEY },
    },
  },
  extra: {
    ...appJson.expo.extra,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  },
});
