import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { ContactForm } from '../components/ContactForm';

export function LandingFooter() {
  const { d } = useLandingLanguage();

  return (
    <footer id={SECTION_IDS.contact} className="relative bg-paper py-16 text-[#0B0908]">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
      <div className="mx-auto max-w-5xl px-5">
        <div className="grid gap-12 md:grid-cols-2">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
            <motion.div variants={fadeUp} className="mb-3 flex w-fit items-center">
              <img src="/logo.png" alt="kolab" className="h-6 w-auto object-contain" />
            </motion.div>
            <motion.p variants={fadeUp} className="max-w-xs text-sm leading-relaxed text-ink/75">
              {d.footer.tagline}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/75">
              <Link to="/privacy" className="transition-colors hover:text-ink">{d.footer.privacy}</Link>
              <Link to="/terms" className="transition-colors hover:text-ink">{d.footer.terms}</Link>
              <Link to="/support" className="transition-colors hover:text-ink">{d.footer.support}</Link>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp}>
            <h3 className="mb-5 font-serif text-lg italic text-ink/75">{d.footer.contactForm.heading}</h3>
            <ContactForm dark={false} />
          </motion.div>
        </div>

        {/* Internal-linking cluster for the SEO content pages — without this,
            they'd be orphan pages reachable only by direct URL/search, which
            both hurts their own crawlability and wastes the link equity a
            footer on every page could otherwise pass to them. */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mt-14 border-t border-ink/10 pt-10">
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-wide text-ink/40">Explore Kolab</motion.p>
          <motion.nav aria-label="More on Kolab" variants={fadeUp} className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/75">
            <Link to="/creator-marketplace-nepal" className="transition-colors hover:text-ink">Creator Marketplace Nepal</Link>
            <Link to="/content-creators" className="transition-colors hover:text-ink">For Creators</Link>
            <Link to="/brands" className="transition-colors hover:text-ink">For Brands</Link>
            <Link to="/influencers" className="transition-colors hover:text-ink">Influencers</Link>
            <Link to="/find-campaigns" className="transition-colors hover:text-ink">Find Campaigns</Link>
            <Link to="/influencer-marketing-nepal" className="transition-colors hover:text-ink">Influencer Marketing</Link>
            <Link to="/brand-collaboration-nepal" className="transition-colors hover:text-ink">Brand Collaboration</Link>
            <Link to="/tiktok-creators" className="transition-colors hover:text-ink">TikTok Creators</Link>
            <Link to="/instagram-creators" className="transition-colors hover:text-ink">Instagram Creators</Link>
            <Link to="/youtube-creators" className="transition-colors hover:text-ink">YouTube Creators</Link>
            <Link to="/facebook-creators" className="transition-colors hover:text-ink">Facebook Creators</Link>
          </motion.nav>
        </motion.div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink/10 pt-6 md:flex-row">
          <p className="text-xs text-ink/75">© {new Date().getFullYear()} kolab. {d.footer.rights}</p>
          <p className="text-xs text-ink/75">{d.footer.madeIn} 🇳🇵</p>
        </div>
      </div>
    </footer>
  );
}
