import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { H2, LEAD, panel } from '../lib/surfaces';
import { PillCta } from '../components/PillCta';
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
  photos,
}: {
  role: RoleKey;
  roleLabel: string;
  accent: 'brinjal' | 'green';
  heading: string;
  sub: string;
  cta: string;
  ctaHref: string;
  photos: string[];
}) {
  return (
    <motion.article
      variants={fadeUp}
      className="flex flex-col items-start rounded-3xl lp-glass p-8 text-left backdrop-blur"
    >
      <div className="flex w-full items-center justify-between">
        <span className={`text-xs font-medium uppercase tracking-[0.14em] ${accent === 'brinjal' ? 'text-lp-accent-ink' : 'text-lp-green-ink'}`}>{roleLabel}</span>
        <div className="flex -space-x-3">
          {photos.map((src, i) => (
            <img key={i} src={src} alt={roleLabel} loading="lazy" className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-lp-navy-2 object-cover" />
          ))}
        </div>
      </div>
      <h3 className="lp-display mt-8 text-balance text-2xl text-lp-fg sm:text-[1.7rem]">{heading}</h3>
      <p className="mt-3 text-sm font-light leading-relaxed text-lp-fg/65">{sub}</p>
      {/* Signup is a conversion action, not indexable content, and the
          business variant carries a `?role=` query param — nofollow keeps
          crawlers from treating this as a link worth passing equity through
          (SEO audits flag internal links with dynamic params otherwise). */}
      <PillCta to={ctaHref} rel="nofollow" tone={accent} className="mt-8">
        {cta}
      </PillCta>
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
    <section id={SECTION_IDS.finalCta} className={`${panel('navy')} lp-stars overflow-hidden pb-20 pt-28`}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-lp-brinjal/30 blur-[140px]" />
      </div>
      <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
        <motion.h2 variants={fadeUp} className={`${H2} text-lp-fg`}>
          <span className="lp-gradient-text">{d.finalCta.heading}</span>
        </motion.h2>
        <motion.p variants={fadeUp} className={`${LEAD} mx-auto mt-5 max-w-lg text-lp-fg/70`}>
          {d.finalCta.supportingLine}
        </motion.p>

        <motion.div variants={fadeUp} className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
          <RoleCard
            role="creator"
            roleLabel={d.finalCta.roles.creator}
            accent="brinjal"
            heading={d.finalCta.creatorCard.heading}
            sub={d.finalCta.creatorCard.sub}
            cta={d.finalCta.creatorCard.cta}
            ctaHref="/signup"
            photos={creatorPhotos}
          />
          <RoleCard
            role="business"
            roleLabel={d.finalCta.roles.business}
            accent="green"
            heading={d.finalCta.businessCard.heading}
            sub={d.finalCta.businessCard.sub}
            cta={d.finalCta.businessCard.cta}
            ctaHref="/signup?role=business"
            photos={businessPhotos}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-lp-fg/55">{d.footer.downloadApp}</p>
          <div className="mt-4 flex justify-center">
            <AppStoreBadges />
          </div>
          <p className="mt-6 text-sm font-light text-lp-fg/60">🇳🇵 {d.footer.tagline}</p>
        </motion.div>
      </motion.div>
    </section>
  );
}
