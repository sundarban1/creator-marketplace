import { useT } from '../i18n';
import { engagementMeta } from '../lib/engagement';
import { StatusBadge } from '../ui/StatusBadge';

/** Localised status pill for an application's derived engagement state. */
export function EngagementBadge({ state, className }: { state: string; className?: string }) {
  const t = useT();
  const { labelKey, tone } = engagementMeta(state);
  return <StatusBadge label={t(`engagement.${labelKey}`)} tone={tone} className={className} />;
}
