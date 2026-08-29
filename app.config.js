const appJson = require('./app.json');

// Build-time only: EAS injects this into the Android manifest. Do not copy it
// to `extra` or use an EXPO_PUBLIC variable, which would expose it to JS.
const ANDROID_GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

// iOS deliberately uses Apple Maps (react-native-maps default) so we don't pull
// the react-native-google-maps iOS pod (not shipped in RN Maps 1.27). Android
// uses Google Maps (requires the native key). Route geometry and ETA come from
// the authenticated backend tracking projection, never this credential.
module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    ...(ANDROID_GOOGLE_MAPS_API_KEY
      ? {
          config: {
            ...(appJson.expo.android?.config ?? {}),
            googleMaps: { apiKey: ANDROID_GOOGLE_MAPS_API_KEY },
          },
        }
      : {}),
  },
});
