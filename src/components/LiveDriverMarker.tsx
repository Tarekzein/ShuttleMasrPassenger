import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';
import { AnimatedRegion, Marker, type MapMarker } from 'react-native-maps';
import type { TrackingLocationV2 } from '../types/passenger';
import { bearing, shortestHeadingTarget } from '../utils/markerAnimation';

interface LiveDriverMarkerProps {
  location: TrackingLocationV2;
  stale: boolean;
  accessibilityLabel: string;
}

function durationBetween(previous: TrackingLocationV2, next: TrackingLocationV2): number {
  const elapsed = Date.parse(next.serverTimestamp) - Date.parse(previous.serverTimestamp);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 1_000;
  return Math.min(5_000, Math.max(500, elapsed));
}

function targetHeading(previous: TrackingLocationV2, next: TrackingLocationV2): number {
  if (next.heading != null && Number.isFinite(next.heading)) return next.heading;
  return bearing(
    { latitude: previous.lat, longitude: previous.lng },
    { latitude: next.lat, longitude: next.lng },
  );
}

export function LiveDriverMarker({ location, stale, accessibilityLabel }: LiveDriverMarkerProps) {
  const markerRef = useRef<MapMarker | null>(null);
  const previousRef = useRef(location);
  const coordinate = useRef(
    new AnimatedRegion({
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;
  const headingValue = useRef(new Animated.Value(location.heading ?? 0)).current;
  const headingRef = useRef(location.heading ?? 0);
  const [nativeHeading, setNativeHeading] = useState(location.heading ?? 0);

  useEffect(() => {
    const previous = previousRef.current;
    const duration = durationBetween(previous, location);
    const point = { latitude: location.lat, longitude: location.lng };
    if (Platform.OS === 'android') {
      markerRef.current?.animateMarkerToCoordinate(point, duration);
    } else {
      coordinate.timing({ ...point, duration, useNativeDriver: false } as never).start();
    }

    const desired = targetHeading(previous, location);
    const unwrapped = shortestHeadingTarget(headingRef.current, desired);
    Animated.timing(headingValue, {
      toValue: unwrapped,
      duration: Math.min(duration, 1_200),
      useNativeDriver: true,
    }).start();
    headingRef.current = unwrapped;
    setNativeHeading(((unwrapped % 360) + 360) % 360);
    previousRef.current = location;
  }, [coordinate, headingValue, location]);

  const spin = headingValue.interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  return (
    <Marker.Animated
      ref={markerRef}
      coordinate={coordinate as never}
      anchor={{ x: 0.5, y: 0.5 }}
      opacity={stale ? 0.55 : 1}
      flat={Platform.OS === 'android'}
      rotation={Platform.OS === 'android' ? nativeHeading : 0}
      tracksViewChanges={Platform.OS !== 'android'}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[styles.marker, Platform.OS !== 'android' && { transform: [{ rotate: spin }] }]}>
        <Text style={styles.glyph} importantForAccessibility="no">🚐</Text>
      </Animated.View>
    </Marker.Animated>
  );
}

const styles = StyleSheet.create({
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 30,
  },
});
