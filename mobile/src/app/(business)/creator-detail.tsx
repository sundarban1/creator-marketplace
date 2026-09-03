import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { creatorService, type ApiCreatorPublicProfile } from '@/services/creator';
import { CreatorProfileView } from '@/features/creator/components/CreatorProfileView';
import { toVisitorVm, privateVisitorVm } from '@/features/creator/utils/creatorProfileVm';

// A business viewing a creator. Same page the creator sees on its own Profile
// tab — <CreatorProfileView mode="business"> renders it read-only and adds the
// business-only chrome (services + service-request, team roster, portfolio
// gallery, report, message-request bar).
export default function CreatorDetailScreen() {
  const { id, viaTeam } = useLocalSearchParams<{ id: string; viaTeam?: string }>();
  const [profile, setProfile] = useState<ApiCreatorPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    setProfile(null);
    creatorService.getCreatorPublicProfile(id)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isPrivate = !!profile?.isPrivate;
  const vm = !profile ? null : profile.isPrivate ? privateVisitorVm(profile) : toVisitorVm(profile);

  return (
    <CreatorProfileView
      mode="business"
      vm={vm}
      loading={loading}
      error={error}
      isPrivate={isPrivate}
      onRetry={load}
      viaTeam={viaTeam === '1'}
    />
  );
}
