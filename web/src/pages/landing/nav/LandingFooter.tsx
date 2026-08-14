import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingTheme } from '../context/ThemeContext';
import { ContactForm } from '../components/ContactForm';

// Same gradient-underline-sweep hover used by the main nav links (LandingNav) —
// reused here so every text link on the page commits to one hover language
// instead of the footer inventing its own.
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="group relative inline-flex w-fit items-center gap-1 py-0.5 text-ink-soft transition-colors duration-300 hover:text-ink dark:text-white/75 dark:hover:text-white">
      <span>{children}</span>
      <ArrowUpRight
        size={13}
        className="-translate-y-px translate-x-0 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 ease-out group-hover:scale-x-100"
      />
    </Link>
  );
}

export function LandingFooter() {
  const { d } = useLandingLanguage();
  const { theme } = useLandingTheme();

  return (
    <footer id={SECTION_IDS.contact} className="relative bg-paper py-16 text-ink dark:bg-ink dark:text-white">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent dark:via-white/10" />
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 md:grid-cols-2">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
            <motion.div variants={fadeUp} className="mb-3 flex w-fit items-center">
              <img src="/logo.png" alt="Kolab" loading="lazy" className="h-6 w-auto object-contain" />
            </motion.div>
            <motion.p variants={fadeUp} className="max-w-xs text-sm leading-relaxed text-ink-soft dark:text-white/75">
              {d.footer.tagline}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <FooterLink to="/privacy">{d.footer.privacy}</FooterLink>
              <FooterLink to="/terms">{d.footer.terms}</FooterLink>
              <FooterLink to="/support">{d.footer.support}</FooterLink>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp}>
            <h3 className="mb-5 font-serif text-lg italic text-ink-soft dark:text-white/75">{d.footer.contactForm.heading}</h3>
            {/* ContactForm's `dark` prop is its own surface switch (which color
                card it's sitting on), independent of the page theme in general —
                but the footer's surface now follows the page theme 1:1, so it's
                wired straight to it here. */}
            <ContactForm dark={theme === 'dark'} />
          </motion.div>
        </div>

        {/* Internal-linking cluster for the SEO content pages — without this,
            they'd be orphan pages reachable only by direct URL/search, which
            both hurts their own crawlability and wastes the link equity a
            footer on every page could otherwise pass to them. */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mt-14 border-t border-ink/10 pt-10 dark:border-white/10">
          <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-wide text-ink/40 dark:text-white/40">Explore Kolab</motion.p>
          <motion.nav aria-label="More on Kolab" variants={fadeUp} className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <FooterLink to="/creator-marketplace-nepal">Creator Marketplace Nepal</FooterLink>
            <FooterLink to="/content-creators">For Creators</FooterLink>
            <FooterLink to="/brands">For Brands</FooterLink>
            <FooterLink to="/influencers">Influencers</FooterLink>
            <FooterLink to="/find-campaigns">Find Campaigns</FooterLink>
            <FooterLink to="/influencer-marketing-nepal">Influencer Marketing</FooterLink>
            <FooterLink to="/brand-collaboration-nepal">Brand Collaboration</FooterLink>
            <FooterLink to="/tiktok-creators">TikTok Creators</FooterLink>
            <FooterLink to="/instagram-creators">Instagram Creators</FooterLink>
            <FooterLink to="/youtube-creators">YouTube Creators</FooterLink>
            <FooterLink to="/facebook-creators">Facebook Creators</FooterLink>
            <FooterLink to="/paid-collaborations-nepal">Paid Collaborations</FooterLink>
            <FooterLink to="/industries-nepal">Browse by Industry</FooterLink>
            <FooterLink to="/cities-nepal">Browse by City</FooterLink>
          </motion.nav>
        </motion.div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 border-t border-ink/10 pt-6 dark:border-white/10">
          <p className="text-xs text-ink-soft dark:text-white/75">© {new Date().getFullYear()} Kolab Technologies Pvt. Ltd. {d.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
