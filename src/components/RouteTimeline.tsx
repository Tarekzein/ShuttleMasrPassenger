import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZE, SPACING } from '../theme';
import type { LineStop } from '../types/passenger';

interface RouteTimelineProps {
  stops: LineStop[];
  departureTime?: string;
}

export function RouteTimeline({ stops, departureTime }: RouteTimelineProps) {
  const base = departureTime ? new Date(departureTime).getTime() : Date.now();

  return (
    <View style={styles.container}>
      {stops.map((lineStop, index) => {
        const eta = new Date(base + lineStop.minutesFromStart * 60000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        return (
          <View key={lineStop.id ?? `${lineStop.stop.id}-${index}`} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.marker, index === 0 && styles.firstMarker]} />
              {index < stops.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.content}>
              <Text style={styles.stopName}>{lineStop.stop.nameEn}</Text>
              <Text style={styles.eta}>{index === 0 ? 'Departure' : 'ETA'} {eta}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    minHeight: 58,
  },
  markerColumn: {
    width: 24,
    alignItems: 'center',
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.card,
    marginTop: 4,
  },
  firstMarker: {
    backgroundColor: COLORS.primary,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  content: {
    flex: 1,
    paddingLeft: SPACING.md,
  },
  stopName: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '800',
  },
  eta: {
    marginTop: 2,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
});
