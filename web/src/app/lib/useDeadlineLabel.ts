import { useCallback } from 'react';
import { useAppLanguage } from '../i18n';
import { deadlineInfo } from './format';

/**
 * Returns a localised deadline formatter. `{ label, urgent }` — same shape the
 * old `relativeDeadline` returned, but translated.
 */
export function useDeadlineLabel() {
  const { language, t } = useAppLanguage();
  return useCallback(
    (iso: string): { label: string; urgent: boolean } => {
      const d = deadlineInfo(iso, language);
      if (d.closed) return { label: t('deadline.closed'), urgent: false };
      if (d.days === 0) return { label: t('deadline.today'), urgent: true };
      if (d.days === 1) return { label: t('deadline.tomorrow'), urgent: true };
      if (d.days <= 7) return { label: t('deadline.daysLeft', { n: d.days }), urgent: true };
      return { label: t('deadline.closesOn', { date: d.dateLabel }), urgent: false };
    },
    [language, t],
  );
}
