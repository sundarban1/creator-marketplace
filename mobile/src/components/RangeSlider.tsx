import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';

const DEFAULT_MAX  = 1000;
const DEFAULT_STEP = 10;
const DEFAULT_GAP  = 80;
const THUMB_R = 13;

function valToPx(val: number, tw: number, min: number, max: number) { return ((val - min) / (max - min)) * tw; }
/** Converts a value *delta* (e.g. the min-gap between thumbs) to px — independent of the range floor. */
function deltaToPx(delta: number, tw: number, min: number, max: number) { return (delta / (max - min)) * tw; }
function pxToVal(px: number, tw: number, min: number, max: number, step: number) {
  if (tw === 0) return min;
  return min + Math.round(Math.max(0, Math.min(px / tw, 1)) * (max - min) / step) * step;
}

function fmtVal(v: number, currency: string, max: number): string {
  if (currency === 'Rs') {
    if (v >= 100000) return `Rs ${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `Rs ${(v / 1000).toFixed(0)}K`;
    return `Rs ${v}`;
  }
  return v >= max ? `${currency}${max.toLocaleString()}+` : `${currency}${v}`;
}

type Props = {
  minVal: number;
  maxVal: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  minGap?: number;
  currency?: string;
};

export function RangeSlider({
  minVal, maxVal, onMinChange, onMaxChange,
  min = 0, max = DEFAULT_MAX, step = DEFAULT_STEP, minGap = DEFAULT_GAP, currency = 'Rs',
}: Props) {
  const C = useAppColors();
  const [dispMin, setDispMin] = useState(minVal);
  const [dispMax, setDispMax] = useState(maxVal);
  const [trackW, setTrackW]   = useState(0);

  const dispMinRef   = useRef(minVal);
  const dispMaxRef   = useRef(maxVal);
  const trackWRef    = useRef(0);
  const startMinPx   = useRef(0);
  const startMaxPx   = useRef(0);
  const dragMin      = useRef(false);
  const dragMax      = useRef(false);
  const onMinRef     = useRef(onMinChange);
  const onMaxRef     = useRef(onMaxChange);
  const minRef       = useRef(min);
  const maxRef       = useRef(max);
  const stepRef      = useRef(step);
  const minGapRef    = useRef(minGap);

  dispMinRef.current = dispMin;
  dispMaxRef.current = dispMax;
  trackWRef.current  = trackW;
  onMinRef.current   = onMinChange;
  onMaxRef.current   = onMaxChange;
  minRef.current     = min;
  maxRef.current     = max;
  stepRef.current    = step;
  minGapRef.current  = minGap;

  useEffect(() => { if (!dragMin.current) setDispMin(minVal); }, [minVal]);
  useEffect(() => { if (!dragMax.current) setDispMax(maxVal); }, [maxVal]);

  const minPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      dragMin.current = true;
      startMinPx.current = valToPx(dispMinRef.current, trackWRef.current, minRef.current, maxRef.current);
    },
    onPanResponderMove: (_, g) => {
      const tw = trackWRef.current;
      const minV = minRef.current;
      const maxV = maxRef.current;
      const maxAllowed = valToPx(dispMaxRef.current, tw, minV, maxV) - deltaToPx(minGapRef.current, tw, minV, maxV);
      const clamped = Math.max(0, Math.min(startMinPx.current + g.dx, maxAllowed));
      setDispMin(pxToVal(clamped, tw, minV, maxV, stepRef.current));
    },
    onPanResponderRelease: ()   => { dragMin.current = false; onMinRef.current(dispMinRef.current); },
    onPanResponderTerminate: () => { dragMin.current = false; onMinRef.current(dispMinRef.current); },
  })).current;

  const maxPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      dragMax.current = true;
      startMaxPx.current = valToPx(dispMaxRef.current, trackWRef.current, minRef.current, maxRef.current);
    },
    onPanResponderMove: (_, g) => {
      const tw = trackWRef.current;
      const minV = minRef.current;
      const maxV = maxRef.current;
      const minAllowed = valToPx(dispMinRef.current, tw, minV, maxV) + deltaToPx(minGapRef.current, tw, minV, maxV);
      const clamped = Math.max(minAllowed, Math.min(startMaxPx.current + g.dx, tw));
      setDispMax(pxToVal(clamped, tw, minV, maxV, stepRef.current));
    },
    onPanResponderRelease: ()   => { dragMax.current = false; onMaxRef.current(dispMaxRef.current); },
    onPanResponderTerminate: () => { dragMax.current = false; onMaxRef.current(dispMaxRef.current); },
  })).current;

  const minPct = (dispMin - min) / (max - min);
  const maxPct = (dispMax - min) / (max - min);

  const mid = (min + max) / 2;
  const midLabel = currency === 'Rs' ? fmtVal(mid, currency, max) : `${currency}${Math.round(mid).toLocaleString()}`;
  const maxLabel = currency === 'Rs'
    ? fmtVal(max, currency, max)
    : `${currency}${max.toLocaleString()}+`;
  const minLabel = currency === 'Rs' ? fmtVal(min, currency, max) : `${currency}${min.toLocaleString()}`;

  return (
    <View style={styles.wrap}>
      <View style={[styles.tags, { backgroundColor: C.background }]}>
        <View style={styles.tag}>
          <Text style={[styles.tagLbl, { color: C.textSecondary }]}>Min</Text>
          <Text style={[styles.tagVal, { color: C.brinjal1 }]}>{fmtVal(dispMin, currency, max)}</Text>
        </View>
        <View style={[styles.tagDivider, { backgroundColor: C.border }]} />
        <View style={styles.tag}>
          <Text style={[styles.tagLbl, { color: C.textSecondary }]}>Max</Text>
          <Text style={[styles.tagVal, { color: C.brinjal1 }]}>
            {dispMax >= max ? maxLabel : fmtVal(dispMax, currency, max)}
          </Text>
        </View>
      </View>

      <View
        style={styles.trackContainer}
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width - THUMB_R * 2)}>
        <View style={[styles.track, { left: THUMB_R, right: THUMB_R, backgroundColor: C.border }]} />
        {trackW > 0 && (
          <>
            <View style={[styles.fill, { left: THUMB_R + minPct * trackW, width: (maxPct - minPct) * trackW, backgroundColor: C.brinjal1 }]} />
            <View style={[styles.thumb, { left: minPct * trackW, backgroundColor: C.surface, borderColor: C.brinjal1 }]} {...minPan.panHandlers}>
              <View style={[styles.thumbCore, { backgroundColor: C.brinjal1 }]} />
            </View>
            <View style={[styles.thumb, { left: maxPct * trackW, backgroundColor: C.surface, borderColor: C.brinjal1 }]} {...maxPan.panHandlers}>
              <View style={[styles.thumbCore, { backgroundColor: C.brinjal1 }]} />
            </View>
          </>
        )}
      </View>

      <View style={styles.ticks}>
        <Text style={[styles.tick, { color: C.textSecondary }]}>{minLabel}</Text>
        <Text style={[styles.tick, { color: C.textSecondary }]}>{midLabel}</Text>
        <Text style={[styles.tick, { color: C.textSecondary }]}>{maxLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  tags: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12 },
  tag: { flex: 1, alignItems: 'center', gap: 2 },
  tagLbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  tagVal: { fontSize: 20, fontWeight: '800' },
  tagDivider: { width: 1, height: 32 },
  trackContainer: { height: THUMB_R * 2 + 8, position: 'relative', justifyContent: 'center', marginHorizontal: 4 },
  track: { position: 'absolute', height: 4, borderRadius: 2, top: THUMB_R + 2 },
  fill: { position: 'absolute', height: 4, borderRadius: 2, top: THUMB_R + 2 },
  thumb: { position: 'absolute', width: THUMB_R * 2, height: THUMB_R * 2, borderRadius: THUMB_R, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  thumbCore: { width: 6, height: 6, borderRadius: 3 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { fontSize: 10, fontWeight: '500' },
});
