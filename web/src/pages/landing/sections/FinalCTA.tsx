import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { SectionCutAccent, sectionCutStyle } from '../components/SectionWave';
import type { PublicCreatorLite, PublicBusinessLite } from '../../../lib/api';

type RoleKey = 'business' | 'creator';

const CREATOR_FALLBACK_PHOTOS = [
  'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
  'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
];
const BUSINESS_FALLBACK_PHOTO =
  'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop';

interface Props {
  creators: PublicCreatorLite[] | null;
  businesses: PublicBusinessLite[] | null;
}

function RoleCard({
  roleLabel,
  accent,
  heading,
  sub,
  cta,
  ctaHref,
  ctaClassName,
  photos,
}: {
  role: RoleKey;
  roleLabel: string;
  accent: 'orange' | 'violet';
  heading: string;
  sub: string;
  cta: string;
  ctaHref: string;
  ctaClassName: string;
  photos: string[];
}) {
  return (
    <motion.article
      variants={fadeUp}
      className={`flex flex-col items-center rounded-2xl border p-8 text-center shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] ${
        accent === 'orange'
          ? 'border-brand-orange/15 bg-brand-orange/[0.03] dark:border-brand-orange/20'
          : 'border-violet/15 bg-violet/[0.03] dark:border-violet/20'
      }`}
    >
      <div className="flex -space-x-3">
        {photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={roleLabel}
            loading="lazy"
            className="h-11 w-11 flex-shrink-0 rounded-full border-2 border-paper object-cover shadow-sm dark:border-ink"
          />
        ))}
      </div>
      <span
        className={`mt-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white ${
          accent === 'orange' ? 'bg-brand-orange' : 'bg-violet'
        }`}
      >
        {roleLabel}
      </span>
      <h3 className="mt-4 text-balance font-serif text-xl font-medium leading-snug text-ink sm:text-2xl dark:text-white">{heading}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft dark:text-white">{sub}</p>
      <Link
        to={ctaHref}
        // Signup is a conversion action, not indexable content, and the
        // business variant carries a `?role=` query param — nofollow keeps
        // crawlers from treating this as a link worth passing equity through
        // (SEO audits flag internal links with dynamic params otherwise).
        rel="nofollow"
        className={`mt-6 inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 ${ctaClassName}`}
      >
        <Sparkles size={14} />
        {cta}
      </Link>
    </motion.article>
  );
}

export function FinalCTA({ creators, businesses }: Props) {
  const { d } = useLandingLanguage();

  const realCreatorPhotos = (creators ?? []).map((c) => c.avatarUrl).filter((url): url is string => Boolean(url));
  const realBusinessPhotos = (businesses ?? []).map((b) => b.logoUrl).filter((url): url is string => Boolean(url));
  const creatorPhotos = [
    realCreatorPhotos[0] ?? CREATOR_FALLBACK_PHOTOS[0]!,
    realCreatorPhotos[1] ?? CREATOR_FALLBACK_PHOTOS[1]!,
  ];
  const businessPhotos = [realBusinessPhotos[0] ?? BUSINESS_FALLBACK_PHOTO];

  return (
    <section
      id={SECTION_IDS.finalCta}
      style={sectionCutStyle()}
      className="relative overflow-hidden bg-paper py-32 text-ink dark:bg-ink dark:text-white"
    >
      <SectionCutAccent />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/4 top-0 h-[380px] w-[380px] rounded-full bg-violet/[0.18] blur-[110px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.15] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="mx-auto block h-1 w-12 rounded-full bg-gradient-to-r from-violet to-brand-orange"
          />
          <motion.h2
            variants={fadeUp}
            className="text-balance mt-7 bg-gradient-to-br from-ink to-violet-dark bg-clip-text font-serif text-3xl font-medium leading-tight text-transparent sm:text-4xl md:text-5xl dark:from-white dark:to-white/70"
          >
            {d.finalCta.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink-soft dark:text-white">
            {d.finalCta.supportingLine}
          </motion.p>

          <motion.div variants={fadeUp} className="mx-auto mt-12 grid gap-5 sm:grid-cols-2">
            <RoleCard
              role="creator"
              roleLabel={d.finalCta.roles.creator}
              accent="orange"
              heading={d.finalCta.creatorCard.heading}
              sub={d.finalCta.creatorCard.sub}
              cta={d.finalCta.creatorCard.cta}
              ctaHref="/signup"
              ctaClassName="bg-brand-orange"
              photos={creatorPhotos}
            />
            <RoleCard
              role="business"
              roleLabel={d.finalCta.roles.business}
              accent="violet"
              heading={d.finalCta.businessCard.heading}
              sub={d.finalCta.businessCard.sub}
              cta={d.finalCta.businessCard.cta}
              ctaHref="/signup?role=business"
              ctaClassName="bg-violet"
              photos={businessPhotos}
            />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 border-t border-ink/10 pt-8 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-white">{d.footer.downloadApp}</p>
            <div className="mt-4 flex justify-center">
              <AppStoreBadges />
            </div>
            <p className="mt-6 text-sm text-ink-soft dark:text-white">🇳🇵 {d.footer.tagline}</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
