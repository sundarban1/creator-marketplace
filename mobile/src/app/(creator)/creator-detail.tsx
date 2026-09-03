import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { creatorService, type ApiCreatorPublicProfile } from '@/services/creator';
import { CreatorProfileView } from '@/features/creator/components/CreatorProfileView';
import { toVisitorVm, privateVisitorVm } from '@/features/creator/utils/creatorProfileVm';

// A creator viewing another creator (a peer). Same page as everywhere else —
// <CreatorProfileView mode="peer"> renders it read-only with the peer-only
// chrome (message-request bar, no services/team/report — those are for a
// hiring business).
export default function CreatorPeerDetailScreen() {
  const { id, viaTeam } = useLocalSearchParams<{ id: string; viaTeam?: string }>();
  const [profile, setProfile] = useState<ApiCreatorPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    setProfile(null);
    creatorService.getPeerCreatorProfile(id)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isPrivate = !!profile?.isPrivate;
  const vm = !profile ? null : profile.isPrivate ? privateVisitorVm(profile) : toVisitorVm(profile);

  return (
    <CreatorProfileView
      mode="peer"
      vm={vm}
      loading={loading}
      error={error}
      isPrivate={isPrivate}
      onRetry={load}
      viaTeam={viaTeam === '1'}
    />
  );
}
