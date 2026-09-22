import { motion } from 'framer-motion';
import { ArrowRight, Building2, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp, scaleIn, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { SectionCutAccent, sectionCutStyle } from '../components/SectionWave';
import { AppCard, AppChip } from '../components/app/AppUI';
import { OpportunityCard, type OpportunityCardData } from '../components/app/OpportunityCard';

/** A static "posting a requirement" mockup — what a business fills in (built
 * from AppUI's own chip primitive) resolving into an OpportunityCard using
 * the shared `sampleOpportunity` i18n data. */
function PostingMockup({ opportunity, applyLabel }: { opportunity: OpportunityCardData; applyLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <AppCard className="w-full max-w-xs p-4">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-app-muted">
          <Building2 size={13} className="text-violet" />
          New requirement
        </span>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <AppChip label={opportunity.category} />
          <AppChip label={opportunity.budget} />
          <AppChip label={opportunity.location} />
        </div>
      </AppCard>
      <ChevronDown size={16} className="text-violet" aria-hidden />
      <OpportunityCard data={opportunity} applyLabel={applyLabel} />
    </div>
  );
}

export function BusinessStory() {
  const { d } = useLandingLanguage();
  const b = d.businessStory;
  const o = d.sampleOpportunity;

  const opportunity: OpportunityCardData = {
    title: o.title,
    budget: o.budget,
    brand: o.brand,
    postedAgo: o.postedAgo,
    category: o.category,
    location: o.location,
    deadline: { label: o.deadlineLabel, tone: 'soon' },
    type: 'paid',
    photo: '/landing/people.jpg',
  };

  return (
    <section
      id={SECTION_IDS.businessStory}
      style={sectionCutStyle()}
      className="relative overflow-hidden bg-paper-dim py-28 dark:bg-ink-elevated"
    >
      <SectionCutAccent />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute right-[8%] top-[-6%] h-[340px] w-[340px] rounded-full bg-violet/[0.08] blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1fr] lg:gap-16">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={scaleIn} className="order-2 mx-auto w-fit lg:order-1">
            <PostingMockup opportunity={opportunity} applyLabel={d.appPreview.applyLabel} />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={VP}
            variants={stagger()}
            className="order-1 mx-auto max-w-xl text-center lg:order-2 lg:mx-0 lg:text-left"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet/20 bg-violet/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-violet"
            >
              <Building2 size={12} />
              {b.eyebrow}
            </motion.span>
            <TextReveal
              as="h2"
              text={b.heading}
              delay={0.1}
              className="mt-4 text-balance font-serif text-3xl font-medium text-ink sm:text-4xl md:text-5xl dark:text-white"
            />
            <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
              {b.sub}
            </motion.p>

            <motion.ol
              variants={fadeUp}
              className="relative mx-auto mt-8 w-full max-w-sm overflow-hidden rounded-2xl border border-ink/10 bg-violet/[0.04] p-5 text-left shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] lg:mx-0 dark:border-white/10 dark:bg-violet/[0.06]"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet/30 to-violet" />
              {b.steps.map((step, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-xs font-bold text-violet">
                    {i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ink dark:text-white">{step.title}</span>
                    <span className="text-xs text-ink-soft dark:text-white/70">{step.desc}</span>
                  </span>
                </motion.li>
              ))}
            </motion.ol>

            <motion.div variants={fadeUp} className="mt-7 flex flex-col items-center lg:items-start">
              <Link
                to="/creators"
                className="inline-flex items-center gap-1.5 rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {d.hero.ctaBusiness}
                <ArrowRight size={14} />
              </Link>
              <span className="mt-2 text-xs text-ink-soft dark:text-white">{b.ctaCaption}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
