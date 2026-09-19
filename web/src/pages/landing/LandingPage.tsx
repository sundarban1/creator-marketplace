import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { LenisProvider, useLenisScroll } from './hooks/useLenis';
import { useLandingStats } from './hooks/useLandingStats';
import { useSuccessStories } from './hooks/useSuccessStories';
import { useLandingShowcase } from './hooks/useLandingShowcase';
import { useScrollToTop } from './hooks/useScrollToTop';

// A hard reload should always land at the top (see useScrollToTop.ts) rather
// than the browser's native scroll restoration jumping back to wherever the
// user last was — taking it over here, as early as this module evaluates on
// every load, beats that default before it has a chance to run.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}
import { LandingLanguageProvider } from './context/LanguageContext';
import { LandingThemeProvider } from './context/ThemeContext';
import { CursorSparkles } from './components/CursorSparkles';
import { ScrollProgress } from './components/ScrollProgress';
import { CornerChrome } from './components/CornerChrome';
import { ChatWidget } from './components/ChatWidget';
import { SocialRail } from './components/SocialRail';
import { LaunchAnnouncementModal } from './components/LaunchAnnouncementModal';
import { LandingNav } from './nav/LandingNav';
import { LandingFooter } from './nav/LandingFooter';
import { SEO } from '../../lib/seo/SEO';
import { organizationSchema, websiteSchema } from '../../lib/seo/schema';
import { Hero } from './sections/Hero';
import { CreatorStory } from './sections/CreatorStory';
import { BusinessStory } from './sections/BusinessStory';
import { TrustStats } from './sections/TrustStats';
import { Categories } from './sections/Categories';
import { LiveOnKolab } from './sections/LiveOnKolab';
import { Security } from './sections/Security';
import { Stories } from './sections/Stories';
import { FinalCTA } from './sections/FinalCTA';
import { OldWay } from './sections/OldWay';

// FooterAnchorLink falls back to a real `/#id` navigation when it renders
// outside this page's LenisProvider (any other route) — this is what makes
// that link land back on the right in-page section instead of just at the
// top of the freshly-mounted home page. A fixed delay (rather than firing on
// mount) gives Lenis + the sections above the target a moment to finish
// their own mount-time layout work first.
function HashScrollHandler() {
  const { scrollTo } = useLenisScroll();

  useEffect(() => {
    if (!window.location.hash) return;
    const hash = window.location.hash;
    // Sections below the fold (and their images) settle their height well
    // after mount, which moves the target and can leave a single early
    // scrollTo landing short or getting cancelled by a ScrollTrigger.refresh.
    // Re-fire a few times over ~2s so the last attempt lands after layout
    // settles; stop early once the target is at the top of the viewport.
    const delays = [400, 800, 1300, 2000];
    const timers = delays.map((d) =>
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>(hash);
        if (!el) return;
        if (Math.abs(el.getBoundingClientRect().top) < 4) return;
        scrollTo(hash);
      }, d),
    );
    return () => timers.forEach(clearTimeout);
  }, [scrollTo]);

  return null;
}

function LandingPageInner() {
  useScrollToTop();
  const stats = useLandingStats();
  const { status: storiesStatus, stories: successStories } = useSuccessStories();
  const { events, creators, businesses, categoryMeta } = useLandingShowcase();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-display dark:bg-ink">
      <SEO
        title="Kolab – Nepal's Creator Marketplace for Brands & Influencers"
        description="Kolab is Nepal's creator marketplace. Hire verified influencers, launch campaigns, and grow your brand — or find paid collaborations as a content creator."
        path="/"
        keywords={[
          // Top 10 priority
          'creator marketplace Nepal', 'influencer marketplace Nepal', 'hire influencers Nepal', 'Nepal influencers',
          'find content creators Nepal', 'influencer marketing Nepal', 'brand collaborations Nepal',
          'paid collaborations Nepal', 'content creators Nepal', 'best influencer marketing platform Nepal',
          // Brand-side
          'hire TikTok influencers Nepal', 'hire Instagram influencers Nepal', 'hire YouTube creators Nepal',
          'find Nepali influencers', 'find content creators for business', 'influencer marketing platform Nepal',
          'creator platform Nepal', 'brand promotion Nepal', 'campaign management Nepal', 'brand ambassador Nepal',
          'branded product development Nepal',
          // Creator-side
          'brand deals Nepal', 'sponsorship opportunities Nepal', 'get brand deals Nepal',
          'earn from social media Nepal', 'influencer jobs Nepal', 'content creator jobs Nepal',
          'creator community Nepal', 'creator network Nepal',
          // Platform-specific
          'TikTok creators Nepal', 'Instagram influencers Nepal', 'YouTube creators Nepal', 'Facebook influencers Nepal',
          // Long-tail
          'how to get brand deals in Nepal', 'how to find influencers in Nepal', 'best creator marketplace Nepal',
          'where to hire Nepali influencers', 'top Nepali influencers', 'best influencer platform in Nepal',
          'where to hire influencers in Nepal', 'where to find content creators in Nepal', 'verified content creators Nepal',
          // UGC & creator size
          'UGC creators Nepal', 'hire UGC creators Nepal', 'micro influencers Nepal', 'nano influencers Nepal',
          // Discovery
          'discover creators Nepal', 'discover influencers Nepal', 'digital creators Nepal', 'social media creators Nepal',
          'hire content creators Nepal', 'hire content creators in Nepal',
          // Brand & search variations
          'OurKolab', 'Kolab Nepal', 'kolab app', 'colab Nepal', 'collab Nepal', 'collab app Nepal',
        ]}
        jsonLd={[organizationSchema(), websiteSchema()]}
      />
      <HashScrollHandler />
      <CursorSparkles />
      <ScrollProgress />
      <CornerChrome />
      <SocialRail />
      <LaunchAnnouncementModal />
      <LandingNav />
      <Hero stats={stats} creators={creators} />
      <OldWay />
      <LiveOnKolab events={events} creators={creators} businesses={businesses} categoryMeta={categoryMeta} />
      <CreatorStory />
      <BusinessStory />
      <TrustStats stats={stats} />
      <Security />
      <Categories stats={stats} />
      <Stories status={storiesStatus} stories={successStories} />
      <FinalCTA creators={creators} businesses={businesses} />
      <LandingFooter />
      <ChatWidget />
    </div>
  );
}

export function LandingPage() {
  return (
    <LandingThemeProvider>
      <LandingLanguageProvider>
        {/* Covers every motion.* component's own whileInView/hover animation
            (fadeUp, stagger, scaleIn, CARD_HOVER, iconPop, …) in one place —
            most sections declare those directly via `variants`/`animate` props
            without individually checking useReducedMotion themselves. Sections
            with their own custom motion logic (GSAP, setInterval loops, CSS
            keyframe classes) call useReducedMotion() directly for that, which
            this doesn't touch — the two are complementary, not overlapping. */}
        <MotionConfig reducedMotion="user">
          <LenisProvider>
            <LandingPageInner />
          </LenisProvider>
        </MotionConfig>
      </LandingLanguageProvider>
    </LandingThemeProvider>
  );
}
