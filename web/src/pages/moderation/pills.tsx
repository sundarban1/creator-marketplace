import type { ModPriority, ModReportStatus, ModVerification } from '../../lib/api';
import { STATUS_LABEL, VERIFICATION_LABEL } from './labels';

const PRIORITY_TONE: Record<ModPriority, string> = {
  URGENT: 'bg-red-600 text-white ring-red-600',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
  NORMAL: 'bg-gray-50 text-gray-600 ring-gray-200',
  LOW: 'bg-gray-50 text-gray-400 ring-gray-200',
};

const STATUS_TONE: Record<ModReportStatus, string> = {
  NEW: 'bg-amber-50 text-amber-700 ring-amber-200',
  UNDER_REVIEW: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  NEEDS_MORE_INFO: 'bg-sky-50 text-sky-700 ring-sky-200',
  ACTION_TAKEN: 'bg-red-50 text-red-700 ring-red-200',
  DISMISSED: 'bg-gray-100 text-gray-600 ring-gray-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const pill = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap';

export function StatusPill({ status }: { status: ModReportStatus }) {
  return <span className={`${pill} ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PriorityPill({ priority }: { priority: ModPriority }) {
  return <span className={`${pill} ${PRIORITY_TONE[priority]}`}>{priority === 'URGENT' ? 'Urgent' : priority.charAt(0) + priority.slice(1).toLowerCase()}</span>;
}

export function VerificationPill({ v }: { v: ModVerification }) {
  const tone = v === 'VALID' ? 'bg-red-50 text-red-700 ring-red-200' : v === 'INVALID' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : v === 'NEEDS_MORE_INFORMATION' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-gray-50 text-gray-500 ring-gray-200';
  return <span className={`${pill} ${tone}`}>{VERIFICATION_LABEL[v]}</span>;
}

