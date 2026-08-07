import { LenisProvider } from './hooks/useLenis';
import { useLandingStats } from './hooks/useLandingStats';
import { useSuccessStories } from './hooks/useSuccessStories';
import { LandingLanguageProvider } from './context/LanguageContext';
import { CursorSparkles } from './components/CursorSparkles';
import { ScrollProgress } from './components/ScrollProgress';
import { CornerChrome } from './components/CornerChrome';
import { ChatWidget } from './components/ChatWidget';
import { LandingNav } from './nav/LandingNav';
import { LandingFooter } from './nav/LandingFooter';
import { SEO } from '../../lib/seo/SEO';
import { organizationSchema, websiteSchema } from '../../lib/seo/schema';
import { Hero } from './sections/Hero';
import { TrustStats } from './sections/TrustStats';
import { HowItWorks } from './sections/HowItWorks';
import { CampaignJourney } from './sections/CampaignJourney';
import { Audience } from './sections/Audience';
import { Categories } from './sections/Categories';
import { Collaboration } from './sections/Collaboration';
import { Partners } from './sections/Partners';
import { Security } from './sections/Security';
import { Stories } from './sections/Stories';

function LandingPageInner() {
  const stats = useLandingStats();
  const successStories = useSuccessStories();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-display">
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
      <CursorSparkles />
      <ScrollProgress />
      <CornerChrome />
      <LandingNav />
      <Hero />
      <TrustStats stats={stats} />
      <Partners />
      <Audience />
      <HowItWorks />
      <CampaignJourney />
      <Collaboration />
      <Security />
      <Stories stories={successStories} />
      <Categories stats={stats} />
      <LandingFooter />
      <ChatWidget />
    </div>
  );
}

export function LandingPage() {
  return (
    <LandingLanguageProvider>
      <LenisProvider>
        <LandingPageInner />
      </LenisProvider>
    </LandingLanguageProvider>
  );
}
