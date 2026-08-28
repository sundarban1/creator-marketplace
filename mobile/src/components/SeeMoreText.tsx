import { useState } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F } from '@/utilities/constants';

// Free-form text (bio, review comment, description…) that collapses to the
// first `threshold` characters with an inline "See more" / "See less" toggle.
// Below the threshold it renders as a plain <Text> with no toggle.
export function SeeMoreText({
  children,
  style,
  threshold = 150,
  linkColor,
  numberOfLines,
}: {
  children?: string | null;
  style?: StyleProp<TextStyle>;
  threshold?: number;
  /** Toggle colour — defaults to the role primary (brinjal / green). */
  linkColor?: string;
  /** Optional line clamp applied only while collapsed. */
  numberOfLines?: number;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const text = (children ?? '').trim();
  if (!text) return null;

  const isLong = text.length > threshold;
  const link = linkColor ?? C.brinjal1;

  if (!isLong) {
    return <Text style={style}>{text}</Text>;
  }

  const shown = expanded ? text : `${text.slice(0, threshold).trimEnd()}… `;

  return (
    <Text style={style} numberOfLines={expanded ? undefined : numberOfLines}>
      {shown}
      <Text
        style={[sm.link, { color: link }]}
        onPress={() => setExpanded((v) => !v)}
        suppressHighlighting>
        {expanded ? `  ${t('common.seeLess')}` : t('common.seeMore')}
      </Text>
    </Text>
  );
}

const sm = StyleSheet.create({
  link: { fontFamily: F.semibold },
});
