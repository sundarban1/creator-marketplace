import { Logo } from '../../../app/ui/Logo';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa6';
import { fadeUp, stagger, VP, PILL_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useSiteInfo } from '../hooks/useSiteInfo';
import { ContactForm } from '../components/ContactForm';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { useLenisScrollOptional } from '../hooks/useLenis';
import { useLandingTheme } from '../context/ThemeContext';

// Same brand colors as SocialRail — this is the compact inline counterpart
// shown in the footer itself, not a replacement for that fixed side rail.
const SOCIAL_ICONS = [
  { key: 'facebook' as const, Icon: FaFacebook, label: 'Facebook', color: '#1877F2' },
  { key: 'instagram' as const, Icon: FaInstagram, label: 'Instagram', color: '#E1306C' },
  { key: 'tiktok' as const, Icon: FaTiktok, label: 'TikTok', color: '#000000' },
  { key: 'youtube' as const, Icon: FaYoutube, label: 'YouTube', color: '#FF0000' },
];

// Same gradient-underline-sweep hover used by the main nav links (LandingNav) —
// reused here so every text link on the page commits to one hover language
// instead of the footer inventing its own.
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="group relative inline-flex w-fit items-center gap-1 py-0.5 text-lp-fg/60 transition-colors duration-300 hover:text-lp-fg">
      <span>{children}</span>
      <ArrowUpRight
        size={13}
        className="-translate-y-px translate-x-0 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0.5 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-lp-brinjal to-lp-orange transition-transform duration-300 ease-out group-hover:scale-x-100"
      />
    </Link>
  );
}

const ANCHOR_LINK_CLASSES =
  'group relative inline-flex w-fit items-center gap-1 py-0.5 text-left text-lp-fg/60 transition-colors duration-300 hover:text-lp-fg';

// Same visual language as FooterLink but for in-page section anchors (the
// "Discover" column's People/Services/Opportunities/Events) rather than
// routed content pages — those don't have dedicated pages of their own yet.
//
// LandingFooter itself renders on two kinds of routes: the single-page home
// route (wrapped in LenisProvider, where these ids actually exist on the
// page) and standalone/content routes like /privacy or /content-creators
// (no LenisProvider, and no #possibilities etc. on that page at all). Outside
// the provider this falls back to navigating home with `state.scrollTo` instead of
// calling the Lenis-only scrollTo — that used to throw and crash the whole
// page (caught by the ErrorBoundary as "Something went wrong"), which is why
// every footer link looked broken on any page other than the homepage.
function FooterAnchorLink({ id, children }: { id: string; children: React.ReactNode }) {
  const lenis = useLenisScrollOptional();

  if (!lenis) {
    return (
      <Link to="/" state={{ scrollTo: id }} className={ANCHOR_LINK_CLASSES}>
        <span>{children}</span>
        <span
          aria-hidden
          className="absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-lp-brinjal to-lp-orange transition-transform duration-300 ease-out group-hover:scale-x-100"
        />
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => lenis.scrollTo(`#${id}`)} className={ANCHOR_LINK_CLASSES}>
      <span>{children}</span>
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-lp-brinjal to-lp-orange transition-transform duration-300 ease-out group-hover:scale-x-100"
      />
    </button>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp}>
      <p className="text-[15px] font-bold text-lp-fg">{title}</p>
      <nav className="mt-4 flex flex-col gap-2.5 text-sm">{children}</nav>
    </motion.div>
  );
}

export function LandingFooter() {
  const { d } = useLandingLanguage();
  const { theme } = useLandingTheme();
  const siteInfo = useSiteInfo();
  const activeSocials = SOCIAL_ICONS.filter(({ key }) => siteInfo?.social[key]);

  return (
    <footer id={SECTION_IDS.contact} className="relative bg-lp-navy py-16 font-body text-lp-fg">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lp-fg/15 to-transparent" />
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 md:grid-cols-2">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
            <motion.div variants={fadeUp} className="mb-3 flex w-fit items-center">
              <Logo asLink={false} className="h-9 object-contain" />
            </motion.div>
            <motion.p variants={fadeUp} className="max-w-xs text-sm font-light leading-relaxed text-lp-fg/70">
              {d.footer.tagline}
            </motion.p>

            {/* Admin-managed via the dashboard's Company page — each row only
                renders once its value is set, so an unconfigured field just
                doesn't take up space rather than showing blank/placeholder text.
                siteInfo lands async (and slow on a cold backend), often after
                the parent's one-shot whileInView has already fired — so this
                block runs its own mount animation instead of inheriting the
                stagger variant, which would otherwise leave it stuck at
                opacity:0 (in the DOM but invisible). */}
            {siteInfo && (siteInfo.address || siteInfo.phone || siteInfo.email) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 flex flex-col gap-2 text-sm text-lp-fg/65">
                {siteInfo.address && (
                  <span className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0 text-lp-accent-ink" />
                    {siteInfo.address}
                  </span>
                )}
                {siteInfo.phone && (
                  <a href={`tel:${siteInfo.phone}`} className="flex items-center gap-2 transition-colors hover:text-lp-fg">
                    <Phone size={14} className="flex-shrink-0 text-lp-accent-ink" />
                    {siteInfo.phone}
                  </a>
                )}
                {siteInfo.email && (
                  <a href={`mailto:${siteInfo.email}`} className="flex items-center gap-2 transition-colors hover:text-lp-fg">
                    <Mail size={14} className="flex-shrink-0 text-lp-accent-ink" />
                    {siteInfo.email}
                  </a>
                )}
              </motion.div>
            )}

            {activeSocials.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 flex items-center gap-2.5">
                {activeSocials.map(({ key, Icon, label }) => (
                  <motion.a
                    key={key}
                    href={siteInfo!.social[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    whileHover={PILL_HOVER}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-lp-fg/[0.08] text-lp-fg/80 transition-colors hover:bg-lp-fg/15 hover:text-lp-fg"
                  >
                    <Icon size={14} />
                  </motion.a>
                ))}
              </motion.div>
            )}
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp}>
            <h3 className="mb-5 text-[15px] font-bold text-lp-fg">{d.footer.contactForm.heading}</h3>
            {/* ContactForm's `dark` prop picks its surface styling; the footer's
                surface follows the page theme, so it's wired straight to it. */}
            <ContactForm dark={theme === 'dark'} />
          </motion.div>
        </div>

        {/* Nav columns + app download — folds the internal-linking cluster for
            the SEO content pages (so they stay crawlable/indexable instead of
            orphan pages reachable only by direct URL) into a labeled layout
            instead of one flat unlabeled grid. */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.08)}
          className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-lp-fg/10 pt-10 sm:grid-cols-3 lg:grid-cols-5"
        >
          <FooterColumn title={d.footer.columns.discover}>
            <FooterAnchorLink id={SECTION_IDS.creatorStory}>{d.nav.links.forCreators}</FooterAnchorLink>
            <FooterAnchorLink id={SECTION_IDS.businessStory}>{d.nav.links.forBusinesses}</FooterAnchorLink>
            <FooterAnchorLink id={SECTION_IDS.categories}>{d.possibilities.cards.services.title}</FooterAnchorLink>
            <FooterAnchorLink id={SECTION_IDS.liveOnKolab}>{d.nav.links.discover}</FooterAnchorLink>
          </FooterColumn>

          <FooterColumn title={d.footer.columns.forCreators}>
            <FooterLink to="/creator-marketplace-nepal">Creator Marketplace Nepal</FooterLink>
            <FooterLink to="/content-creators">For Creators</FooterLink>
            <FooterLink to="/influencers">Influencers</FooterLink>
            <FooterLink to="/tiktok-creators">TikTok Creators</FooterLink>
            <FooterLink to="/instagram-creators">Instagram Creators</FooterLink>
            <FooterLink to="/youtube-creators">YouTube Creators</FooterLink>
            <FooterLink to="/facebook-creators">Facebook Creators</FooterLink>
          </FooterColumn>

          <FooterColumn title={d.footer.columns.forBusinesses}>
            <FooterLink to="/brands">For Brands</FooterLink>
            <FooterLink to="/find-campaigns">Find Campaigns</FooterLink>
            <FooterLink to="/influencer-marketing-nepal">Influencer Marketing</FooterLink>
            <FooterLink to="/brand-collaboration-nepal">Brand Collaboration</FooterLink>
            <FooterLink to="/paid-collaborations-nepal">Paid Collaborations</FooterLink>
          </FooterColumn>

          <FooterColumn title={d.footer.columns.company}>
            <FooterLink to="/about">{d.nav.links.about}</FooterLink>
            <FooterLink to="/trust-and-safety">{d.nav.links.trustSafety}</FooterLink>
            <FooterLink to="/industries-nepal">Browse by Industry</FooterLink>
            <FooterLink to="/cities-nepal">Browse by City</FooterLink>
            <FooterLink to="/support">{d.footer.support}</FooterLink>
            <FooterLink to="/privacy">{d.footer.privacy}</FooterLink>
            <FooterLink to="/terms">{d.footer.terms}</FooterLink>
          </FooterColumn>

          <motion.div variants={fadeUp}>
            <p className="text-[15px] font-bold text-lp-fg">{d.footer.downloadApp}</p>
            <div className="mt-4"><AppStoreBadges /></div>
          </motion.div>
        </motion.div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-lp-fg/10 pt-6 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <FooterLink to="/privacy">{d.footer.privacy}</FooterLink>
            <FooterLink to="/terms">{d.footer.terms}</FooterLink>
            <FooterLink to="/support">{d.footer.support}</FooterLink>
          </div>
          {/* Admin-managed via the dashboard's Company page — only renders once set */}
          {(siteInfo?.companyRegistrationNumber || siteInfo?.companyPan) && (
            <p className="text-xs text-lp-fg/50">
              {[
                siteInfo.companyRegistrationNumber && `Company Reg. No. ${siteInfo.companyRegistrationNumber}`,
                siteInfo.companyPan && `PAN ${siteInfo.companyPan}`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="text-xs text-lp-fg/50">© {new Date().getFullYear()} Kolab Technologies Private Limited. {d.footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
