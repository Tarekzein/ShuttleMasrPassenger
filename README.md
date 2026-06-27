# ShuttleMasrPassenger

Passenger mobile application for ShuttleMasr, built with Expo Router and React Native.

## Setup

```bash
npm install
npm run android
```

Use `npm run ios` on macOS for the iOS simulator. Development builds discover the backend from Expo's LAN host and connect to port `3000`; production builds use the API URL configured in `src/config/api.ts`.

Push notifications require an EAS project ID. Run `eas init` for this passenger app before creating development or production builds; do not reuse the Driver application's project ID.

## Checks

```bash
npm run typecheck
npx expo config --type public
```
