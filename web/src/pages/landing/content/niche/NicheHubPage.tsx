import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { ContentPageLayout } from '../ContentPageLayout';
import { ContentSection } from '../../components/ContentBlocks';
import { webPageSchema } from '../../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../../context/LanguageContext';
import type { NicheConfig } from './NichePage';
import { CORE_RELATED } from './shared';

export interface NicheHubCopy {
  seoTitle: string;
  seoDescription: string;
  breadcrumbName: string;
  eyebrow: string;
  heading: string;
  intro: string;
  gridHeading: string;
  ctaHeading: string;
  ctaSub: string;
}

interface NicheHubPageProps {
  slug: string;
  keywords: string[];
  icon: LucideIcon;
  items: NicheConfig[];
  en: NicheHubCopy;
  ne: NicheHubCopy;
}

// Directory page linking out to a group of niche pages (industry or city
// clusters) — exists mainly so those pages aren't orphaned, reachable only
// by direct URL or search, and so there's one crawlable page listing the
// full set for both users and search engines.
export function NicheHubPage(props: NicheHubPageProps) {
  return (
    <LandingLanguageProvider>
      <NicheHubPageInner {...props} />
    </LandingLanguageProvider>
  );
}

function NicheHubPageInner({ slug, keywords, icon, items, en, ne }: NicheHubPageProps) {
  const { lang, d } = useLandingLanguage();
  const copy = lang === 'ne' ? ne : en;
  const path = `/${slug}`;

  return (
    <ContentPageLayout
      seo={{ title: copy.seoTitle, description: copy.seoDescription, path, keywords, jsonLd: webPageSchema({ path, title: copy.seoTitle, description: copy.seoDescription }) }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: copy.breadcrumbName, path }]}
      icon={icon}
      eyebrow={copy.eyebrow}
      heading={copy.heading}
      intro={copy.intro}
      related={CORE_RELATED[lang]}
      cta={{ heading: copy.ctaHeading, sub: copy.ctaSub }}
    >
      <ContentSection heading={copy.gridHeading}>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const itemCopy = item[lang];
            return (
              <Link
                key={item.slug}
                to={`/${item.slug}`}
                className="group rounded-2xl border border-ink/10 bg-white p-5 transition-all duration-300 hover:border-violet/30 hover:shadow-[0_14px_28px_-14px_rgba(123,92,245,0.25)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/10 text-violet transition-transform duration-300 group-hover:scale-110">
                  <item.icon size={16} />
                </span>
                <span className="mt-3 flex items-center gap-1.5 font-semibold text-ink group-hover:text-violet">
                  {itemCopy.breadcrumbName}
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{itemCopy.eyebrow}</p>
              </Link>
            );
          })}
        </div>
      </ContentSection>
    </ContentPageLayout>
  );
}
