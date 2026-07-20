import { LenisProvider } from './hooks/useLenis';
import { useLandingStats } from './hooks/useLandingStats';
import { LandingLanguageProvider } from './context/LanguageContext';
import { CursorSparkles } from './components/CursorSparkles';
import { ScrollProgress } from './components/ScrollProgress';
import { ChatWidget } from './components/ChatWidget';
import { LandingNav } from './nav/LandingNav';
import { LandingFooter } from './nav/LandingFooter';
import { SEO } from '../../lib/seo/SEO';
import { organizationSchema, websiteSchema } from '../../lib/seo/schema';
import { Hero } from './sections/Hero';
import { TrustStats } from './sections/TrustStats';
import { HowItWorks } from './sections/HowItWorks';
import { Audience } from './sections/Audience';
import { Categories } from './sections/Categories';
import { Collaboration } from './sections/Collaboration';
import { Partners } from './sections/Partners';
import { Security } from './sections/Security';
import { Stories } from './sections/Stories';
import { FinalCTA } from './sections/FinalCTA';

function LandingPageInner() {
  const stats = useLandingStats();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-display">
      <SEO
        title="Kolab – Nepal's Creator Marketplace | Connect Brands & Content Creators"
        description="Kolab helps Nepali brands discover verified content creators, influencers, TikTok creators, Instagram creators, YouTubers and collaborate on paid campaigns."
        path="/"
        keywords={[
          'creator marketplace Nepal', 'content creator Nepal', 'influencer Nepal', 'Nepal influencer platform',
          'hire creator Nepal', 'hire influencer Nepal', 'brand collaboration Nepal', 'creator collaboration',
          'creator marketing Nepal', 'digital creator Nepal', 'social media creator Nepal', 'TikTok creator Nepal',
          'Instagram influencer Nepal', 'YouTube creator Nepal', 'Facebook creator Nepal', 'brand campaign Nepal',
          'creator jobs Nepal', 'influencer marketing Nepal', 'creator platform Nepal', 'OurKolab', 'Kolab Nepal',
        ]}
        jsonLd={[organizationSchema(), websiteSchema()]}
      />
      <CursorSparkles />
      <ScrollProgress />
      <LandingNav />
      <Hero />
      <TrustStats stats={stats} />
      <Partners />
      <HowItWorks />
      <Audience />
      <Collaboration />
      <Categories stats={stats} />
      <Security />
      <Stories />
      <FinalCTA />
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
