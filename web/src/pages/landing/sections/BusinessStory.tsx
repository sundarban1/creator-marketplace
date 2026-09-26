import { motion } from 'framer-motion';
import { Building2, ChevronDown } from 'lucide-react';
import { fadeUp, scaleIn, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { H2, LEAD, band } from '../lib/surfaces';
import { PillCta } from '../components/PillCta';
import { AudienceSteps, AudienceTag } from '../components/AudienceCard';
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
          <Building2 size={13} className="text-lp-green" />
          New requirement
        </span>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <AppChip label={opportunity.category} />
          <AppChip label={opportunity.budget} />
          <AppChip label={opportunity.location} />
        </div>
      </AppCard>
      <ChevronDown size={18} className="text-lp-green" aria-hidden />
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
    <section id={SECTION_IDS.businessStory} className={`${band('white')} overflow-hidden pb-32 pt-6`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={fadeUp}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-lp-mist via-white to-white p-7 ring-1 ring-lp-black/[0.06] shadow-[0_30px_70px_-45px_rgba(10,16,51,0.45)] sm:p-12 dark:from-white/[0.06] dark:via-white/[0.03] dark:to-transparent dark:ring-white/10"
        >
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 bg-lp-green/15 h-72 w-72 rounded-full blur-[100px]" />
          <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.15)} className="order-2 mx-auto flex w-full min-w-0 flex-col items-center gap-5 lg:order-1">
              <motion.div variants={scaleIn}>
                <PostingMockup opportunity={opportunity} applyLabel={d.appPreview.applyLabel} />
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="order-1 max-w-xl lg:order-2">
              <AudienceTag label={b.eyebrow} icon={<Building2 size={14} />} accent="green" />
              <TextReveal as="h2" text={b.heading} delay={0.1} className={`${H2} mt-4`} />
              <motion.p variants={fadeUp} className={`${LEAD} mt-4 text-lp-black/65 dark:text-white/65`}>
                {b.sub}
              </motion.p>
              <AudienceSteps steps={b.steps} accent="green" />
              <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
                <PillCta to="/creators" tone="green" size="lg">
                  {d.hero.ctaBusiness}
                </PillCta>
                <span className="text-xs text-lp-black/55 dark:text-white/55">{b.ctaCaption}</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
