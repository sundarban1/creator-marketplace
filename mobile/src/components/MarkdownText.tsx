import { Linking, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F, lineHeightFor } from '@/utilities/constants';

/**
 * Read-only renderer for the Markdown the web rich-text editor writes
 * (web/src/app/ui/RichTextEditor.tsx → MarkdownText.tsx): paragraphs, `###`
 * headings, **bold**, *italic*, bullet / numbered lists and [links](url).
 * Plain text without any markup renders as-is, so older content still works.
 */

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] };

const UL = /^\s*[-*+]\s+/;
const OL = /^\s*\d+[.)]\s+/;
const H = /^#{1,6}\s+/;

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ kind: 'p', text: para.join('\n') }); para = []; } };
  for (const line of src.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim()) { flush(); continue; }
    if (H.test(line)) { flush(); blocks.push({ kind: 'h', text: line.replace(H, '') }); continue; }
    const listKind = UL.test(line) ? 'ul' : OL.test(line) ? 'ol' : null;
    if (listKind) {
      flush();
      const text = line.replace(listKind === 'ul' ? UL : OL, '');
      const last = blocks[blocks.length - 1];
      if (last && last.kind === listKind) last.items.push(text);
      else blocks.push({ kind: listKind, items: [text] });
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

const INLINE_SRC = String.raw`(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|\[([^\]]+)\]\(([^)\s]+)\)`;
const unescape = (s: string) => s.replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1');

function Inline({ text, linkColor }: { text: string; linkColor: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  // Fresh regex per render — a shared /g regex carries lastIndex state between calls.
  const re = new RegExp(INLINE_SRC, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(unescape(text.slice(last, m.index)));
    const key = `${m.index}`;
    if (m[2] != null) out.push(<Text key={key} style={{ fontFamily: F.semibold }}>{unescape(m[2])}</Text>);
    else if (m[4] != null) out.push(<Text key={key} style={{ fontStyle: 'italic' }}>{unescape(m[4])}</Text>);
    else if (m[5] != null) {
      const url = m[6];
      out.push(
        <Text key={key} style={{ color: linkColor, textDecorationLine: 'underline', fontFamily: F.medium }}
          onPress={() => { if (/^https?:\/\//i.test(url)) void Linking.openURL(url); }}
          accessibilityRole="link">
          {unescape(m[5])}
        </Text>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(unescape(text.slice(last)));
  return <>{out}</>;
}

export function MarkdownText({ children, style }: { children: string | null | undefined; style?: StyleProp<TextStyle> }) {
  const C = useAppColors();
  if (!children?.trim()) return null;
  const base = [styles.body, { color: C.text }, style];
  return (
    <View style={styles.wrap}>
      {parseBlocks(children).map((b, i) => {
        if (b.kind === 'h') return <Text key={i} style={[base, styles.heading]}><Inline text={b.text} linkColor={C.brinjal1} /></Text>;
        if (b.kind === 'p') return <Text key={i} style={base}><Inline text={b.text} linkColor={C.brinjal1} /></Text>;
        return (
          <View key={i} style={styles.list}>
            {b.items.map((item, j) => (
              <View key={j} style={styles.li}>
                <Text style={[base, styles.marker]}>{b.kind === 'ul' ? '•' : `${j + 1}.`}</Text>
                <Text style={[base, { flex: 1 }]}><Inline text={item} linkColor={C.brinjal1} /></Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { gap: 8 },
  body:    { fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.regular },
  heading: { fontSize: 15, lineHeight: lineHeightFor(15), fontFamily: F.semibold, marginTop: 4 },
  list:    { gap: 4 },
  li:      { flexDirection: 'row', gap: 6 },
  marker:  { minWidth: 14 },
});
