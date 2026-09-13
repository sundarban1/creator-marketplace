import type { ReactNode } from 'react';
import { Users, Briefcase, Target, Mountain } from 'lucide-react';
import { useT } from '../i18n';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Logo } from '../ui/Logo';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">{icon}</span>
        <h2 className="text-[14px] font-medium text-ink">{title}</h2>
      </div>
      <p className="text-[13.5px] leading-relaxed text-ink-soft">{children}</p>
    </Card>
  );
}

export function AboutKolabPage() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('aboutKolab.title')} description={t('aboutKolab.tagline')} />

      <Card className="mb-6 flex flex-col items-center gap-3 text-center">
        <Logo className="h-9 w-auto" asLink={false} />
        <p className="max-w-lg text-[13.5px] leading-relaxed text-ink-soft">{t('aboutKolab.intro')}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section icon={<Users size={15} />} title={t('aboutKolab.creatorsHeading')}>{t('aboutKolab.creatorsBody')}</Section>
        <Section icon={<Briefcase size={15} />} title={t('aboutKolab.businessesHeading')}>{t('aboutKolab.businessesBody')}</Section>
        <Section icon={<Target size={15} />} title={t('aboutKolab.missionHeading')}>{t('aboutKolab.missionBody')}</Section>
        <Section icon={<Mountain size={15} />} title={t('aboutKolab.nepalHeading')}>{t('aboutKolab.nepalBody')}</Section>
      </div>

      <Card className="mt-6">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('aboutKolab.legalHeading')}</p>
        <div className="flex items-center gap-3 text-[13.5px]">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-violet hover:underline">
            {t('aboutKolab.termsLink')}
          </a>
          <span className="text-ink-soft/40">•</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-violet hover:underline">
            {t('aboutKolab.privacyLink')}
          </a>
        </div>
        <p className="mt-3 text-[12px] text-ink-soft">{t('aboutKolab.copyright', { year })}</p>
      </Card>
    </div>
  );
}
