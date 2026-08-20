import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Pressable } from 'react-native';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { ErrorState } from '@/components/ErrorState';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/features/business/components/CampaignFormControls';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiAvailabilityDay } from '@/services/creator';
import { OfflineError } from '@/lib/api';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
const STATUSES: AvailabilityStatus[] = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'];

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
// Availability is coarse scheduling, not appointment booking — hourly slots
// across a reasonable working window keep the picker to 18 chips instead of
// doubling it for 30-minute granularity nothing here actually needs.
const TIME_OPTIONS = Array.from({ length: 18 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`);

type DaySchedule = { availableFrom: string; availableUntil: string } | null;

export default function AvailabilityScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [status, setStatus] = useState<AvailabilityStatus>('AVAILABLE');
  const [schedule, setSchedule] = useState<DaySchedule[]>(Array(7).fill(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, days] = await Promise.all([
        creatorService.getProfile(),
        creatorService.getAvailabilitySchedule(),
      ]);
      setStatus(profile.availabilityStatus);
      const next: DaySchedule[] = Array(7).fill(null);
      days.forEach((d: ApiAvailabilityDay) => { next[d.dayOfWeek] = { availableFrom: d.availableFrom, availableUntil: d.availableUntil }; });
      setSchedule(next);
    } catch (err) {
      setError(
        err instanceof OfflineError
          ? t('availabilityScreen.errorMessage')
          : (err instanceof Error ? err.message : t('availabilityScreen.errorMessage'))
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function handleStatusChange(next: AvailabilityStatus) {
    const prev = status;
    setStatus(next);
    setSavingStatus(true);
    try {
      await creatorService.updateAvailabilityStatus(next);
    } catch (err) {
      setStatus(prev);
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('availabilityScreen.saveFailed'));
    } finally {
      setSavingStatus(false);
    }
  }

  async function persistSchedule(next: DaySchedule[]) {
    setSavingSchedule(true);
    try {
      const days = next
        .map((d, dayOfWeek) => (d ? { dayOfWeek, availableFrom: d.availableFrom, availableUntil: d.availableUntil } : null))
        .filter((d): d is { dayOfWeek: number; availableFrom: string; availableUntil: string } => d !== null);
      await creatorService.updateAvailabilitySchedule(days);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('availabilityScreen.saveFailed'));
      void load(); // revert to server state on failure
    } finally {
      setSavingSchedule(false);
    }
  }

  function toggleDay(day: number, enabled: boolean) {
    const next = [...schedule];
    next[day] = enabled ? { availableFrom: '09:00', availableUntil: '18:00' } : null;
    setSchedule(next);
    if (enabled) { setEditingDay(day); return; }
    void persistSchedule(next);
  }

  function saveDayTimes(day: number, availableFrom: string, availableUntil: string) {
    const next = [...schedule];
    next[day] = { availableFrom, availableUntil };
    setSchedule(next);
    setEditingDay(null);
    void persistSchedule(next);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('availabilityScreen.title')} />
      <MaxWidthContainer>
        {loading ? null : error ? (
          <ErrorState
            title={t('availabilityScreen.errorTitle')}
            message={error}
            actionLabel={t('invitations.retry')}
            onAction={load}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View>
              <Text style={[styles.sectionLabel, { color: C.text }]}>{t('availabilityScreen.statusLabel')}</Text>
              <ChipGroup
                options={STATUSES.map((s) => t(`availabilityScreen.status${s}`))}
                value={t(`availabilityScreen.status${status}`)}
                onChange={(label) => {
                  const s = STATUSES.find((st) => t(`availabilityScreen.status${st}`) === label);
                  if (s) void handleStatusChange(s);
                }}
                colors={C}
                disabled={savingStatus}
              />
            </View>

            <View>
              <Text style={[styles.sectionLabel, { color: C.text }]}>{t('availabilityScreen.scheduleLabel')}</Text>
              <Text style={[styles.sectionHint, { color: C.textSecondary }]}>{t('availabilityScreen.scheduleHint')}</Text>
              <View style={[styles.dayList, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}>
                {DAY_KEYS.map((key, i) => {
                  const day = schedule[i];
                  return (
                    <View key={key} style={[styles.dayRow, i < 6 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}>
                      <Text style={[styles.dayName, { color: C.text }]}>{t(`availabilityScreen.day_${key}`)}</Text>
                      {day && (
                        <Pressable onPress={() => setEditingDay(i)} style={styles.dayTimeBtn} disabled={savingSchedule}>
                          <Text style={[styles.dayTime, { color: C.brinjal1 }]}>{day.availableFrom} – {day.availableUntil}</Text>
                        </Pressable>
                      )}
                      <Switch
                        value={!!day}
                        onValueChange={(v) => toggleDay(i, v)}
                        disabled={savingSchedule}
                        trackColor={{ true: C.brinjal1 }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}
      </MaxWidthContainer>

      {editingDay !== null && (
        <DayTimeSheet
          dayLabel={t(`availabilityScreen.day_${DAY_KEYS[editingDay]}`)}
          initialFrom={schedule[editingDay]?.availableFrom ?? '09:00'}
          initialUntil={schedule[editingDay]?.availableUntil ?? '18:00'}
          onSave={(from, until) => saveDayTimes(editingDay, from, until)}
          onClose={() => {
            // Cancelling a brand-new toggle (never saved) should revert the toggle too.
            if (!schedule[editingDay]) {
              const next = [...schedule];
              next[editingDay] = null;
              setSchedule(next);
            }
            setEditingDay(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function DayTimeSheet({ dayLabel, initialFrom, initialUntil, onSave, onClose }: {
  dayLabel: string;
  initialFrom: string;
  initialUntil: string;
  onSave: (from: string, until: string) => void;
  onClose: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [from, setFrom] = useState(initialFrom);
  const [until, setUntil] = useState(initialUntil);
  const invalid = from >= until;

  return (
    <BottomSheet visible title={dayLabel} onClose={onClose}>
      <View style={{ gap: 18 }}>
        <View>
          <Text style={[styles.sectionLabel, { color: C.text }]}>{t('availabilityScreen.fromLabel')}</Text>
          <ChipGroup options={TIME_OPTIONS} value={from} onChange={setFrom} colors={C} />
        </View>
        <View>
          <Text style={[styles.sectionLabel, { color: C.text }]}>{t('availabilityScreen.untilLabel')}</Text>
          <ChipGroup options={TIME_OPTIONS} value={until} onChange={setUntil} colors={C} />
        </View>
        {invalid && (
          <Text style={{ color: C.error, fontSize: 12, fontFamily: F.medium }}>{t('availabilityScreen.errFromBeforeUntil')}</Text>
        )}
        <Button label={t('availabilityScreen.saveTimes')} onPress={() => onSave(from, until)} disabled={invalid} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 28, paddingBottom: 48 },
  sectionLabel: { fontSize: 14, fontFamily: F.semibold, marginBottom: 8 },
  sectionHint: { fontSize: 12, fontFamily: F.regular, marginTop: -6, marginBottom: 10 },

  dayList: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  dayName: { flex: 1, fontSize: 14, fontFamily: F.medium },
  dayTimeBtn: { paddingVertical: 4 },
  dayTime: { fontSize: 13, fontFamily: F.semibold },
});
