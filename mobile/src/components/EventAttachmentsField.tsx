import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import type { CampaignAttachment } from '@/services/guidedCampaign';
import type { PickedFile } from '@/utilities/chatAttachments';
import {
  MAX_ATTACHMENT_IMAGES, MAX_ATTACHMENT_PDFS, downloadAndShareAttachment, isPdfAttachment,
  pickAttachmentImages, pickAttachmentPdfs, promptAttachmentSource, takeAttachmentPhoto, type AttachmentChoice,
} from '@/utilities/eventAttachments';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { F, RADIUS, SPACING, lineHeightFor } from '@/utilities/constants';

// Reference images (max 3) and PDFs (max 2) on an event — brief.attachments.
// Edit mode uploads each file the moment it's picked (per-tile progress bar,
// cancel/remove, retry) and only reports finished uploads through onChange.
// View mode is the read-only grid for campaign-detail, with download. Every
// uploaded tile opens the full-screen image / PDF preview modal.

type Pending = { id: string; file: PickedFile; progress: number; error?: string; controller: AbortController };

const COLS = 3;
const GAP = 10;

type Props =
  | { mode: 'edit'; value: CampaignAttachment[]; onChange: (next: CampaignAttachment[]) => void; onBusyChange?: (busy: boolean) => void }
  | { mode: 'view'; value: CampaignAttachment[] };

export function EventAttachmentsField(props: Props) {
  const { value, mode } = props;
  const C = useAppColors();
  const { t } = useLanguage();
  const [pending, setPending] = useState<Pending[]>([]);
  const [tileSize, setTileSize] = useState(0);
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [pdf, setPdf] = useState<CampaignAttachment | null>(null);
  // Not-yet-uploaded image, previewed from its local file.
  const [localPreview, setLocalPreview] = useState<{ uri: string; name: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Several uploads can finish back-to-back — always append to the latest list.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);
  const seqRef = useRef(0);

  const onChange = mode === 'edit' ? props.onChange : undefined;
  const onBusyChange = mode === 'edit' ? props.onBusyChange : undefined;
  const busy = pending.some((p) => !p.error);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  // Abort anything still in flight when the screen goes away.
  const pendingRef = useRef(pending);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => () => pendingRef.current.forEach((p) => p.controller.abort()), []);

  const pdfCount = value.filter(isPdfAttachment).length + pending.filter((p) => p.file.fileType === 'document').length;
  const imageCount = value.length + pending.length - pdfCount;
  const imageRoom = MAX_ATTACHMENT_IMAGES - imageCount;
  const pdfRoom = MAX_ATTACHMENT_PDFS - pdfCount;

  const images = value.filter((a) => !isPdfAttachment(a));

  function patch(id: string, p: Partial<Pending>) {
    setPending((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  async function upload(item: Pending) {
    patch(item.id, { progress: 0, error: undefined });
    try {
      const att = await campaignService.uploadCampaignAttachment(item.file, item.controller.signal, (f) => patch(item.id, { progress: Math.min(f, 0.98) }));
      const next = [...valueRef.current, att];
      valueRef.current = next;
      onChange?.(next);
      setPending((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      patch(item.id, { error: err instanceof Error ? err.message : t('eventAttachments.failed') });
    }
  }

  function retry(item: Pending) {
    const fresh = { ...item, controller: new AbortController() };
    setPending((prev) => prev.map((x) => (x.id === item.id ? fresh : x)));
    void upload(fresh);
  }

  async function add() {
    if (imageRoom <= 0 && pdfRoom <= 0) return;
    const options: { choice: AttachmentChoice; label: string }[] = [];
    if (imageRoom > 0) {
      options.push({ choice: 'photo-library', label: t('eventAttachments.choosePhotos') });
      options.push({ choice: 'photo-camera', label: t('eventAttachments.takePhoto') });
    }
    if (pdfRoom > 0) options.push({ choice: 'pdf', label: t('eventAttachments.choosePdf') });
    const choice = await promptAttachmentSource(options, t('eventAttachments.addTitle'), t('eventAttachments.cancel'));
    if (!choice) return;

    const res = choice === 'pdf' ? await pickAttachmentPdfs(pdfRoom)
      : choice === 'photo-camera' ? await takeAttachmentPhoto()
      : await pickAttachmentImages(imageRoom);
    if (res.tooLarge) {
      Alert.alert(t('eventAttachments.tooLargeTitle'), choice === 'pdf' ? t('eventAttachments.pdfTooLarge') : t('eventAttachments.imageTooLarge'));
    }
    if (!res.files.length) return;
    const items: Pending[] = res.files.map((file) => ({ id: `p${++seqRef.current}`, file, progress: 0, controller: new AbortController() }));
    setPending((prev) => [...prev, ...items]);
    items.forEach((p) => void upload(p));
  }

  function removeUploaded(a: CampaignAttachment) {
    const next = valueRef.current.filter((x) => x !== a);
    valueRef.current = next;
    onChange?.(next);
  }

  // Removing is a tap away from the tile — confirm first so a stray tap
  // doesn't drop a file the business meant to keep.
  function confirmRemove(name: string, onConfirm: () => void) {
    Alert.alert(t('eventAttachments.removeTitle'), t('eventAttachments.removeConfirm', { name }), [
      { text: t('eventAttachments.cancel'), style: 'cancel' },
      { text: t('eventAttachments.removeAction'), style: 'destructive', onPress: onConfirm },
    ]);
  }

  function removePending(p: Pending) {
    p.controller.abort();
    setPending((prev) => prev.filter((x) => x.id !== p.id));
  }

  function open(a: CampaignAttachment) {
    if (isPdfAttachment(a)) setPdf(a);
    else setImageIndex(Math.max(0, images.indexOf(a)));
  }

  async function download(a: CampaignAttachment) {
    setDownloading(a.url);
    try {
      await downloadAndShareAttachment(a.url, a.name);
    } catch {
      Alert.alert(t('eventAttachments.downloadFailedTitle'), t('eventAttachments.downloadFailed'));
    } finally {
      setDownloading(null);
    }
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setTileSize(Math.floor((w - GAP * (COLS - 1)) / COLS));
  };

  if (mode === 'view' && value.length === 0) return null;

  const tile = { width: tileSize, height: tileSize };
  const canAdd = mode === 'edit' && (imageRoom > 0 || pdfRoom > 0);

  return (
    <View>
      {mode === 'edit' && (
        <>
          <View style={st.headRow}>
            <FontAwesome5 name="paperclip" size={13} color={C.brinjal1} />
            <Text style={[st.heading, { color: C.text }]}>
              {t('eventAttachments.title')} <Text style={{ color: C.textPlaceholder, fontFamily: F.regular }}>({t('eventAttachments.optional')})</Text>
            </Text>
          </View>
          <Text style={[st.hint, { color: C.textPlaceholder }]}>
            {t('eventAttachments.hint', { maxImages: MAX_ATTACHMENT_IMAGES, maxPdfs: MAX_ATTACHMENT_PDFS })}
          </Text>
          {(value.length > 0 || pending.length > 0) && (
            <Text style={[st.hint, { color: C.textPlaceholder, marginTop: 2 }]}>
              {t('eventAttachments.count', { images: imageCount, maxImages: MAX_ATTACHMENT_IMAGES, pdfs: pdfCount, maxPdfs: MAX_ATTACHMENT_PDFS })}
            </Text>
          )}
        </>
      )}

      <View style={[st.grid, mode === 'edit' && { marginTop: SPACING.md }]} onLayout={onLayout}>
        {tileSize > 0 && value.map((a, i) => {
          const isPdf = isPdfAttachment(a);
          return (
            <View key={`${a.url}-${i}`} style={{ width: tileSize }}>
              <Pressable
                onPress={() => open(a)}
                accessibilityRole="button"
                accessibilityLabel={t('eventAttachments.previewA11y', { name: a.name })}
                style={[st.tile, tile, { borderColor: C.border, backgroundColor: C.surface }]}>
                {isPdf ? <PdfFace color={C.brinjal1} bg={C.primaryLight} /> : <Image source={{ uri: a.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}
              </Pressable>
              {mode === 'edit' ? (
                <CornerButton icon="times" onPress={() => confirmRemove(a.name, () => removeUploaded(a))} label={t('eventAttachments.removeA11y', { name: a.name })} />
              ) : (
                <CornerButton
                  icon="download"
                  busy={downloading === a.url}
                  onPress={() => void download(a)}
                  label={t('eventAttachments.downloadA11y', { name: a.name })}
                />
              )}
              <Text style={[st.name, { color: C.text }]} numberOfLines={1}>{a.name}</Text>
              {!!a.sizeBytes && <Text style={[st.meta, { color: C.textPlaceholder }]}>{fmtSize(a.sizeBytes)}</Text>}
            </View>
          );
        })}

        {tileSize > 0 && pending.map((p) => {
          const isPdf = p.file.fileType === 'document';
          return (
            <View key={p.id} style={{ width: tileSize }}>
              <Pressable
                onPress={() => (isPdf ? Alert.alert(t('eventAttachments.previewAfterUpload')) : setLocalPreview({ uri: p.file.uri, name: p.file.name }))}
                style={[st.tile, tile, { borderColor: p.error ? C.error : C.border, backgroundColor: C.surface }]}>
                {isPdf ? <PdfFace color={C.brinjal1} bg={C.primaryLight} /> : <Image source={{ uri: p.file.uri }} style={[StyleSheet.absoluteFill, { opacity: p.error ? 0.4 : 0.6 }]} contentFit="cover" />}
                {!p.error && (
                  <View style={st.progressTrack}>
                    <View style={[st.progressFill, { width: `${Math.round(p.progress * 100)}%` }]} />
                  </View>
                )}
                {p.error && (
                  <Pressable onPress={() => retry(p)} style={[st.retry, { backgroundColor: C.surface }]} hitSlop={6}>
                    <FontAwesome5 name="redo" size={10} color={C.text} />
                    <Text style={[st.retryTxt, { color: C.text }]}>{t('eventAttachments.retry')}</Text>
                  </Pressable>
                )}
              </Pressable>
              <CornerButton icon="times" onPress={() => confirmRemove(p.file.name, () => removePending(p))} label={t('eventAttachments.removeA11y', { name: p.file.name })} />
              <Text style={[st.name, { color: C.text }]} numberOfLines={1}>{p.file.name}</Text>
              <Text style={[st.meta, { color: p.error ? C.error : C.textPlaceholder }]} numberOfLines={1}>
                {p.error ? t('eventAttachments.failed') : t('eventAttachments.uploadingPct', { pct: Math.round(p.progress * 100) })}
              </Text>
            </View>
          );
        })}

        {tileSize > 0 && canAdd && (
          <Pressable
            onPress={() => void add()}
            accessibilityRole="button"
            accessibilityLabel={t('eventAttachments.add')}
            style={[st.tile, tile, st.addTile, { borderColor: C.brinjal1, backgroundColor: C.primaryLight }]}>
            <FontAwesome5 name="plus" size={18} color={C.brinjal1} />
            <Text style={[st.addTxt, { color: C.brinjal1 }]}>{t('eventAttachments.add')}</Text>
          </Pressable>
        )}
      </View>

      <ImagePreviewModal
        visible={imageIndex !== null || localPreview !== null}
        url={localPreview?.uri ?? images[imageIndex ?? 0]?.url ?? null}
        title={localPreview?.name ?? images[imageIndex ?? 0]?.name ?? ''}
        items={localPreview ? undefined : images.map((a) => ({ url: a.url, label: a.name }))}
        index={imageIndex ?? 0}
        onIndexChange={setImageIndex}
        onClose={() => { setImageIndex(null); setLocalPreview(null); }}
      />
      <DocumentPreviewModal visible={!!pdf} url={pdf?.url ?? null} title={pdf?.name ?? ''} onClose={() => setPdf(null)} />
    </View>
  );

}

function PdfFace({ color, bg }: { color: string; bg: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, st.pdfFace, { backgroundColor: bg }]}>
      <FontAwesome5 name="file-pdf" size={26} color={color} />
      <Text style={[st.pdfBadge, { color }]}>PDF</Text>
    </View>
  );
}

function CornerButton({ icon, onPress, label, busy }: { icon: string; onPress: () => void; label: string; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={st.corner}>
      {busy ? <ActivityIndicator size="small" color="#fff" /> : <FontAwesome5 name={icon} solid size={11} color="#fff" />}
    </Pressable>
  );
}

function fmtSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const st = StyleSheet.create({
  headRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heading:  { fontSize: 15, fontFamily: F.bold, lineHeight: lineHeightFor(15) },
  hint:     { fontSize: 12, fontFamily: F.regular, lineHeight: lineHeightFor(12), marginTop: 4 },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile:     { borderRadius: RADIUS.sm, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  addTile:  { borderStyle: 'dashed', borderWidth: 1.5, gap: 6 },
  addTxt:   { fontSize: 12, fontFamily: F.semibold, lineHeight: lineHeightFor(12), textAlign: 'center', paddingHorizontal: 6 },
  pdfFace:  { alignItems: 'center', justifyContent: 'center', gap: 6 },
  pdfBadge: { fontSize: 11, fontFamily: F.extrabold, letterSpacing: 0.5 },
  name:     { fontSize: 12, fontFamily: F.medium, lineHeight: lineHeightFor(12), marginTop: 4 },
  meta:     { fontSize: 11, fontFamily: F.regular, lineHeight: lineHeightFor(11) },
  corner:   { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  progressTrack: { position: 'absolute', left: 8, right: 8, bottom: 8, height: 7, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.45)', padding: 2 },
  progressFill:  { height: '100%', borderRadius: RADIUS.full, backgroundColor: '#fff' },
  retry:    { position: 'absolute', bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  retryTxt: { fontSize: 11, fontFamily: F.semibold },
});
