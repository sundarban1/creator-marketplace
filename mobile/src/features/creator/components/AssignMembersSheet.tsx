import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { creatorService, type ApiAssignment, type ApiProviderMember } from '@/services/creator';
import { F, RADIUS, lineHeightFor } from '@/utilities/constants';

// §13/§16 — staffing a booking the team won. Roster and current assignments
// are fetched when the sheet opens rather than with the proposal list: a
// per-card fetch would be one request per accepted booking on screen.
export function AssignMembersSheet({ visible, applicationId, onClose }: {
  visible: boolean;
  applicationId: string | null;
  onClose: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [roster, setRoster] = useState<ApiProviderMember[]>([]);
  const [assignments, setAssignments] = useState<ApiAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const [members, current] = await Promise.all([
        creatorService.listTeamMembers(),
        creatorService.listAssignments(applicationId),
      ]);
      setRoster(members.filter((m) => m.status === 'ACCEPTED'));
      setAssignments(current);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('assign.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [applicationId, t, toast]);

  useEffect(() => { if (visible) void load(); }, [visible, load]);

  async function toggle(member: ApiProviderMember) {
    if (!applicationId) return;
    const existing = assignments.find((a) => a.memberId === member.memberId);
    setBusyId(member.memberId);
    try {
      if (existing) {
        await creatorService.unassignMember(existing.id);
        setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
      } else {
        const created = await creatorService.assignMember(applicationId, member.memberId, member.jobRole ?? undefined);
        setAssignments((prev) => [...prev, created]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('assign.saveFailed'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('assign.title')}
      subtitle={t('assign.subtitle')}
    >
      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.brinjal1} /></View>
      ) : roster.length === 0 ? (
        <View style={s.center}>
          <Text style={[s.emptyText, { color: C.textSecondary }]}>{t('assign.noMembers')}</Text>
        </View>
      ) : (
        roster.map((m, i) => {
          const assigned = assignments.some((a) => a.memberId === m.memberId);
          return (
            <Pressable
              key={m.id}
              disabled={busyId === m.memberId}
              onPress={() => toggle(m)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: assigned }}
              style={[s.row, { borderBottomWidth: i < roster.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: C.text }]} numberOfLines={1}>
                  {m.member?.fullName ?? t('assign.unknownMember')}
                </Text>
                {m.jobRole ? (
                  <Text style={[s.role, { color: C.textSecondary }]} numberOfLines={1}>{m.jobRole}</Text>
                ) : null}
              </View>
              {busyId === m.memberId ? (
                <ActivityIndicator size="small" color={C.brinjal1} />
              ) : (
                <View style={[s.check, {
                  borderColor: assigned ? C.brinjal1 : C.border,
                  backgroundColor: assigned ? C.brinjal1 : 'transparent',
                }]}>
                  {assigned && <FontAwesome5 name="check" solid size={11} color="#fff" />}
                </View>
              )}
            </Pressable>
          );
        })
      )}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  center:    { paddingVertical: 28, alignItems: 'center' },
  emptyText: { fontSize: 13.5, fontFamily: F.regular, textAlign: 'center', lineHeight: lineHeightFor(13.5) },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  name:      { fontSize: 14.5, fontFamily: F.semibold, lineHeight: lineHeightFor(14.5) },
  role:      { fontSize: 12.5, fontFamily: F.regular, lineHeight: lineHeightFor(12.5) },
  check:     { width: 24, height: 24, borderRadius: RADIUS.full, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
});
