import { useT } from '../i18n';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';

/**
 * Placeholder for a nav destination whose real screen ships in Phase 2/3.
 * Keeps the shell + navigation fully usable now and points people to the app
 * (where the feature already works and stays in sync).
 */
export function ComingSoon({ titleKey }: { titleKey: string }) {
  const t = useT();
  const feature = t(`nav.${titleKey}`);

  return (
    <>
      <PageHeader title={feature} />
      <EmptyState
        variant="empty"
        title={t('comingSoon.title', { feature })}
        description={t('comingSoon.body')}
        action={{ label: t('comingSoon.cta'), href: '/' }}
      />
    </>
  );
}
