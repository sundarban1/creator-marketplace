import type { LucideIcon } from 'lucide-react';
import { ContentPageLayout, type RelatedLink } from '../ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList, type BenefitItem } from '../../components/ContentBlocks';
import type { FAQItem } from '../../components/FAQAccordion';
import { webPageSchema } from '../../../../lib/seo/schema';

// Shared template for the programmatic SEO landing pages targeting
// "<niche> influencers/creators Nepal" and "influencers <city>" keyword
// clusters. Every page reuses ContentPageLayout's scaffold; only the copy
// (below, per entry in industries.data.tsx / cities.data.tsx) differs, so
// the pages stay visually and structurally consistent without 20+ near-
// duplicate component files.
export interface NicheConfig {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  breadcrumbName: string;
  icon: LucideIcon;
  eyebrow: string;
  heading: string;
  intro: string;
  overviewHeading: string;
  overviewParagraphs: string[];
  benefits: BenefitItem[];
  secondHeading: string;
  secondParagraphs: string[];
  steps: string[];
  trustParagraph: string;
  faqs: FAQItem[];
  related: RelatedLink[];
  ctaHeading: string;
  ctaSub: string;
}

export function NichePage({ config }: { config: NicheConfig }) {
  const path = `/${config.slug}`;

  return (
    <ContentPageLayout
      seo={{
        title: config.seoTitle,
        description: config.seoDescription,
        path,
        keywords: config.keywords,
        jsonLd: webPageSchema({ path, title: config.seoTitle, description: config.seoDescription }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: config.breadcrumbName, path }]}
      icon={config.icon}
      eyebrow={config.eyebrow}
      heading={config.heading}
      intro={config.intro}
      faqs={config.faqs}
      related={config.related}
      cta={{ heading: config.ctaHeading, sub: config.ctaSub }}
    >
      <ContentSection heading={config.overviewHeading}>
        {config.overviewParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </ContentSection>

      <ContentSection heading="What you get on Kolab">
        <BenefitGrid items={config.benefits} />
      </ContentSection>

      <ContentSection heading={config.secondHeading}>
        {config.secondParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </ContentSection>

      <ContentSection heading="How it works">
        <ContentList items={config.steps} />
      </ContentSection>

      <ContentSection heading="Verified, safe collaborations">
        <p>{config.trustParagraph}</p>
      </ContentSection>
    </ContentPageLayout>
  );
}
