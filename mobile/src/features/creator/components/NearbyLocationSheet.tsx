import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { RadiusSlider } from '@/components/RadiusSlider';
import { BottomSheet } from '@/components/BottomSheet';
import { F } from '@/utilities/constants';
import { getCurrentLocation, type LatLng } from '@/utilities/geolocation';

const DEFAULT_DELTA = 0.15; // ~15km-ish span at the equator, close enough for a starting zoom
const FALLBACK_COORDS: LatLng = { lat: 27.7172, lng: 85.3240 }; // Kathmandu — used only if no location is available at all

// How much of the map card the circle's diameter should occupy — keeps the
// whole radius circle inside the visible card instead of spilling past its edges.
const CIRCLE_FIT_FRACTION = 0.85;

// Delta (in degrees) needed so a circle of this radius fits within the card —
// scales all the way down for small radii (e.g. 1km zooms in close) and up
// for large ones, floored only at MIN_DELTA to avoid an absurd, pointless zoom.
const MIN_DELTA = 0.01;
function deltaForRadiusKm(radiusKm: number) {
  const spanKm = (radiusKm * 2) / CIRCLE_FIT_FRACTION;
  return Math.max(spanKm / 111, MIN_DELTA);
}

export type NearbySource = 'current' | 'home' | 'custom';

type Props = {
  visible: boolean;
  onClose: () => void;
  source: NearbySource;
  radiusKm: number;
  homeLabel: string | null;
  homeAddress: string | null;
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
export function NearbyLocationSheet({ visible, onClose, source, radiusKm, homeLabel, homeAddress, currentCoords, homeCoords, customCoords, onApply }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const mapRef = useRef<MapView>(null);

  const [draftSource, setDraftSource] = useState<NearbySource>(source);
  const [draftRadius, setDraftRadius] = useState(radiusKm);
  // Starts null rather than defaulting to FALLBACK_COORDS — this sheet (and
  // therefore its MapView) mounts alongside the home screen, well before the
  // creator's profile fetch resolves currentCoords/homeCoords, and
  // react-native-maps only honors `initialRegion` on that first mount. If we
  // seeded Kathmandu here, that's what the map would be stuck showing (an
  // animateToRegion correction only fires once the sheet is actually opened,
  // which can lag behind or be missed entirely). Instead MapView itself
  // isn't rendered at all until pinCoords is resolved to something real —
  // see the effect below and the render guard further down.
  const [pinCoords, setPinCoords] = useState<LatLng | null>(currentCoords ?? homeCoords ?? null);
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
  // Always holds the latest pin position so the radius-zoom effect below can
  // re-center on it without needing pinCoords itself as a dependency (that
  // would also re-fire on a plain user drag and fight the drag gesture).
  const pinCoordsRef = useRef(pinCoords);

  function resolveCoordsFor(src: NearbySource): LatLng | null {
    if (src === 'current') return currentCoords ?? homeCoords;
    if (src === 'home')    return homeCoords ?? currentCoords;
    return customCoords ?? currentCoords ?? homeCoords;
  }

  // Falls back to whatever's resolved in props whenever pinCoords itself
  // hasn't been set yet (i.e. before the sheet has ever been opened once —
  // see the pinCoords useState comment above). Recomputed every render
  // rather than synced via an effect, so the moment currentCoords/homeCoords
  // resolve in the background (the parent's own profile fetch completing),
  // this naturally becomes non-null on that same re-render — no extra
  // render-triggering setState needed just to mirror it into local state.
  const displayCoords = pinCoords ?? resolveCoordsFor(source);
  pinCoordsRef.current = displayCoords;

  useEffect(() => {
    if (!visible) return;
    // Mirror whatever source is currently applied on the home screen —
    // the sheet should never override the creator's active selection.
    const initialSource: NearbySource = source;
    setDraftSource(initialSource);
    setDraftRadius(radiusKm);
    userIsDragging.current = false;
    // FALLBACK_COORDS (Kathmandu) only kicks in here, once the sheet is
    // actually open — genuinely nothing else is available (GPS denied, no
    // home address saved yet) rather than just "not resolved yet".
    moveTo(resolveCoordsFor(initialSource) ?? FALLBACK_COORDS, radiusKm);
  }, [visible, source, radiusKm, currentCoords, homeCoords, customCoords]);

  // Keep the circle fully inside the map card as the radius changes: zoom
  // out once the circle would spill past the card's edges, zoom back in as
  // it shrinks. Instant (no animation) so the map's zoom never lags behind
  // a fast slider drag — an animated catch-up would let the circle
  // (rendered immediately from draftRadius) momentarily poke past the card
  // edges while the map is still easing toward the new region.
  useEffect(() => {
    if (!visible || !pinCoordsRef.current) return;
    moveTo(pinCoordsRef.current, draftRadius, 0);
  }, [visible, draftRadius]);

  function moveTo(coords: LatLng, forRadiusKm: number = draftRadius, durationMs = 300) {
    isProgrammaticMove.current = true;
    setPinCoords(coords);
    const delta = deltaForRadiusKm(forRadiusKm);
    mapRef.current?.animateToRegion({
      latitude: coords.lat,
      longitude: coords.lng,
      latitudeDelta: delta,
      longitudeDelta: delta,
    }, durationMs);
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
    if (!displayCoords) return;
    onApply(draftSource, draftRadius, displayCoords);
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('nearbyLocationSheet.title')}
      scrollable={false}
      footer={
        <Pressable
          style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1 }, (pressed || locatingCurrent || !displayCoords) && { opacity: 0.88 }]}
          disabled={locatingCurrent || !displayCoords}
          onPress={handleApply}>
          <Text style={styles.applyBtnText}>{t('nearbyLocationSheet.applyBtn')}</Text>
        </Pressable>
      }>
        <View style={styles.body}>
          <View style={styles.sourceToggleRow}>
            <Pressable
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
            <Pressable
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
            {displayCoords ? (
              <>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: displayCoords.lat,
                    longitude: displayCoords.lng,
                    latitudeDelta: DEFAULT_DELTA,
                    longitudeDelta: DEFAULT_DELTA,
                  }}
                  onPanDrag={() => { userIsDragging.current = true; }}
                  onRegionChangeComplete={handleRegionChangeComplete}>
                  <Circle
                    center={{ latitude: displayCoords.lat, longitude: displayCoords.lng }}
                    radius={draftRadius * 1000}
                    fillColor={`${C.brinjal1}26`}
                    strokeColor={`${C.brinjal1}99`}
                    strokeWidth={1.5}
                  />
                </MapView>
                {/* Fixed center pin — the map pans underneath it, matching the
                    Facebook Marketplace "drag map, pin stays put" pattern. */}
                <View style={styles.pinWrap} pointerEvents="none">
                  <Ionicons name="location" size={36} color={C.brinjal1} />
                </View>
                {draftSource === 'home' && homeAddress && (
                  <View style={[styles.addressBanner, { backgroundColor: C.surface, borderColor: C.border }]} pointerEvents="none">
                    <Ionicons name="home" size={13} color={C.brinjal1} />
                    <Text style={[styles.addressBannerText, { color: C.text }]} numberOfLines={2}>{homeAddress}</Text>
                  </View>
                )}
              </>
            ) : (
              // Real coords (home or current) haven't resolved yet — shown only
              // very briefly right after first login, before the parent's
              // profile fetch resolves currentCoords/homeCoords. Never mounts
              // MapView with a wrong location instead of this.
              <View style={styles.mapLoading}>
                <ActivityIndicator size="small" color={C.brinjal1} />
              </View>
            )}
          </View>

          <RadiusSlider value={draftRadius} onChange={setDraftRadius} min={1} max={100} />
        </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 4 },

  sourceToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sourceToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8 },
  sourceToggleText: { fontSize: 12, fontFamily: F.bold, flexShrink: 1 },

  sectionLabel: { fontSize: 11, letterSpacing: 0.6, fontFamily: F.bold },
  sectionHint:  { fontSize: 12, fontFamily: F.regular, marginTop: 2, marginBottom: 10 },

  mapWrap: { height: 220, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', marginBottom: 20 },
  map: { ...StyleSheet.absoluteFill },
  mapLoading: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  pinWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', marginBottom: 36 },
  // No `right` — without it, an absolutely-positioned view shrinks to fit its
  // content instead of stretching full-width, so the pill's background only
  // spans as wide as the address text actually is. `maxWidth` still caps it
  // so a very long address wraps/truncates instead of running off the card.
  addressBanner: { position: 'absolute', top: 10, left: 10, maxWidth: '85%', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  addressBannerText: { flexShrink: 1, fontSize: 11, fontFamily: F.medium },

  applyBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
});
