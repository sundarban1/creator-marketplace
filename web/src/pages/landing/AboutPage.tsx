import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, Target, Mountain } from 'lucide-react';
import { StandalonePageShell } from './StandalonePageShell';
import { useLandingLanguage } from './context/LanguageContext';
import { fadeUp, stagger } from './lib/motion';
import { SEO } from '../../lib/seo/SEO';
import { webPageSchema } from '../../lib/seo/schema';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-ink/10 p-5 dark:border-white/10">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet/10 text-violet">{icon}</span>
        <h2 className="font-serif text-base font-medium text-ink dark:text-white">{title}</h2>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-soft dark:text-white">{children}</p>
    </motion.div>
  );
}

function AboutContent() {
  const { d } = useLandingLanguage();
  const a = d.aboutPage;
  const year = new Date().getFullYear();

  return (
    <motion.div initial="hidden" animate="show" variants={stagger()}>
      <SEO
        title={a.title}
        description={a.intro}
        path="/about"
        jsonLd={[webPageSchema({ path: '/about', title: `${a.title} | Kolab`, description: a.intro })]}
      />
      <motion.p variants={fadeUp} className="font-serif text-sm italic text-ink-soft dark:text-white">
        <a href="/" className="hover:text-ink dark:hover:text-white">{d.legalPages.backToHome}</a>
      </motion.p>

      <motion.div variants={fadeUp} className="mt-6 flex flex-col items-center text-center">
        <img src="/logo-flat.svg" alt="Kolab" className="h-10 w-auto object-contain" />
        <h1 className="mt-4 text-balance font-serif text-4xl font-medium tracking-tight text-ink sm:text-5xl dark:text-white">
          {a.title}
        </h1>
        <p className="mt-3 max-w-md font-serif italic text-ink-soft dark:text-white">{a.tagline}</p>
      </motion.div>

      <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-xl text-center text-[15px] leading-relaxed text-ink-soft dark:text-white">
        {a.intro}
      </motion.p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Section icon={<Users size={15} />} title={a.creatorsHeading}>{a.creatorsBody}</Section>
        <Section icon={<Briefcase size={15} />} title={a.businessesHeading}>{a.businessesBody}</Section>
        <Section icon={<Target size={15} />} title={a.missionHeading}>{a.missionBody}</Section>
        <Section icon={<Mountain size={15} />} title={a.nepalHeading}>{a.nepalBody}</Section>
      </div>

      <motion.div variants={fadeUp} className="mt-14 flex flex-col items-center gap-2 border-t border-ink/10 pt-8 text-center dark:border-white/10">
        <p className="text-[13px] font-semibold text-ink dark:text-white">{a.company}</p>
        <div className="flex items-center gap-2.5 text-[13px]">
          <a href="/terms" className="font-semibold text-violet hover:underline">{a.terms}</a>
          <span className="text-ink-soft/40">•</span>
          <a href="/privacy" className="font-semibold text-violet hover:underline">{a.privacy}</a>
        </div>
        <p className="text-[12px] text-ink-soft dark:text-white">{a.copyright.replace('{year}', String(year))}</p>
      </motion.div>
    </motion.div>
  );
}

export function AboutPage() {
  return (
    <StandalonePageShell>
      <AboutContent />
    </StandalonePageShell>
  );
}
