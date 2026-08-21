import { useState, type ReactNode } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/BottomSheet';
import { F, RADIUS } from '@/utilities/constants';
import { contractService, type ContractTerms } from '@/services/contract';

// Renders "**bold**" spans inline within a single line of text.
function renderInline(text: string, style: object, key?: number) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
  return (
    <Text key={key} style={style}>
      {parts.map((part, i) => {
        const isBold = part.startsWith('**') && part.endsWith('**');
        return (
          <Text key={i} style={isBold ? { fontFamily: F.bold } : undefined}>
            {isBold ? part.slice(2, -2) : part}
          </Text>
        );
      })}
    </Text>
  );
}

// contract.filledBody is lightweight Markdown (## headers, **bold**, "* " bullet
// lines) — this renders that subset directly rather than pulling in a full
// Markdown library for a handful of constructs.
function MarkdownBody({ text, colors: C }: { text: string; colors: ReturnType<typeof useAppColors> }) {
  const elements: ReactNode[] = [];
  text.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed === '---') return;
    if (trimmed.startsWith('## ')) {
      elements.push(<Text key={i} style={[md.h2, { color: C.text }]}>{trimmed.slice(3)}</Text>);
      return;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(<Text key={i} style={[md.h1, { color: C.text }]}>{trimmed.slice(2)}</Text>);
      return;
    }
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <View key={i} style={md.bulletRow}>
          <Text style={[md.bulletDot, { color: C.text }]}>{'•'}</Text>
          {renderInline(trimmed.slice(2), [md.paragraph, { color: C.text, flex: 1 }])}
        </View>
      );
      return;
    }
    elements.push(renderInline(trimmed, [md.paragraph, { color: C.text }], i));
  });
  return <View>{elements}</View>;
}

const md = StyleSheet.create({
  h1:        { fontSize: 16, fontFamily: F.extrabold, marginTop: 14, marginBottom: 4 },
  h2:        { fontSize: 14, fontFamily: F.bold, marginTop: 12, marginBottom: 4 },
  paragraph: { fontSize: 13, fontFamily: F.regular, lineHeight: 20, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', gap: 8, paddingLeft: 2, marginBottom: 4 },
  bulletDot: { fontSize: 13, lineHeight: 20 },
});

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  filledBody: string;
  terms: ContractTerms;
  // Present only once the contract is persisted (i.e. not the creator's
  // pre-submit preview) — gates the "Download PDF" button.
  contractId?: string;
  agreeLabel: string;
  agreeing: boolean;
  onAgree: () => void;
  onClose: () => void;
};

function fmtDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Terms card + markdown body + optional PDF download — the read-only core of
// a contract, extracted so it can be shown both inside ContractModal's
// one-time "review & sign" sheet and, unchanged, in the Collaboration
// screen's persistent Agreement tab (§52) once already signed.
export function ContractBody({ filledBody, terms, contractId, downloadTitle }: {
  filledBody: string; terms: ContractTerms; contractId?: string; downloadTitle?: string;
}) {
  const C = useAppColors();
  const [downloading, setDownloading] = useState(false);

  const rows: [string, string][] = [
    ...(terms.role ? ([['Role', terms.role]] as [string, string][]) : []),
    ['Price', terms.price],
    ['Deadline', fmtDate(terms.deadline)],
    ['Timeline', terms.timeline],
    ['Deliverables', terms.deliverables],
  ];

  async function handleDownload() {
    if (!contractId || downloading) return;
    setDownloading(true);
    try {
      const url = await contractService.getContractPdfUrl(contractId);
      const filename = `${(downloadTitle ?? 'contract').replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      const dest = `${FileSystem.cacheDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Downloaded', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Download failed', 'Could not download the contract PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={[s.termsCard, { backgroundColor: C.background, borderColor: C.border }]}>
        {rows.map(([label, value], i) => (
          <View key={label} style={[s.termRow, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <Text style={[s.termLabel, { color: C.textSecondary }]}>{label}</Text>
            <Text style={[s.termValue, { color: C.text }]} numberOfLines={3}>{value}</Text>
          </View>
        ))}
      </View>

      <MarkdownBody text={filledBody} colors={C} />

      {contractId && (
        <Pressable
          style={[s.pdfBtn, { borderColor: C.brinjal1, opacity: downloading ? 0.6 : 1 }]}
          onPress={handleDownload}
          disabled={downloading}>
          {downloading
            ? <ActivityIndicator size="small" color={C.brinjal1} />
            : <FontAwesome5 name="download" solid size={16} color={C.brinjal1} />}
          <Text style={[s.pdfBtnText, { color: C.brinjal1 }]}>{downloading ? 'Preparing PDF…' : 'Download Contract'}</Text>
        </Pressable>
      )}
    </View>
  );
}

// Full-screen "review & sign" modal for a contract — shown when a creator
// submits a proposal (preview, no contractId yet) and again when a business
// accepts one (persisted contract, PDF available). Modeled on FilterSheet's
// bottom-sheet shell (backdrop + handle + scroll body + sticky footer).
export function ContractModal({ visible, title, subtitle, filledBody, terms, contractId, agreeLabel, agreeing, onAgree, onClose }: Props) {
  const C = useAppColors();
  const [agreed, setAgreed] = useState(false);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      centerTitle
      maxHeightPct={0.9}
      dismissOnBackdropPress={!agreeing}
      contentContainerStyle={s.body}
      footer={
        <View style={{ gap: 14 }}>
          <Pressable style={s.agreeRow} onPress={() => setAgreed((v) => !v)} disabled={agreeing}>
            <View style={[s.checkbox, { borderColor: agreed ? C.brinjal1 : C.border, backgroundColor: agreed ? C.brinjal1 : 'transparent' }]}>
              {agreed && <FontAwesome5 name="check" solid size={13} color="#fff" />}
            </View>
            <Text style={[s.agreeText, { color: C.text }]}>I have read and agree to the terms above</Text>
          </Pressable>

          <Pressable
            style={[s.agreeBtn, { backgroundColor: (!agreed || agreeing) ? C.border : C.brinjal1 }]}
            onPress={onAgree}
            disabled={!agreed || agreeing}>
            {agreeing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.agreeBtnText}>{agreeLabel}</Text>}
          </Pressable>
        </View>
      }>
        <ContractBody filledBody={filledBody} terms={terms} contractId={contractId} downloadTitle={title} />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  body:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 16 },
  termsCard: { borderWidth: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  termRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  termLabel: { fontSize: 13, fontFamily: F.medium, flexShrink: 0 },
  termValue: { fontSize: 13, fontFamily: F.semibold, flex: 1, textAlign: 'right' },
  pdfBtn:    { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9 },
  pdfBtnText:{ fontSize: 13, fontFamily: F.semibold },
  agreeRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox:  { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  agreeText: { fontSize: 13, fontFamily: F.medium, flex: 1 },
  agreeBtn:  { height: 52, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  agreeBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
});
