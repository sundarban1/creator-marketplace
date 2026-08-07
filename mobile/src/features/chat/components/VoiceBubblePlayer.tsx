import { FontAwesome5 } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { RADIUS } from '@/utilities/constants';

// Fallback bars for a message that predates attachmentWaveform, or whose
// waveform CSV failed to parse — a flat-ish shape rather than a blank row.
const FALLBACK_BARS = Array(28).fill(0.35);

type Props = {
  url: string;
  waveform?: string | null;
  durationSec: number;
  isSent: boolean;
  activeColor: string;
  mutedColor: string;
};

// expo-audio does progressive HTTP playback against a remote URL out of the
// box — no explicit "streaming mode" needed, so this satisfies "streaming
// without a full download first" for free.
export function VoiceBubblePlayer({ url, waveform, durationSec, isSent, activeColor, mutedColor }: Props) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);

  const bars = (waveform ?? '').split(',').filter(Boolean).map(Number);
  const displayBars = bars.length > 0 ? bars : FALLBACK_BARS;

  const total = status.duration || durationSec || 0;
  const position = status.currentTime ?? 0;
  const progressFraction = total > 0 ? Math.min(1, position / total) : 0;

  function togglePlayback() {
    try {
      if (status.playing) {
        player.pause();
      } else {
        if (status.didJustFinish || (total > 0 && position >= total)) player.seekTo(0);
        player.play();
      }
    } catch { /* native object not ready — nothing to play/pause */ }
  }

  // Tap-anywhere-to-seek (approximate jump, not a draggable thumb) — maps the
  // tap's x position directly to a fraction of the clip's total duration.
  function handleSeek(x: number) {
    if (!total || !trackWidth) return;
    const fraction = Math.min(1, Math.max(0, x / trackWidth));
    try { player.seekTo(fraction * total); } catch { /* not ready */ }
  }

  function handleTrackLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  const playedColor  = isSent ? '#fff' : activeColor;
  const unplayedColor = isSent ? 'rgba(255,255,255,0.4)' : mutedColor;

  return (
    <View style={s.row}>
      <Pressable
        onPress={togglePlayback}
        hitSlop={8}
        style={[s.playBtn, { backgroundColor: isSent ? 'rgba(255,255,255,0.22)' : `${activeColor}1A` }]}>
        <FontAwesome5 name={status.playing ? 'pause' : 'play'} solid size={13} color={playedColor} />
      </Pressable>
      <Pressable
        style={s.track}
        onLayout={handleTrackLayout}
        onPress={(e) => handleSeek(e.nativeEvent.locationX)}>
        {displayBars.map((lvl, i) => {
          const played = displayBars.length > 1 ? i / (displayBars.length - 1) <= progressFraction : true;
          return (
            <View
              key={i}
              style={[s.bar, { height: 3 + Math.max(0, Math.min(1, lvl)) * 20, backgroundColor: played ? playedColor : unplayedColor }]}
            />
          );
        })}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, minWidth: 190 },
  playBtn: { width: 32, height: 32, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  track:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  bar:     { width: 3, borderRadius: 2 },
});
