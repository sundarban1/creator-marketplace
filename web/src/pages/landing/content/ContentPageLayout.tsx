import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StandaloneHeader } from '../StandalonePageShell';
import { LandingLanguageProvider } from '../context/LanguageContext';
import { LandingFooter } from '../nav/LandingFooter';
import { Breadcrumb, type BreadcrumbItem } from '../components/Breadcrumb';
import { FAQAccordion, type FAQItem } from '../components/FAQAccordion';
import { CTASection } from '../components/CTASection';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SEO, type SEOProps } from '../../../lib/seo/SEO';
import { breadcrumbSchema } from '../../../lib/seo/schema';

export interface RelatedLink {
  label: string;
  path: string;
  description: string;
}

interface ContentPageLayoutProps {
  seo: SEOProps;
  /** Full chain including the current page — first item should always be Home ("/"). */
  breadcrumb: BreadcrumbItem[];
  icon: LucideIcon;
  eyebrow: string;
  /** Renders as the page's single <h1>. */
  heading: string;
  intro?: string;
  /** Page-specific body — compose with ContentSection/BenefitGrid/ContentList from ../components/ContentBlocks. */
  children: ReactNode;
  faqs?: FAQItem[];
  related?: RelatedLink[];
  cta: { heading: string; sub: string };
}

// Shared shell for every /*-nepal, /content-creators, /brands, etc. SEO
// landing page — one <h1>, breadcrumb (visual + schema), FAQ block (+
// FAQPage schema handled by the caller passing it into seo.jsonLd), a
// related-pages grid for internal linking, and the standard closing CTA.
// New pages should only need to supply content, not rebuild this scaffold.
export function ContentPageLayout({ seo, breadcrumb, icon: Icon, eyebrow, heading, intro, children, faqs, related, cta }: ContentPageLayoutProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const jsonLd = [
    ...(Array.isArray(seo.jsonLd) ? seo.jsonLd : seo.jsonLd ? [seo.jsonLd] : []),
    breadcrumbSchema(breadcrumb),
  ];

  return (
    <LandingLanguageProvider>
    <div className="min-h-screen bg-paper font-display">
      <SEO {...seo} jsonLd={jsonLd} />
      <StandaloneHeader />

      <main className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
        <motion.div initial="hidden" animate="show" variants={stagger()}>
          <motion.div variants={fadeUp}>
            <Breadcrumb items={breadcrumb} />
          </motion.div>

          <motion.span variants={fadeUp} className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-violet/10 text-violet shadow-[0_4px_12px_-4px_rgba(123,92,245,0.35)]">
            <Icon size={22} />
          </motion.span>

          <motion.p variants={fadeUp} className="mt-5 font-serif text-base italic text-ink-soft">{eyebrow}</motion.p>

          <motion.h1 variants={fadeUp} className="text-balance mt-3 font-serif text-4xl font-medium tracking-tight text-ink sm:text-5xl">
            {heading}
          </motion.h1>

          {intro && (
            <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {intro}
            </motion.p>
          )}
        </motion.div>

        <div className="mt-14 space-y-14">
          {children}
        </div>

        {faqs && faqs.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mt-16">
            <motion.h2 variants={fadeUp} className="font-serif text-2xl font-medium text-ink sm:text-3xl">
              Frequently asked questions
            </motion.h2>
            <motion.div variants={fadeUp} className="mt-4">
              <FAQAccordion items={faqs} />
            </motion.div>
          </motion.section>
        )}

        {related && related.length > 0 && (
          <motion.section initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mt-16">
            <motion.h2 variants={fadeUp} className="font-serif text-2xl font-medium text-ink sm:text-3xl">
              Explore more
            </motion.h2>
            <motion.div variants={fadeUp} className="mt-5 grid gap-4 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.path}
                  to={r.path}
                  className="group rounded-2xl border border-ink/10 bg-white p-5 transition-all duration-300 hover:border-violet/30 hover:shadow-[0_14px_28px_-14px_rgba(123,92,245,0.25)]"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-ink group-hover:text-violet">
                    {r.label}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <p className="mt-1.5 text-sm text-ink-soft">{r.description}</p>
                </Link>
              ))}
            </motion.div>
          </motion.section>
        )}

        <CTASection heading={cta.heading} sub={cta.sub} />
      </main>

      <LandingFooter />
    </div>
    </LandingLanguageProvider>
  );
}
