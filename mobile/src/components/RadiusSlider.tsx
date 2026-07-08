import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';

const THUMB_R = 13;

function valToPx(val: number, tw: number, min: number, max: number) {
  return ((val - min) / (max - min)) * tw;
}
function pxToVal(px: number, tw: number, min: number, max: number, step: number) {
  if (tw === 0) return min;
  const raw = min + Math.max(0, Math.min(px / tw, 1)) * (max - min);
  return Math.round(raw / step) * step;
}

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export function RadiusSlider({ value, onChange, min = 1, max = 100, step = 1, unit = 'km' }: Props) {
  const C = useAppColors();
  const [disp, setDisp] = useState(value);
  const [trackW, setTrackW] = useState(0);

  const dispRef  = useRef(value);
  const trackWRef = useRef(0);
  const startPx  = useRef(0);
  const dragging = useRef(false);
  const onChangeRef = useRef(onChange);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);

  dispRef.current    = disp;
  trackWRef.current   = trackW;
  onChangeRef.current = onChange;
  minRef.current      = min;
  maxRef.current      = max;
  stepRef.current     = step;

  useEffect(() => { if (!dragging.current) setDisp(value); }, [value]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: () => {
      dragging.current = true;
      startPx.current = valToPx(dispRef.current, trackWRef.current, minRef.current, maxRef.current);
    },
    onPanResponderMove: (_, g) => {
      const tw = trackWRef.current;
      const clamped = Math.max(0, Math.min(startPx.current + g.dx, tw));
      setDisp(pxToVal(clamped, tw, minRef.current, maxRef.current, stepRef.current));
    },
    onPanResponderRelease:   () => { dragging.current = false; onChangeRef.current(dispRef.current); },
    onPanResponderTerminate: () => { dragging.current = false; onChangeRef.current(dispRef.current); },
  })).current;

  const pct = (disp - min) / (max - min);

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <Text style={[styles.valueText, { color: C.brinjal1 }]}>{disp} {unit}</Text>
      </View>

      <View
        style={styles.trackContainer}
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width - THUMB_R * 2)}>
        <View style={[styles.track, { left: THUMB_R, right: THUMB_R, backgroundColor: C.border }]} />
        {trackW > 0 && (
          <>
            <View style={[styles.fill, { left: THUMB_R, width: pct * trackW, backgroundColor: C.brinjal1 }]} />
            <View style={[styles.thumb, { left: pct * trackW, backgroundColor: C.surface, borderColor: C.brinjal1 }]} {...pan.panHandlers}>
              <View style={[styles.thumbCore, { backgroundColor: C.brinjal1 }]} />
            </View>
          </>
        )}
      </View>

      <View style={styles.ticks}>
        <Text style={[styles.tick, { color: C.textSecondary }]}>{min} {unit}</Text>
        <Text style={[styles.tick, { color: C.textSecondary }]}>{max} {unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  valueRow: { alignItems: 'center' },
  valueText: { fontSize: 20, fontWeight: '800' },
  trackContainer: { height: THUMB_R * 2 + 8, position: 'relative', justifyContent: 'center', marginHorizontal: 4 },
  track: { position: 'absolute', height: 4, borderRadius: 2, top: THUMB_R + 2 },
  fill:  { position: 'absolute', height: 4, borderRadius: 2, top: THUMB_R + 2 },
  thumb: { position: 'absolute', width: THUMB_R * 2, height: THUMB_R * 2, borderRadius: THUMB_R, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  thumbCore: { width: 6, height: 6, borderRadius: 3 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { fontSize: 10, fontWeight: '500' },
});
