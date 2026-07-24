import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { BUDGET_TIERS, DELIVERABLE_TYPES } from '../constants/campaignForm';

// Shared building blocks for the campaign create + edit forms — keeping these in
// one place is what makes "edit" actually look/behave like "create" instead of
// drifting the next time either screen's styling changes.

const ERROR_RED = '#EF4444';

// ─── SectionCard ──────────────────────────────────────────────────────────────

export function SectionCard({ title, sub, children, colors }: {
  title?: string; sub?: string; children: React.ReactNode; colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  return (
    <View style={[sc.card, { backgroundColor: C.surface }]}>
      {title && <Text style={[sc.title, { color: C.text }]}>{title}</Text>}
      {sub && <Text style={[sc.sub, { color: C.textSecondary }]}>{sub}</Text>}
      {children}
    </View>
  );
}

// Exported so consumers that need a bespoke header layout (e.g. a title row with
// an inline action button) can still match SectionCard's title/sub typography.
export const sc = StyleSheet.create({
  card:  { borderRadius: RADIUS.lg, padding: 16, gap: 10, ...SHADOW.card },
  title: { fontSize: 14, fontFamily: F.bold },
  sub:   { fontSize: 12, lineHeight: 18, fontFamily: F.regular },
});

// ─── ChipGroup (single select) ────────────────────────────────────────────────

export function ChipGroup({
  options, value, onChange, colors, error, disabled,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
  disabled?: boolean;
}) {
  const C = colors;
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = value === opt;
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={opt}
              disabled={disabled}
              style={[cg.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.surface, opacity: disabled && !sel ? 0.4 : 1 }]}
              onPress={() => onChange(opt)}>
              <Text style={[cg.chipText, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={cg.error}>{error}</Text>}
    </View>
  );
}

// ─── ChipMultiGroup (multi-select, "Any Creator" exclusive) ───────────────────

export function ChipMultiGroup({
  values, onChange, options, colors, error, disabled,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  colors: ReturnType<typeof useAppColors>;
  error?: string;
  disabled?: boolean;
}) {
  const C = colors;
  function toggle(opt: string) {
    if (disabled) return;
    if (opt === 'Any Creator') { onChange(['Any Creator']); return; }
    const next = values.filter((v) => v !== 'Any Creator');
    if (next.includes(opt)) onChange(next.filter((v) => v !== opt));
    else onChange([...next, opt]);
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = values.includes(opt);
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={opt}
              disabled={disabled}
              style={[cg.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.surface, opacity: disabled && !sel ? 0.4 : 1 }]}
              onPress={() => toggle(opt)}>
              <Text style={[cg.chipText, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={cg.error}>{error}</Text>}
    </View>
  );
}

// ─── PlatformChipGroup (multi-select, capped) ──────────────────────────────────

export function PlatformChipGroup({
  options, values, onChange, colors, error, max, disabled,
}: {
  options: readonly string[];
  values: string[];
  onChange: (v: string[]) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
  max: number;
  disabled?: boolean;
}) {
  const C = colors;
  function toggle(opt: string) {
    if (disabled) return;
    if (values.includes(opt)) { onChange(values.filter((v) => v !== opt)); return; }
    if (values.length >= max) return;
    onChange([...values, opt]);
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = values.includes(opt);
          const chipDisabled = disabled || (!sel && values.length >= max);
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={opt}
              disabled={chipDisabled}
              style={[cg.chip, {
                borderColor: sel ? C.brinjal1 : C.border,
                backgroundColor: sel ? C.primaryLight : C.surface,
                opacity: chipDisabled ? 0.4 : 1,
              }]}
              onPress={() => toggle(opt)}>
              <Text style={[cg.chipText, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={cg.error}>{error}</Text>}
    </View>
  );
}

// Exported so consumers with bespoke chip-selection logic (e.g. a checked-state
// grid that isn't a plain single/multi-select) can still reuse the chip look.
export const cg = StyleSheet.create({
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: F.medium },
  error:    { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },
});

// ─── BudgetTierPicker ───────────────────────────────────────────────────────

export function BudgetTierPicker({
  budgetMin, budgetMax, onChange, colors, error, disabled,
}: {
  budgetMin: number;
  budgetMax: number;
  onChange: (min: number, max: number) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
  disabled?: boolean;
}) {
  const C = colors;
  const { t } = useLanguage();
  const matchedTier = BUDGET_TIERS.find((tier) => tier.min === budgetMin && tier.max === budgetMax);
  const [customForced, setCustomForced] = useState(false);
  const isCustom = customForced || !matchedTier;

  const TIER_COPY: Record<(typeof BUDGET_TIERS)[number]['key'], { label: string; range: string }> = {
    SMALL:  { label: t('createEvent.budgetTierSmallLabel'),  range: t('createEvent.budgetTierSmallRange') },
    MEDIUM: { label: t('createEvent.budgetTierMediumLabel'), range: t('createEvent.budgetTierMediumRange') },
    LARGE:  { label: t('createEvent.budgetTierLargeLabel'),  range: t('createEvent.budgetTierLargeRange') },
  };

  return (
    <View style={{ gap: 10, opacity: disabled ? 0.6 : 1 }}>
      <View style={bt.grid}>
        {BUDGET_TIERS.map((tier) => {
          const sel = !isCustom && matchedTier?.key === tier.key;
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={tier.key}
              disabled={disabled}
              style={[bt.card, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.surface }]}
              onPress={() => { setCustomForced(false); onChange(tier.min, tier.max); }}>
              <Text style={[bt.cardLabel, { color: sel ? C.brinjal1 : C.text }]}>{TIER_COPY[tier.key].label}</Text>
              <Text style={[bt.cardRange, { color: sel ? C.brinjal1 : C.textSecondary }]}>{TIER_COPY[tier.key].range}</Text>
            </Pressable>
          );
        })}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          disabled={disabled}
          style={[bt.cardFull, { borderColor: isCustom ? C.brinjal1 : C.border, backgroundColor: isCustom ? C.primaryLight : C.surface }]}
          onPress={() => setCustomForced(true)}>
          <Ionicons name="create-outline" size={16} color={isCustom ? C.brinjal1 : C.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={[bt.cardLabel, { color: isCustom ? C.brinjal1 : C.text }]}>{t('createEvent.budgetTierCustomLabel')}</Text>
            <Text style={[bt.cardRange, { color: isCustom ? C.brinjal1 : C.textSecondary }]}>{t('createEvent.budgetTierCustomSub')}</Text>
          </View>
        </Pressable>
      </View>

      {isCustom && (
        <View style={bt.budgetRow}>
          <View style={bt.budgetInputWrap}>
            <Text style={[bt.budgetLabel, { color: C.textSecondary }]}>{t('createEvent.aiBudgetMinLabel')}</Text>
            <TextInput
              style={[bt.input, { backgroundColor: C.background, borderColor: error ? ERROR_RED : C.border, color: C.text }]}
              value={String(budgetMin)}
              onChangeText={(v) => onChange(parseInt(v.replace(/[^0-9]/g, ''), 10) || 0, budgetMax)}
              keyboardType="number-pad"
              editable={!disabled}
            />
          </View>
          <View style={bt.budgetInputWrap}>
            <Text style={[bt.budgetLabel, { color: C.textSecondary }]}>{t('createEvent.aiBudgetMaxLabel')}</Text>
            <TextInput
              style={[bt.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
              value={String(budgetMax)}
              onChangeText={(v) => onChange(budgetMin, parseInt(v.replace(/[^0-9]/g, ''), 10) || 0)}
              keyboardType="number-pad"
              editable={!disabled}
            />
          </View>
        </View>
      )}
      {error && <Text style={bt.errorText}>{error}</Text>}
    </View>
  );
}

const bt = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card:      { width: '31%', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 12, alignItems: 'center', gap: 2 },
  cardLabel: { fontSize: 13, fontFamily: F.semibold },
  cardRange: { fontSize: 10, fontFamily: F.regular, textAlign: 'center' },
  cardFull:  { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12 },
  budgetRow:    { flexDirection: 'row', gap: 10 },
  budgetInputWrap: { flex: 1, gap: 4 },
  budgetLabel:  { fontSize: 11, fontFamily: F.medium },
  input:     { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  errorText: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },
});

// ─── Stepper ─────────────────────────────────────────────────────────────────

export function Stepper({ value, onChange, min = 1, max = 50, colors }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const { t } = useLanguage();
  return (
    <View style={[st.wrap, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[st.btn, { backgroundColor: value <= min ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Text style={[st.btnTxt, { color: value <= min ? C.border : C.brinjal1 }]}>−</Text>
      </Pressable>
      <View style={st.center}>
        <Text style={[st.value, { color: C.brinjal1 }]}>{value}</Text>
        <Text style={[st.unit, { color: C.textSecondary }]}>{value !== 1 ? t('createEvent.stepperCreators') : t('createEvent.stepperCreator')}</Text>
      </View>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[st.btn, { backgroundColor: value >= max ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Text style={[st.btnTxt, { color: value >= max ? C.border : C.brinjal1 }]}>+</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden' },
  btn:    { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { fontSize: 24, lineHeight: 28, fontFamily: F.regular },
  center: { flex: 1, alignItems: 'center' },
  value:  { fontSize: 24, fontFamily: F.bold },
  unit:   { fontSize: 11, marginTop: 1, fontFamily: F.medium },
});

// ─── DeliverablesCounterList ──────────────────────────────────────────────────

export function DeliverablesCounterList({ value, onChange, colors, t, disabled }: {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  colors: ReturnType<typeof useAppColors>;
  t: (key: string) => string;
  disabled?: boolean;
}) {
  const C = colors;
  return (
    <View style={{ gap: 2, opacity: disabled ? 0.6 : 1 }}>
      {DELIVERABLE_TYPES.map((item, i) => {
        const count = value[item.key] ?? 0;
        const active = count > 0;
        return (
          <View
            key={item.key}
            style={[
              dlv.row,
              { borderBottomColor: C.border },
              i === DELIVERABLE_TYPES.length - 1 && { borderBottomWidth: 0 },
            ]}>
            <View style={[dlv.bullet, { backgroundColor: active ? C.brinjal1 : C.border }]} />
            <Text style={[dlv.label, { color: active ? C.text : C.textSecondary, fontFamily: active ? F.semibold : F.regular }]}>
              {t(item.labelKey)}
            </Text>
            <View style={[dlv.counter, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: C.background }]}>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={dlv.counterBtn}
                hitSlop={4}
                disabled={disabled}
                onPress={() => onChange({ ...value, [item.key]: Math.max(0, count - 1) })}>
                <Text style={[dlv.counterBtnTxt, { color: count <= 0 ? C.border : C.brinjal1 }]}>−</Text>
              </Pressable>
              <Text style={[dlv.counterVal, { color: active ? C.brinjal1 : C.textSecondary }]}>{count}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={dlv.counterBtn}
                hitSlop={4}
                disabled={disabled}
                onPress={() => onChange({ ...value, [item.key]: Math.min(10, count + 1) })}>
                <Text style={[dlv.counterBtnTxt, { color: C.brinjal1 }]}>+</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const dlv = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  bullet:     { width: 7, height: 7, borderRadius: RADIUS.full, flexShrink: 0 },
  label:      { flex: 1, fontSize: 14 },
  counter:    { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.sm, borderWidth: 1.5, overflow: 'hidden' },
  counterBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  counterBtnTxt: { fontSize: 20, lineHeight: 24, fontWeight: '300' },
  counterVal: { width: 28, textAlign: 'center', fontSize: 14, fontFamily: F.bold },
});

// ─── HashtagEditor ────────────────────────────────────────────────────────────

export function HashtagEditor({ hashtags, onChange, colors, t }: {
  hashtags: string[];
  onChange: (v: string[]) => void;
  colors: ReturnType<typeof useAppColors>;
  t: (key: string) => string;
}) {
  const C = colors;
  const [newHashtag, setNewHashtag] = useState('');

  function addHashtag() {
    const v = newHashtag.trim().replace(/^#/, '');
    if (v && !hashtags.includes(v)) onChange([...hashtags, v]);
    setNewHashtag('');
  }

  return (
    <>
      <View style={ht.chipWrap}>
        {hashtags.map((tag) => (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            key={tag}
            style={[ht.hashtagChip, { borderColor: C.brinjal1, backgroundColor: C.primaryLight }]}
            onPress={() => onChange(hashtags.filter((h) => h !== tag))}>
            <Text style={[ht.hashtagChipText, { color: C.brinjal1 }]}>#{tag.replace(/^#/, '')}</Text>
            <Ionicons name="close" size={13} color={C.brinjal1} />
          </Pressable>
        ))}
      </View>
      <View style={ht.addChip}>
        <TextInput
          style={[ht.addChipInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
          value={newHashtag}
          onChangeText={setNewHashtag}
          placeholder={t('createEvent.addHashtagPlaceholder')}
          placeholderTextColor={C.textSecondary}
          autoCapitalize="none"
          onSubmitEditing={addHashtag}
        />
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[ht.addChipBtn, { backgroundColor: C.brinjal1 }]}
          onPress={addHashtag}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>
    </>
  );
}

const ht = StyleSheet.create({
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashtagChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.sm, borderWidth: 1.5 },
  hashtagChipText: { fontSize: 13, fontFamily: F.medium },
  addChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  addChipInput: { flex: 1, borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 12, height: 40, fontSize: 13, fontFamily: F.regular },
  addChipBtn:   { width: 40, height: 40, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
});
