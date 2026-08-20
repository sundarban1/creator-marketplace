import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { LenisProvider, useLenisScroll } from './hooks/useLenis';
import { useLandingStats } from './hooks/useLandingStats';
import { useSuccessStories } from './hooks/useSuccessStories';
import { LandingLanguageProvider } from './context/LanguageContext';
import { LandingThemeProvider } from './context/ThemeContext';
import { CursorSparkles } from './components/CursorSparkles';
import { ScrollProgress } from './components/ScrollProgress';
import { CornerChrome } from './components/CornerChrome';
import { ChatWidget } from './components/ChatWidget';
import { SocialRail } from './components/SocialRail';
import { LandingNav } from './nav/LandingNav';
import { LandingFooter } from './nav/LandingFooter';
import { SEO } from '../../lib/seo/SEO';
import { organizationSchema, websiteSchema } from '../../lib/seo/schema';
import { Hero } from './sections/Hero';
import { Possibilities } from './sections/Possibilities';
import { CampaignJourney } from './sections/CampaignJourney';
import { Audience } from './sections/Audience';
import { AIDiscovery } from './sections/AIDiscovery';
import { OpportunityFeed } from './sections/OpportunityFeed';
import { TrustStats } from './sections/TrustStats';
import { Categories } from './sections/Categories';
import { Security } from './sections/Security';
import { Stories } from './sections/Stories';
import { FinalCTA } from './sections/FinalCTA';

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
    const t = setTimeout(() => scrollTo(hash), 400);
    return () => clearTimeout(t);
  }, [scrollTo]);

  return null;
}

function LandingPageInner() {
  const stats = useLandingStats();
  const successStories = useSuccessStories();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-display dark:bg-ink">
      <SEO
        title="Kolab – Nepal's Creator Marketplace | Hire Influencers & Find Brand Collaborations"
        description="Kolab is Nepal's creator marketplace connecting brands with verified influencers and content creators. Hire creators, launch campaigns, and grow your business, or discover paid brand collaborations."
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
      <LandingNav />
      <Hero stats={stats} />
      <Possibilities />
      <Audience />
      <AIDiscovery />
      <OpportunityFeed />
      <TrustStats stats={stats} />
      <Categories stats={stats} />
      <Stories stories={successStories} />
      <CampaignJourney />
      <Security />
      <FinalCTA />
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
