import type { LucideIcon } from 'lucide-react';
import { ContentPageLayout, type RelatedLink } from '../ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../../components/ContentBlocks';
import type { FAQItem } from '../../components/FAQAccordion';
import { webPageSchema } from '../../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../../context/LanguageContext';
import { defaultBenefits, defaultSteps, defaultFaqs, CORE_RELATED, type NicheLabel } from './shared';

// Shared template for the programmatic SEO landing pages targeting
// "<niche> influencers/creators Nepal" and "influencers <city>" keyword
// clusters. Every page reuses ContentPageLayout's scaffold; only the copy
// (below, per entry in industries.data.tsx / cities.data.tsx) differs, so
// the pages stay visually and structurally consistent without 20+ near-
// duplicate component files. Copy is bilingual (`en/ne`) — the boilerplate
// benefits/steps/base-FAQs come from shared.ts's templates so only the
// page-specific paragraphs need translating per entry.
export interface NicheCopy {
  seoTitle: string;
  seoDescription: string;
  breadcrumbName: string;
  eyebrow: string;
  heading: string;
  intro: string;
  overviewHeading: string;
  overviewParagraphs: string[];
  secondHeading: string;
  secondParagraphs: string[];
  trustParagraph: string;
  /** Extra FAQ entries beyond the shared template's base set. */
  faqsExtra?: FAQItem[];
  /** One page-specific related link, appended after CORE_RELATED. */
  relatedExtra?: RelatedLink;
  ctaHeading: string;
  ctaSub: string;
}

export interface NicheConfig {
  slug: string;
  keywords: string[];
  icon: LucideIcon;
  /** Short niche label (e.g. "Kathmandu creators") plugged into the shared templates. */
  label: NicheLabel;
  en: NicheCopy;
  ne: NicheCopy;
}

export function NichePage({ config }: { config: NicheConfig }) {
  return (
    <LandingLanguageProvider>
      <NichePageInner config={config} />
    </LandingLanguageProvider>
  );
}

function NichePageInner({ config }: { config: NicheConfig }) {
  const { lang, d } = useLandingLanguage();
  const copy = config[lang];
  const path = `/${config.slug}`;
  const related = [...CORE_RELATED[lang], ...(copy.relatedExtra ? [copy.relatedExtra] : [])];

  return (
    <ContentPageLayout
      seo={{
        title: copy.seoTitle,
        description: copy.seoDescription,
        path,
        keywords: config.keywords,
        jsonLd: webPageSchema({ path, title: copy.seoTitle, description: copy.seoDescription }),
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: copy.breadcrumbName, path }]}
      icon={config.icon}
      eyebrow={copy.eyebrow}
      heading={copy.heading}
      intro={copy.intro}
      faqs={defaultFaqs(config.label, lang, copy.faqsExtra)}
      related={related}
      cta={{ heading: copy.ctaHeading, sub: copy.ctaSub }}
    >
      <ContentSection heading={copy.overviewHeading}>
        {copy.overviewParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </ContentSection>

      <ContentSection heading={d.contentPage.whatYouGet}>
        <BenefitGrid items={defaultBenefits(config.label, lang)} />
      </ContentSection>

      <ContentSection heading={copy.secondHeading}>
        {copy.secondParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </ContentSection>

      <ContentSection heading={d.contentPage.howItWorks}>
        <ContentList items={defaultSteps(config.label, lang)} />
      </ContentSection>

      <ContentSection heading={d.contentPage.verifiedSafe}>
        <p>{copy.trustParagraph}</p>
      </ContentSection>
    </ContentPageLayout>
  );
}
