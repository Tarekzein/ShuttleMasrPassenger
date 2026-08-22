import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  GooglePlacesAutocomplete,
  GooglePlacesAutocompleteRef,
} from 'react-native-google-places-autocomplete';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { ActiveTripBanner } from '../../components/ActiveTripBanner';
import { COLORS, FONT_SIZE, RADIUS, SHADOWS, SPACING } from '../../theme';
import { searchTrips } from '../../services/passengerService';
import { useBookings } from '../../hooks/usePassengerQueries';
import type { Coordinates, SearchResult, Trip } from '../../types/passenger';
import { isBookingTrackingEligible } from '../../utils/trackingContract';

type PointKind = 'origin' | 'destination';

const CAIRO = { latitude: 30.0444, longitude: 31.2357 };
const DESTINATION = { latitude: 30.0131, longitude: 31.2089 };
const POINTS_KEY = 'passenger_search_points';
const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

const compactTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const compactDate = (value: string) =>
  new Date(`${value}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' });

const isTripBookable = (trip: Trip) =>
  Boolean(trip.isBookable) &&
  trip.status === 'SCHEDULED' &&
  trip.availableSeats > 0 &&
  new Date(trip.departureTime).getTime() > Date.now() + 10 * 60_000;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const map = useRef<MapView>(null);
  const bookingsQuery = useBookings();
  const originSearch = useRef<GooglePlacesAutocompleteRef>(null);
  const destinationSearch = useRef<GooglePlacesAutocompleteRef>(null);

  const [origin, setOrigin] = useState<Coordinates>(CAIRO);
  const [destination, setDestination] = useState<Coordinates>(DESTINATION);
  const [originLabel, setOriginLabel] = useState('Current pickup');
  const [destinationLabel, setDestinationLabel] = useState('Where to?');
  const [activePoint, setActivePoint] = useState<PointKind>('origin');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const region: Region = useMemo(
    () => ({ ...origin, latitudeDelta: 0.18, longitudeDelta: 0.18 }),
    [origin],
  );
  const activeBooking = useMemo(
    () =>
      [...(bookingsQuery.data ?? [])]
        .filter(isBookingTrackingEligible)
        .sort((a, b) => new Date(a.trip.departureTime).getTime() - new Date(b.trip.departureTime).getTime())[0],
    [bookingsQuery.data],
  );

  const persistPoints = async (nextOrigin = origin, nextDestination = destination) => {
    await AsyncStorage.setItem(
      POINTS_KEY,
      JSON.stringify({
        origin: nextOrigin,
        destination: nextDestination,
        originLabel,
        destinationLabel,
      }),
    );
  };

  const focusMap = (point: Coordinates) => {
    map.current?.animateToRegion({ ...point, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 350);
  };

  const setPoint = (kind: PointKind, coordinate: Coordinates, label?: string) => {
    if (kind === 'origin') {
      setOrigin(coordinate);
      if (label) setOriginLabel(label);
    } else {
      setDestination(coordinate);
      if (label) setDestinationLabel(label);
    }
    focusMap(coordinate);
  };

  const locate = async () => {
    setMessage('');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setMessage(t('home.permission'));
      focusMap(origin);
      return;
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
    setActivePoint('origin');
    setPoint('origin', point, 'Current location');
    await persistPoints(point, destination);
  };

  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(POINTS_KEY);
      if (saved) {
        const points = JSON.parse(saved);
        setOrigin(points.origin ?? CAIRO);
        setDestination(points.destination ?? DESTINATION);
        setOriginLabel(points.originLabel ?? 'Saved pickup');
        setDestinationLabel(points.destinationLabel ?? 'Saved drop-off');
        originSearch.current?.setAddressText(points.originLabel ?? 'Saved pickup');
        destinationSearch.current?.setAddressText(points.destinationLabel ?? 'Saved drop-off');
      } else {
        await locate();
      }
    })();
  }, []);

  const handlePlaceSelected = (kind: PointKind, data: any, detail: any) => {
    const location = detail?.geometry?.location ?? detail?.location;
    if (!location) {
      setMessage('Google did not return coordinates for this place. Try another result.');
      return;
    }

    const label =
      detail?.name ||
      data?.structured_formatting?.main_text ||
      data?.description ||
      (kind === 'origin' ? 'Selected pickup' : 'Selected drop-off');
    const coordinate = {
      latitude: location.lat ?? location.latitude,
      longitude: location.lng ?? location.longitude,
    };

    setActivePoint(kind);
    setPoint(kind, coordinate, label);
    setMessage('');
  };

  const search = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await searchTrips(origin, destination, date);
      setResults(data);
      await persistPoints();
      if (!data.length) setMessage(t('home.noTrips'));
    } catch (e: any) {
      setMessage(e.response?.data?.message ?? 'Unable to search trips');
    } finally {
      setLoading(false);
    }
  };

  const openTrip = (result: SearchResult, trip: Trip) =>
    router.push({
      pathname: '/trip/[id]',
      params: { id: trip.id, result: JSON.stringify(result), trip: JSON.stringify(trip) },
    });

  const bumpDate = (days: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);
    setDate(next.toISOString().slice(0, 10));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.kicker}>ShuttleMasr</Text>
          <Text style={styles.title}>{t('home.title')}</Text>
          <Text style={styles.subtitle}>Search like a ride app, then ShuttleMasr matches you to real route stops.</Text>
        </View>

        {activeBooking ? (
          <ActiveTripBanner
            booking={activeBooking}
            onPress={() => router.push(`/tracking/${activeBooking.id}`)}
          />
        ) : null}

        <View style={styles.searchCard}>
          <View style={styles.pointTabs}>
            {(['origin', 'destination'] as PointKind[]).map((kind) => (
              <TouchableOpacity
                key={kind}
                onPress={() => setActivePoint(kind)}
                style={[styles.pointTab, activePoint === kind && styles.pointTabActive]}
              >
                <Text style={[styles.pointTabText, activePoint === kind && styles.pointTabTextActive]}>
                  {kind === 'origin' ? 'Pickup' : 'Drop-off'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Pickup point</Text>
            <GooglePlacesAutocomplete
              ref={originSearch}
              placeholder={originLabel}
              minLength={2}
              fetchDetails
              debounce={250}
              enablePoweredByContainer={false}
              keyboardShouldPersistTaps="handled"
              keepResultsAfterBlur
              listViewDisplayed="auto"
              onPress={(data, detail) => handlePlaceSelected('origin', data, detail)}
              onFail={(error) => setMessage(error?.message ?? String(error ?? 'Google Places search failed'))}
              onNotFound={() => setMessage('No pickup places found. Try a more specific location.')}
              query={{
                key: GOOGLE_PLACES_API_KEY,
                language: 'en',
                components: 'country:eg',
                types: 'geocode',
              }}
              GooglePlacesDetailsQuery={{ fields: 'geometry,name,formatted_address' }}
              textInputProps={{
                onFocus: () => setActivePoint('origin'),
                placeholderTextColor: COLORS.textMuted,
              }}
              renderLeftButton={() => <View style={[styles.dot, styles.originDot]} />}
              styles={placesStyles}
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Destination</Text>
            <GooglePlacesAutocomplete
              ref={destinationSearch}
              placeholder={destinationLabel}
              minLength={2}
              fetchDetails
              debounce={250}
              enablePoweredByContainer={false}
              keyboardShouldPersistTaps="handled"
              keepResultsAfterBlur
              listViewDisplayed="auto"
              onPress={(data, detail) => handlePlaceSelected('destination', data, detail)}
              onFail={(error) => setMessage(error?.message ?? String(error ?? 'Google Places search failed'))}
              onNotFound={() => setMessage('No destination places found. Try a more specific location.')}
              query={{
                key: GOOGLE_PLACES_API_KEY,
                language: 'en',
                components: 'country:eg',
                types: 'geocode',
              }}
              GooglePlacesDetailsQuery={{ fields: 'geometry,name,formatted_address' }}
              textInputProps={{
                onFocus: () => setActivePoint('destination'),
                placeholderTextColor: COLORS.textMuted,
              }}
              renderLeftButton={() => <View style={[styles.dot, styles.destinationDot]} />}
              styles={placesStyles}
            />
          </View>

          <Text style={styles.helper}>
            Tip: choose a Google suggestion, tap the map to move the selected {activePoint === 'origin' ? 'pickup' : 'drop-off'} pin, or drag either pin.
          </Text>
        </View>

        <View style={styles.mapWrap}>
          <MapView
            ref={map}
            style={styles.map}
            initialRegion={region}
            onPress={(event) => setPoint(activePoint, event.nativeEvent.coordinate, activePoint === 'origin' ? 'Manual pickup' : 'Manual drop-off')}
          >
            <Marker
              coordinate={origin}
              draggable
              onDragEnd={(e) => setPoint('origin', e.nativeEvent.coordinate, 'Manual pickup')}
              pinColor={COLORS.success}
              title="Pickup"
            />
            <Marker
              coordinate={destination}
              draggable
              onDragEnd={(e) => setPoint('destination', e.nativeEvent.coordinate, 'Manual drop-off')}
              pinColor={COLORS.danger}
              title="Drop-off"
            />
          </MapView>
          <TouchableOpacity style={styles.locate} onPress={() => void locate()}>
            <Text style={styles.locateText}>GPS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pickup</Text>
            <Text style={styles.summaryText}>{originLabel}</Text>
            <Text style={styles.coords}>{origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Drop-off</Text>
            <Text style={styles.summaryText}>{destinationLabel}</Text>
            <Text style={styles.coords}>{destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <View>
            <Text style={styles.summaryLabel}>Travel date</Text>
            <Text style={styles.date}>{compactDate(date)}</Text>
          </View>
          <View style={styles.dateActions}>
            <TouchableOpacity style={styles.dateButton} onPress={() => bumpDate(-1)}>
              <Text style={styles.dateButtonText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateButton} onPress={() => bumpDate(1)}>
              <Text style={styles.dateButtonText}>+1</Text>
            </TouchableOpacity>
          </View>
        </View>

        <AppButton label={t('home.search')} loading={loading} onPress={() => void search()} />
        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>Nearby trips</Text>
          <Text style={styles.sectionMeta}>{results.reduce((sum, item) => sum + item.trips.filter(isTripBookable).length, 0)} options</Text>
        </View>

        {results.flatMap((result) =>
          result.trips.filter(isTripBookable).map((trip) => (
            <AppCard key={trip.id} onPress={() => openTrip(result, trip)} style={styles.resultCard}>
              <View style={styles.resultTop}>
                <View style={styles.lineBadge}>
                  <View style={[styles.lineColor, { backgroundColor: result.line.colorHex ?? COLORS.primary }]} />
                  <Text style={styles.lineName}>{result.line.name}</Text>
                </View>
                <Text style={styles.price}>{Number(trip.pricePerSeat).toFixed(0)} EGP</Text>
              </View>
              <Text style={styles.route}>{result.pickupLineStop.stop.nameEn} to {result.dropoffLineStop.stop.nameEn}</Text>
              <View style={styles.tripMetaRow}>
                <Text style={styles.tripMeta}>{compactTime(trip.departureTime)}</Text>
                <Text style={styles.tripMeta}>{trip.availableSeats} seats</Text>
                <Text style={styles.tripMeta}>{trip.vehicle?.type ?? result.line.driver?.vehicle?.type ?? 'Shuttle'}</Text>
              </View>
              <Text style={styles.walk}>
                Walk {Math.round(result.pickupDistanceMeters)}m to pickup - {Math.round(result.dropoffDistanceMeters)}m from drop-off
              </Text>
            </AppCard>
          )),
        )}
      </ScrollView>
      {loading ? <ActivityIndicator style={styles.busy} color={COLORS.primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 56, paddingBottom: 120 },
  hero: { marginBottom: SPACING.lg },
  kicker: { color: COLORS.primaryDark, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: FONT_SIZE.display, fontWeight: '900', color: COLORS.text, marginTop: SPACING.xs },
  subtitle: { color: COLORS.textSecondary, marginTop: SPACING.sm, lineHeight: 20 },
  searchCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xxl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  pointTabs: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: RADIUS.full, padding: 4, marginBottom: SPACING.md },
  pointTab: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, borderRadius: RADIUS.full },
  pointTabActive: { backgroundColor: COLORS.primary },
  pointTabText: { fontWeight: '800', color: COLORS.textSecondary },
  pointTabTextActive: { color: COLORS.text },
  inputBlock: { marginBottom: SPACING.md },
  inputLabel: { fontSize: FONT_SIZE.xs, fontWeight: '900', color: COLORS.textSecondary, marginBottom: SPACING.xs, textTransform: 'uppercase' },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: SPACING.md, marginRight: SPACING.sm },
  originDot: { backgroundColor: COLORS.success },
  destinationDot: { backgroundColor: COLORS.danger },
  helper: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 18 },
  mapWrap: { height: 320, borderRadius: RADIUS.xxl, overflow: 'hidden', marginVertical: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  map: { flex: 1 },
  locate: { position: 'absolute', right: 12, bottom: 12, width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  locateText: { color: COLORS.text, fontSize: FONT_SIZE.xs, fontWeight: '900' },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  summaryCard: { flex: 1, backgroundColor: COLORS.card, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  summaryLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: '900', textTransform: 'uppercase' },
  summaryText: { color: COLORS.text, fontWeight: '900', marginTop: SPACING.xs },
  coords: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 3 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  date: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '900', marginTop: SPACING.xs },
  dateActions: { flexDirection: 'row', gap: SPACING.sm },
  dateButton: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  dateButtonText: { color: COLORS.primaryDark, fontWeight: '900' },
  message: { textAlign: 'center', color: COLORS.textSecondary, marginVertical: SPACING.lg },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xl, marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '900', color: COLORS.text },
  sectionMeta: { color: COLORS.textSecondary, fontWeight: '800' },
  resultCard: { borderColor: COLORS.borderLight },
  resultTop: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  lineBadge: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  lineColor: { width: 12, height: 12, borderRadius: 6 },
  lineName: { fontSize: FONT_SIZE.lg, fontWeight: '900', flex: 1 },
  price: { fontWeight: '900', color: COLORS.primaryDark },
  route: { marginTop: SPACING.md, fontWeight: '800', color: COLORS.text },
  tripMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  tripMeta: { backgroundColor: COLORS.background, borderRadius: RADIUS.full, paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md, color: COLORS.textSecondary, fontWeight: '800', fontSize: FONT_SIZE.sm },
  walk: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: SPACING.md },
  busy: { position: 'absolute', top: '50%', left: '50%' },
});

const placesStyles = {
  container: {
    flex: 0,
    zIndex: 20,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    margin: 0,
    paddingHorizontal: 0,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  listView: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    marginTop: SPACING.xs,
    overflow: 'hidden',
    zIndex: 30,
  },
  row: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    minHeight: 54,
  },
  description: {
    color: COLORS.text,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
};
