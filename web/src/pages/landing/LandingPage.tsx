import { LenisProvider } from './hooks/useLenis';
import { LandingLanguageProvider } from './context/LanguageContext';
import { LandingNav } from './nav/LandingNav';
import { LandingFooter } from './nav/LandingFooter';
import { Hero } from './sections/Hero';
import { TrustStats } from './sections/TrustStats';
import { HowItWorks } from './sections/HowItWorks';
import { Audience } from './sections/Audience';
import { Categories } from './sections/Categories';
import { Partners } from './sections/Partners';
import { Security } from './sections/Security';
import { Stories } from './sections/Stories';
import { FinalCTA } from './sections/FinalCTA';

function LandingPageInner() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-display">
      <LandingNav />
      <Hero />
      <TrustStats />
      <HowItWorks />
      <Audience />
      <Categories />
      <Partners />
      <Security />
      <Stories />
      <FinalCTA />
      <LandingFooter />
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
