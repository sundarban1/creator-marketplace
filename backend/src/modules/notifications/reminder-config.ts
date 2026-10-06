import { getCachedSettings } from '../../utils/settingsCache';

// Typed accessor for the collaboration-reminder tunables (admin-editable
// PlatformSetting `reminders.*`, defaults in admin.repository.ts) — same
// pattern as campaign/escrow-config.ts.

export interface ReminderTimings {
  enabled: boolean;
  paymentLeadHours: number;
  confirmationLeadHours: number;
  deliverableDueLeadHours: number;
  deliverableDueSoonLeadHours: number;
  minStageAgeHours: number;
  inactivityDays: number;
  reviewFirstHours: number;
  reviewSecondDays: number;
  reviewMaxAgeDays: number;
  responseHours: number;
  responseMaxAgeDays: number;
  deadlineRiskLeadHours: number;
  applicationPushWindowMinutes: number;
}

const FALLBACK: ReminderTimings = {
  enabled:                     true,
  paymentLeadHours:            12,
  confirmationLeadHours:       12,
  deliverableDueLeadHours:     24,
  deliverableDueSoonLeadHours:  3,
  minStageAgeHours:             1,
  inactivityDays:               3,
  reviewFirstHours:            24,
  reviewSecondDays:             4,
  reviewMaxAgeDays:             7,
  responseHours:               24,
  responseMaxAgeDays:           3,
  deadlineRiskLeadHours:       24,
  applicationPushWindowMinutes: 15,
};

function nonNeg(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getReminderTimings(): Promise<ReminderTimings> {
  const s = await getCachedSettings();
  return {
    enabled:                     typeof s['reminders.enabled'] === 'boolean' ? (s['reminders.enabled'] as boolean) : FALLBACK.enabled,
    paymentLeadHours:            nonNeg(s['reminders.paymentLeadHours'], FALLBACK.paymentLeadHours),
    confirmationLeadHours:       nonNeg(s['reminders.confirmationLeadHours'], FALLBACK.confirmationLeadHours),
    deliverableDueLeadHours:     nonNeg(s['reminders.deliverableDueLeadHours'], FALLBACK.deliverableDueLeadHours),
    deliverableDueSoonLeadHours: nonNeg(s['reminders.deliverableDueSoonLeadHours'], FALLBACK.deliverableDueSoonLeadHours),
    minStageAgeHours:            nonNeg(s['reminders.minStageAgeHours'], FALLBACK.minStageAgeHours),
    inactivityDays:              nonNeg(s['reminders.inactivityDays'], FALLBACK.inactivityDays),
    reviewFirstHours:            nonNeg(s['reminders.reviewFirstHours'], FALLBACK.reviewFirstHours),
    reviewSecondDays:            nonNeg(s['reminders.reviewSecondDays'], FALLBACK.reviewSecondDays),
    reviewMaxAgeDays:            nonNeg(s['reminders.reviewMaxAgeDays'], FALLBACK.reviewMaxAgeDays),
    responseHours:               nonNeg(s['reminders.responseHours'], FALLBACK.responseHours),
    responseMaxAgeDays:          nonNeg(s['reminders.responseMaxAgeDays'], FALLBACK.responseMaxAgeDays),
    deadlineRiskLeadHours:       nonNeg(s['reminders.deadlineRiskLeadHours'], FALLBACK.deadlineRiskLeadHours),
    applicationPushWindowMinutes: nonNeg(s['reminders.applicationPushWindowMinutes'], FALLBACK.applicationPushWindowMinutes),
  };
}
