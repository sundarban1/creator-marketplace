import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { RadiusSlider } from '@/components/RadiusSlider';
import { F } from '@/utilities/constants';
import { getCurrentLocation, type LatLng } from '@/utilities/geolocation';

const DEFAULT_DELTA = 0.15; // ~15km-ish span at the equator, close enough for a starting zoom
const FALLBACK_COORDS: LatLng = { lat: 27.7172, lng: 85.3240 }; // Kathmandu — used only if no location is available at all

export type NearbySource = 'current' | 'home' | 'custom';

type Props = {
  visible: boolean;
  onClose: () => void;
  source: NearbySource;
  radiusKm: number;
  homeLabel: string | null;
  currentCoords: LatLng | null;
  homeCoords: LatLng | null;
  customCoords: LatLng | null;
  onApply: (source: NearbySource, radiusKm: number, coords: LatLng) => void;
};

/**
 * Facebook-Marketplace-style location picker: a map with a fixed center pin
 * (drag the map to move the pin, matching how most map pickers behave) and a
 * radius slider below it — replaces the old radius-pill list entirely.
 */
export function NearbyLocationSheet({ visible, onClose, source, radiusKm, homeLabel, currentCoords, homeCoords, customCoords, onApply }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);

  const [draftSource, setDraftSource] = useState<NearbySource>(source);
  const [draftRadius, setDraftRadius] = useState(radiusKm);
  const [pinCoords, setPinCoords] = useState<LatLng>(currentCoords ?? homeCoords ?? FALLBACK_COORDS);
  const [locatingCurrent, setLocatingCurrent] = useState(false);

  // react-native-maps fires onRegionChangeComplete for BOTH programmatic
  // animateToRegion calls (tapping Current/Home) AND genuine user drags —
  // this flag lets us tell them apart so only a real drag switches to "custom".
  const isProgrammaticMove = useRef(false);
  // MapView also fires onRegionChangeComplete once on its own right after it
  // lays out with initialRegion, with no user touch involved — onPanDrag only
  // fires for an actual finger-driven pan, so it's the one reliable signal
  // that the pin move below should count as "custom".
  const userIsDragging = useRef(false);

  useEffect(() => {
    if (!visible) return;
    // Home is the preferred starting point every time the sheet opens,
    // regardless of whichever source was last applied — falls back to
    // the previously applied source only when no home address is saved.
    const initialSource: NearbySource = homeCoords ? 'home' : source;
    setDraftSource(initialSource);
    setDraftRadius(radiusKm);
    userIsDragging.current = false;
    const start =
      initialSource === 'current' ? (currentCoords ?? homeCoords) :
      initialSource === 'home'    ? (homeCoords ?? currentCoords) :
      (customCoords ?? currentCoords ?? homeCoords);
    setPinCoords(start ?? FALLBACK_COORDS);
  }, [visible, source, radiusKm, currentCoords, homeCoords, customCoords]);

  function moveTo(coords: LatLng) {
    isProgrammaticMove.current = true;
    setPinCoords(coords);
    mapRef.current?.animateToRegion({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    }, 300);
  }

  function handleRegionChangeComplete(region: Region) {
    setPinCoords({ lat: region.latitude, lng: region.longitude });
    if (isProgrammaticMove.current) {
      // This change came from moveTo() finishing its animation, not a user drag — consume the flag.
      isProgrammaticMove.current = false;
    } else if (userIsDragging.current) {
      // A genuine drag — the pin no longer matches Current or Home, so neither stays selected.
      setDraftSource('custom');
      userIsDragging.current = false;
    }
    // Otherwise this is the map's own initial-layout region-change — not a user action, ignore it.
  }

  async function handleSelectCurrent() {
    setDraftSource('current');
    // Re-request a fresh GPS fix rather than trusting the coords captured when
    // the screen first mounted — the creator may have moved since then.
    setLocatingCurrent(true);
    const fresh = await getCurrentLocation();
    setLocatingCurrent(false);
    const coords = fresh ?? currentCoords;
    if (coords) moveTo(coords);
  }

  function handleSelectHome() {
    setDraftSource('home');
    if (homeCoords) moveTo(homeCoords);
  }

  function handleApply() {
    onApply(draftSource, draftRadius, pinCoords);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: C.surface }]}>
        <View style={[styles.handle, { backgroundColor: C.border }]} />

        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{t('nearbyLocationSheet.title')}</Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.sourceToggleRow}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.sourceToggle, { borderColor: draftSource === 'current' ? C.brinjal1 : C.border, backgroundColor: draftSource === 'current' ? C.primaryLight : C.background }]}
              disabled={locatingCurrent}
              onPress={() => void handleSelectCurrent()}>
              {locatingCurrent ? (
                <ActivityIndicator size="small" color={C.brinjal1} />
              ) : (
                <Ionicons name="navigate" size={13} color={draftSource === 'current' ? C.brinjal1 : C.textSecondary} />
              )}
              <Text style={[styles.sourceToggleText, { color: draftSource === 'current' ? C.brinjal1 : C.text }]}>{t('nearbyLocationSheet.currentLocation')}</Text>
            </Pressable>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[
                styles.sourceToggle,
                { borderColor: draftSource === 'home' ? C.brinjal1 : C.border, backgroundColor: draftSource === 'home' ? C.primaryLight : C.background },
                !homeCoords && { opacity: 0.5 },
              ]}
              disabled={!homeCoords}
              onPress={handleSelectHome}>
              <Ionicons name="home" size={13} color={draftSource === 'home' ? C.brinjal1 : C.textSecondary} />
              <Text style={[styles.sourceToggleText, { color: draftSource === 'home' ? C.brinjal1 : C.text }]} numberOfLines={1}>
                {homeLabel ? t('nearbyLocationSheet.homeWithLabel', { label: homeLabel }) : t('nearbyLocationSheet.home')}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>{t('nearbyLocationSheet.changeLocation')}</Text>
          <Text style={[styles.sectionHint, { color: C.textSecondary }]}>
            {draftSource === 'custom' ? t('nearbyLocationSheet.customPointHint') : t('nearbyLocationSheet.dragMapHint')}
          </Text>

          <View style={[styles.mapWrap, { borderColor: draftSource === 'custom' ? C.brinjal1 : C.border }]}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: pinCoords.lat,
                longitude: pinCoords.lng,
                latitudeDelta: DEFAULT_DELTA,
                longitudeDelta: DEFAULT_DELTA,
              }}
              onPanDrag={() => { userIsDragging.current = true; }}
              onRegionChangeComplete={handleRegionChangeComplete}
            />
            {/* Fixed center pin — the map pans underneath it, matching the
                Facebook Marketplace "drag map, pin stays put" pattern. */}
            <View style={styles.pinWrap} pointerEvents="none">
              <Ionicons name="location" size={36} color={C.brinjal1} />
            </View>
          </View>

          <RadiusSlider value={draftRadius} onChange={setDraftRadius} min={1} max={100} />
        </View>

        <View style={[styles.footer, { borderTopColor: C.border }]}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1 }, (pressed || locatingCurrent) && { opacity: 0.88 }]}
            disabled={locatingCurrent}
            onPress={handleApply}>
            <Text style={styles.applyBtnText}>{t('nearbyLocationSheet.applyBtn')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:    { fontSize: 17, fontFamily: F.bold },

  body: { padding: 20, gap: 4 },

  sourceToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sourceToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8 },
  sourceToggleText: { fontSize: 12, fontFamily: F.bold, flexShrink: 1 },

  sectionLabel: { fontSize: 11, letterSpacing: 0.6, fontFamily: F.bold },
  sectionHint:  { fontSize: 12, fontFamily: F.regular, marginTop: 2, marginBottom: 10 },

  mapWrap: { height: 220, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', marginBottom: 20 },
  map: { ...StyleSheet.absoluteFill },
  pinWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', marginBottom: 36 },

  footer:   { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  applyBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
});
