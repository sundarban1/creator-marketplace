type Status =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'banned'
  | 'pending'
  | 'unverified'
  | 'paused'
  | 'closed'
  | 'completed'
  | 'cancelled'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'open'
  | 'reviewing'
  | 'resolved'
  | 'dismissed';

const styles: Record<Status, string> = {
  active:     'bg-emerald-100 text-emerald-700',
  inactive:   'bg-gray-100 text-gray-600',
  suspended:  'bg-orange-100 text-orange-700',
  banned:     'bg-red-100 text-red-700',
  pending:    'bg-amber-100 text-amber-700',
  unverified: 'bg-gray-100 text-gray-500',
  paused:     'bg-orange-100 text-orange-700',
  closed:     'bg-gray-100 text-gray-600',
  completed:  'bg-blue-100 text-blue-700',
  cancelled:  'bg-red-100 text-red-600',
  paid:       'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100 text-red-700',
  refunded:   'bg-purple-100 text-purple-700',
  open:       'bg-amber-100 text-amber-700',
  reviewing:  'bg-blue-100 text-blue-700',
  resolved:   'bg-emerald-100 text-emerald-700',
  dismissed:  'bg-gray-100 text-gray-600',
};

interface StatusBadgeProps {
  status: Status | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}
