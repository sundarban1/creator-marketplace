import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import type { ApiPortfolioItem } from '@/services/portfolio';
import { RADIUS } from '@/utilities/constants';
import { detectLinkPlatform, linkThumbnailUrl } from '@/utilities/portfolioLink';

type ThumbItem = Pick<ApiPortfolioItem, 'mediaUrl' | 'mediaType' | 'externalUrl'>;

// Generated frames, keyed by video URL — shared across every tile on screen so
// scrolling back or opening another profile doesn't re-decode the same video.
const videoFrameCache = new Map<string, string | null>();
const videoFrameInflight = new Map<string, Promise<string | null>>();

function videoFrame(url: string): Promise<string | null> {
  if (videoFrameCache.has(url)) return Promise.resolve(videoFrameCache.get(url)!);
  let p = videoFrameInflight.get(url);
  if (!p) {
    p = VideoThumbnails.getThumbnailAsync(url, { time: 500, quality: 0.6 })
      .then((r) => r.uri)
      .catch(() => null)
      .then((uri) => {
        videoFrameCache.set(url, uri);
        videoFrameInflight.delete(url);
        return uri;
      });
    videoFrameInflight.set(url, p);
  }
  return p;
}

/** First-frame still for an uploaded video (null while generating or if the platform can't decode it). */
function useVideoFrame(url: string | null): string | null {
  // Keyed by URL so a recycled tile never shows the previous video's frame.
  const [frame, setFrame] = useState<{ url: string; uri: string | null } | null>(null);
  useEffect(() => {
    if (!url) return;
    let alive = true;
    videoFrame(url).then((uri) => { if (alive) setFrame({ url, uri }); });
    return () => { alive = false; };
  }, [url]);
  if (!url) return null;
  return frame?.url === url ? frame.uri : videoFrameCache.get(url) ?? null;
}

type TFn = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Display title for a portfolio item: the creator's own text first, then the
 * link's platform ("Instagram video"), then a generic "Video link" for an
 * unknown host — only an item with neither text nor link reads "Untitled".
 */
export function portfolioItemTitle(item: ApiPortfolioItem, t: TFn): string {
  const own = item.description?.trim() || item.title?.trim();
  if (own) return own;
  if (item.externalUrl && !item.mediaUrl) {
    const p = detectLinkPlatform(item.externalUrl);
    return p.label ? t('portfolioScreen.platformVideo', { platform: p.label }) : t('portfolioScreen.videoLink');
  }
  return t('portfolioScreen.untitled');
}

/**
 * Square-ish portfolio thumbnail. Uploaded photos render as-is, uploaded
 * videos show a generated first-frame still; a link-only
 * item renders the platform's brand tile (or a YouTube preview frame), with
 * an unknown host falling back to a video icon. Any item carrying a known
 * platform link also gets a small brand badge in the corner.
 */
export function PortfolioThumb({
  item,
  style,
  iconSize = 22,
  badgeSize = 22,
}: {
  item: ThumbItem;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  badgeSize?: number;
}) {
  const C = useAppColors();
  const { isDark } = useIsDark();
  const platform = item.externalUrl ? detectLinkPlatform(item.externalUrl) : null;
  const linkThumb = !item.mediaUrl ? linkThumbnailUrl(item.externalUrl) : null;
  const uploadedVideo = item.mediaType === 'VIDEO' && item.mediaUrl ? item.mediaUrl : null;
  const videoStill = useVideoFrame(uploadedVideo);
  // An uploaded video's URL isn't an image — show its generated frame (or a placeholder until ready).
  const imageUri = uploadedVideo ? videoStill : (item.mediaUrl ?? linkThumb);
  // TikTok's near-black tile melts into dark surfaces — outline it.
  const outline = isDark && platform?.key === 'tiktok';
  const isVideo = item.mediaType === 'VIDEO' || (!item.mediaUrl && !!item.externalUrl);

  return (
    <View style={[styles.base, style]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : uploadedVideo ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: '#111827' }]}>
          <FontAwesome5 name="play" solid size={iconSize} color="#fff" style={{ marginLeft: 3 }} />
        </View>
      ) : platform?.brand ? (
        <View
          style={[
            StyleSheet.absoluteFill, styles.center, { backgroundColor: platform.color },
            outline && { borderWidth: 1, borderColor: C.borderDark, borderRadius: RADIUS.md },
          ]}>
          <FontAwesome5 name={platform.icon as any} brand size={iconSize + 8} color="#fff" />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: C.primaryLight }]}>
          <FontAwesome5 name={item.externalUrl ? 'video' : 'image'} solid size={iconSize} color={C.brinjal1} />
        </View>
      )}

      {/* Centre play glyph over a picture that plays (bare icon tiles already read as video). */}
      {isVideo && imageUri && (
        <View style={[styles.center, StyleSheet.absoluteFill]} pointerEvents="none">
          <View style={[styles.play, { width: badgeSize + 8, height: badgeSize + 8, borderRadius: (badgeSize + 8) / 2 }]}>
            <FontAwesome5 name="play" solid size={Math.round(badgeSize / 2.2)} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      )}

      {/* Brand badge whenever the tile itself isn't already the brand tile. */}
      {platform?.brand && imageUri && (
        <View
          pointerEvents="none"
          style={[
            styles.badge,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: platform.color },
          ]}>
          <FontAwesome5 name={platform.icon as any} brand size={Math.round(badgeSize * 0.55)} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base:   { overflow: 'hidden' },
  center: { justifyContent: 'center', alignItems: 'center' },
  play:   { backgroundColor: 'rgba(17,24,39,0.6)', justifyContent: 'center', alignItems: 'center' },
  badge:  {
    position: 'absolute', top: 6, left: 6, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
});
