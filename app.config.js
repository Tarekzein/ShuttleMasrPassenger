const appJson = require('./app.json');

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || appJson.expo.extra?.googleMapsApiKey || 'AIzaSyAus7O2WIdJQU9AKywa7LZDQRrHhgj3i9Y',
  },
});
