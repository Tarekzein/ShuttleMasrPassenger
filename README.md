# ShuttleMasrPassenger

Passenger mobile application for ShuttleMasr, built with Expo Router and React Native.

## Setup

```bash
npm install
npm run android
```

Use `npm run ios` on macOS for the iOS simulator. Development builds discover the backend from Expo's LAN host and connect to port `3000`; production builds use the API URL configured in `src/config/api.ts`.

Push notifications require an EAS project ID. Run `eas init` for this passenger app before creating development or production builds; do not reuse the Driver application's project ID.

## Passenger tracking v2

Tracking loads `GET /api/v2/bookings/:bookingId/tracking` through the authenticated API client. It falls back to the deployed v1 route only when v2 is demonstrably unavailable (`405`, `501`, or Nest's route-level `Cannot GET ...` response); booking/auth/not-found errors are preserved. A generic journey snapshot from a socket ACK or `journey:event` is never applied to passenger state—the booking-scoped REST projection is required.

The versioned socket events are `journey:location`, `journey:navigation`, and `journey:event`. During migration, the client accepts the additive flat `driver:location` and `navigation:progress` events after a short preference window, plus the existing `trip:state`, `stop:update`, and `seat:updated` invalidation events. It re-syncs REST on entry, reconnect, resume, push, malformed payload, sequence/revision gap, and access revocation. Fifteen-second polling runs only while realtime is disconnected.

Precise driver location and navigation progress are rendered only while the server projection is open and the journey is `DRIVER_EN_ROUTE` or `IN_PROGRESS`. Terminal state, booking cancellation, or `trip:access-revoked` immediately clears the marker, redacts route progress, tears down the map/socket, and stops polling.

The Android native Maps SDK key is build-only: configure `GOOGLE_MAPS_ANDROID_API_KEY` in EAS and restrict it by Android package/signing certificate. It is not copied to Expo `extra` or exposed to JavaScript. Places autocomplete is an existing JS limitation and uses a separate `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`; restrict that public key to the Places APIs and the supported app/web origins. The passenger app never calls Directions/Routes for ETA: v2 displays driver-navigation progress supplied by the backend, and v1 honestly shows ETA unavailable.

Passenger location permission remains foreground-only and is used for pickup search, not live-trip tracking.

## Checks

```bash
npm run typecheck
npm test -- --runInBand
npm run test:ui -- --runInBand
npx expo install --check
```
