import { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, OverlayView, OVERLAY_MOUSE_TARGET, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { COLORS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingTheme } from '../context/ThemeContext';
import { TextReveal } from '../components/TextReveal';
import { useReducedMotion } from '../hooks/useReducedMotion';

// Simplified, stylized silhouette evoking Nepal's elongated east-west shape —
// a decorative watermark, not a precise cartographic boundary. Same low-opacity
// treatment as the oversized "K" watermark in Hero.tsx.
const NEPAL_OUTLINE =
  'M40 175c15-35 55-53 105-57 27-23 63-40 110-36 37-20 80-30 130-24 43-16 87-8 127-10 48-12 93 2 133 18 47 4 87 22 120 50 15 24 3 46-27 54-26 18-66 12-102 24-38 12-80 4-118 16-40 10-82 2-122 8-40 6-82-2-122 4-40 6-82-4-122-14-40-6-84-10-112-33z';

// Real coordinates for the handful of cities the connection map plots —
// index into the language-specific `cities` array so labels stay translated,
// coordinates stay language-agnostic.
type MapCityKey = 'ilam' | 'dharan' | 'kathmandu' | 'pokhara' | 'biratnagar' | 'nepalgunj' | 'dhangadhi' | 'janakpur';

const MAP_CITY_POINTS: Record<MapCityKey, { cityIndex: number; lat: number; lng: number }> = {
  dhangadhi: { cityIndex: 29, lat: 28.6939, lng: 80.5827 },
  nepalgunj: { cityIndex: 4, lat: 28.05, lng: 81.6167 },
  pokhara: { cityIndex: 3, lat: 28.2096, lng: 83.9856 },
  kathmandu: { cityIndex: 2, lat: 27.7172, lng: 85.324 },
  janakpur: { cityIndex: 18, lat: 26.7288, lng: 85.9247 },
  dharan: { cityIndex: 1, lat: 26.8065, lng: 87.2846 },
  biratnagar: { cityIndex: 0, lat: 26.4525, lng: 87.2718 },
  ilam: { cityIndex: 43, lat: 26.9098, lng: 87.9309 },
};

// Ilam <-> Dharan shown first, then rotates through pairs spread across the
// map so "creators discover each other anywhere in Nepal" reads visually.
const MAP_PAIRS: [MapCityKey, MapCityKey][] = [
  ['ilam', 'dharan'],
  ['kathmandu', 'pokhara'],
  ['biratnagar', 'nepalgunj'],
  ['dhangadhi', 'janakpur'],
];

const MAP_PAIR_HOLD_MS = 3400;
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };
const NEPAL_CENTER = { lat: 28.1, lng: 84.0 };
const GOOGLE_MAPS_LIBRARIES: 'marker'[] = [];

// Full country extent (with a little margin beyond the actual border) —
// fitBounds() on load frames all of Nepal inside the card regardless of its
// pixel size, instead of a fixed zoom/center that can crop the north or
// south edge on shorter containers.
const NEPAL_BOUNDS: google.maps.LatLngBoundsLiteral = { north: 30.6, south: 26.2, west: 79.9, east: 88.4 };

// Light custom tint (not a heavy reskin) so the map still reads as an
// authentic Google Map — place names, roads, and default labels stay on,
// only POI/transit icon clutter is trimmed and the palette leans toward the
// site's paper/ink colors instead of stock Google green/yellow.
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f6f3ee' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b655f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#fbf9f5' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: COLORS.violet }, { weight: 1.4 }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#d8d2c8' }] },
  // Google's own city/town-name labels would otherwise render right at each
  // pin's coordinate — a second, unstyled "Ilam"/"Dharan" competing with our
  // custom pin+pill for the exact same spot. Hiding locality/neighborhood
  // text (but not country/province, water, or road labels) makes our pill
  // the only city label anywhere, so there's nothing left for it to fail to cover.
  { featureType: 'administrative.locality', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e6e1f5' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#eee9e0' }] },
];

// Same tint recipe as MAP_STYLES above, remapped onto the site's dark
// palette (--color-ink/-elevated/-elevated-2) so the map reads as part of
// the dark section instead of a stray light rectangle in the middle of it.
const MAP_STYLES_DARK: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1e1a18' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9c9691' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141110' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: COLORS.violet }, { weight: 1.4 }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#35302c' }] },
  { featureType: 'administrative.locality', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1f1a30' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262120' }] },
];

const MAP_OPTIONS_BASE = {
  disableDefaultUI: true,
  gestureHandling: 'none',
  keyboardShortcuts: false,
  clickableIcons: false,
} as const;

// Classic teardrop pin (not a plain dot) — tip anchored exactly on the
// coordinate. The pin is ~35px tall at this scale (22-unit path * 1.6), so
// the pill label overlay below offsets itself by that much to clear the head.
const PIN_PATH = 'M12,2C8.13,2,5,5.13,5,9c0,5.25,7,13,7,13s7-7.75,7-13C19,5.13,15.87,2,12,2z';
const PIN_SCALE = 1.6;
const PIN_HEIGHT_PX = 22 * PIN_SCALE;

function pinIcon(color: string): google.maps.Symbol {
  return {
    path: PIN_PATH,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 1.5,
    scale: PIN_SCALE,
    anchor: new google.maps.Point(12, 22),
  };
}

// White pill label floating above a pin — Marker's built-in `label` only
// supports plain text with no background, so this is a real DOM node
// projected onto the map via OverlayView instead, matching the pill chips
// used elsewhere on the site (e.g. the nav's language switch).
function PinPill({ lat, lng, text, color }: { lat: number; lng: number; text: string; color: string }) {
  return (
    <OverlayView
      position={{ lat, lng }}
      mapPaneName={OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({ x: -width / 2, y: -(height + PIN_HEIGHT_PX + 6) })}
    >
      <div
        // A plain shadow alone can vanish when the pill lands over the map's
        // own light cream terrain fill (#f6f3ee is close to white) — the ring
        // gives the pill a hard edge so it reads as an opaque card sitting on
        // top of the map no matter what's directly underneath it.
        className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold leading-none ring-1 ring-ink/10 shadow-[0_8px_20px_-6px_rgba(20,17,16,0.4)] dark:bg-ink-elevated-2 dark:ring-white/10"
        style={{ color }}
      >
        {text}
      </div>
    </OverlayView>
  );
}

const CALLOUT_HOLD_MS = 4200;

// Small feature-callout ticker pinned to the map's top-right corner — one
// line slides in from the right at a time, replacing the previous line, so
// it reads as a short list without needing space for all of them at once.
function MapCallouts({ items, active }: { items: string[]; active: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), CALLOUT_HOLD_MS);
    return () => clearInterval(id);
  }, [active, items.length]);

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex justify-end sm:left-5 sm:right-5 sm:top-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex max-w-full items-center gap-2.5 rounded-full border border-ink/10 bg-white/95 py-2.5 pl-3.5 pr-5 shadow-[0_10px_30px_-10px_rgba(20,17,16,0.3)] backdrop-blur-sm dark:border-white/10 dark:bg-ink-elevated-2/95"
        >
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-xs font-bold text-violet">
            {index + 1}
          </span>
          <span className="truncate text-sm font-semibold text-ink dark:text-white">{items[index]}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// A real Google Map of Nepal — two markers for the active creator pair, with
// a dashed connecting line whose arrow symbols march along it (Google Maps
// has no built-in path animation, so this is the standard recipe: nudge the
// polyline icon's offset a little every tick).
function NepalConnectionMap({ cities, callouts }: { cities: string[]; callouts: string[] }) {
  const reducedMotion = useReducedMotion();
  const { theme } = useLandingTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const inView = useInView(mapRef, { amount: 0.5 });
  const [pairIndex, setPairIndex] = useState(0);
  const [dashOffset, setDashOffset] = useState(0);

  const { isLoaded } = useJsApiLoader({
    id: 'kolab-google-maps',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  function handleMapLoad(map: google.maps.Map) {
    mapInstanceRef.current = map;
    map.fitBounds(NEPAL_BOUNDS, 24);
  }

  // Google Maps snapshots its container's pixel size when it first loads and
  // never notices later layout changes on its own (a breakpoint switching,
  // a dev-server hot reload, fonts shifting layout) — it just keeps rendering
  // tiles at the old size, leaving the rest of a since-grown container blank.
  // Re-measure and re-fit whenever the card's actual box size changes.
  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver(() => {
      const map = mapInstanceRef.current;
      if (!map) return;
      google.maps.event.trigger(map, 'resize');
      map.fitBounds(NEPAL_BOUNDS, 24);
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reducedMotion) return;
    const id = setInterval(() => setPairIndex((i) => (i + 1) % MAP_PAIRS.length), MAP_PAIR_HOLD_MS);
    return () => clearInterval(id);
  }, [inView, reducedMotion]);

  useEffect(() => {
    if (!inView || reducedMotion || !isLoaded) return;
    const id = setInterval(() => setDashOffset((o) => (o + 2) % 100), 60);
    return () => clearInterval(id);
  }, [inView, reducedMotion, isLoaded]);

  const [aKey, bKey] = MAP_PAIRS[pairIndex]!;
  const a = MAP_CITY_POINTS[aKey];
  const b = MAP_CITY_POINTS[bKey];
  const mapOptions: google.maps.MapOptions = { ...MAP_OPTIONS_BASE, styles: theme === 'dark' ? MAP_STYLES_DARK : MAP_STYLES };

  return (
    <div
      ref={mapRef}
      className="relative w-full overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_20px_60px_-24px_rgba(20,17,16,0.18)] dark:border-white/10 dark:bg-ink-elevated"
    >
      <div className="h-[420px] w-full sm:h-[600px]">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={NEPAL_CENTER}
            zoom={7}
            options={mapOptions}
            onLoad={handleMapLoad}
          >
            {/* No `key` on these — remounting a fresh Polyline/Marker per
                pair left the previous instance's overlay behind on the map
                instead of being cleaned up. Keeping one stable instance per
                role and just updating its path/position/icon avoids that. */}
            <Polyline
              path={[
                { lat: a.lat, lng: a.lng },
                { lat: b.lat, lng: b.lng },
              ]}
              options={{
                strokeOpacity: 0,
                icons: [
                  {
                    icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.85, strokeColor: COLORS.violet, scale: 3 },
                    offset: `${dashOffset}%`,
                    repeat: '16px',
                  },
                ],
              }}
            />
            <Marker position={{ lat: a.lat, lng: a.lng }} icon={pinIcon(COLORS.violet)} zIndex={2} />
            <Marker position={{ lat: b.lat, lng: b.lng }} icon={pinIcon(COLORS.orange)} zIndex={2} />
            <PinPill lat={a.lat} lng={a.lng} text={cities[a.cityIndex]!} color={COLORS.violet} />
            <PinPill lat={b.lat} lng={b.lng} text={cities[b.cityIndex]!} color={COLORS.orange} />
          </GoogleMap>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-ink-soft dark:text-white">Loading map…</div>
        )}
      </div>

      <MapCallouts items={callouts} active={inView && !reducedMotion} />
    </div>
  );
}

export function Collaboration() {
  const { d } = useLandingLanguage();
  const cities = d.collaboration.cities;

  return (
    <section id="collaboration" className="relative overflow-hidden bg-white py-24 dark:bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet/[0.08] blur-[110px]" />
        <svg
          viewBox="0 0 800 260"
          fill="currentColor"
          className="absolute left-1/2 top-1/2 w-[640px] max-w-none -translate-x-1/2 -translate-y-1/2 text-violet/[0.06] sm:w-[820px]"
        >
          <path d={NEPAL_OUTLINE} />
        </svg>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto max-w-6xl px-6"
      >
        {/* Top-left eyebrow + heading, same corner placement as "Why Kolab"
            in Showcase.tsx — kept consistent across the sections below it. */}
        <div className="max-w-xl">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.collaboration.eyebrow}
          </motion.p>

          <TextReveal
            as="h2"
            text={d.collaboration.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger(0.15)}
        className="mx-auto mt-12 max-w-6xl px-6"
      >
        <motion.div variants={fadeUp}>
          <NepalConnectionMap cities={cities} callouts={d.collaboration.mapCallouts} />
        </motion.div>
      </motion.div>

    </section>
  );
}
