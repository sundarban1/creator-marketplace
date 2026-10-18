import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { SegmentedControl } from '../ui/SegmentedControl';

export type EventKind = 'PAID_CAMPAIGN' | 'OPEN_EVENT' | 'COMPETITION';

/** Paid / Event / Competition pill switcher shared by every "New event"
 *  builder. Paid and free live on /business/events/create (free via
 *  ?type=free); competitions have their own builder. Pass `onSelect` to
 *  handle a switch in place instead of navigating. */
export function EventTypeSwitcher({ value, onSelect }: {
  value: EventKind;
  onSelect?: (next: Exclude<EventKind, 'COMPETITION'>) => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <SegmentedControl<EventKind>
      ariaLabel="Type"
      variant="pill"
      value={value}
      onChange={(next) => {
        if (next === value) return;
        if (next === 'COMPETITION') navigate('/business/competitions/new');
        else if (onSelect) onSelect(next);
        else navigate(next === 'OPEN_EVENT' ? '/business/events/create?type=free' : '/business/events/create');
      }}
      options={[
        { value: 'PAID_CAMPAIGN', label: t('public.typePaid') },
        { value: 'OPEN_EVENT', label: t('public.typeOpenEvent') },
        { value: 'COMPETITION', label: t('comp.typeBadge') },
      ]}
    />
  );
}
