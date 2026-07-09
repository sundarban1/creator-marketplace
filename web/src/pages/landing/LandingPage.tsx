import { LenisProvider } from './hooks/useLenis';
import { LandingLanguageProvider } from './context/LanguageContext';
import { LandingNav } from './nav/LandingNav';
import { LandingFooter } from './nav/LandingFooter';
import { Hero } from './sections/Hero';
import { ProductHighlights } from './sections/ProductHighlights';
import { CreatorShowcase } from './sections/CreatorShowcase';
import { BrandShowcase } from './sections/BrandShowcase';
import { CampaignTypes } from './sections/CampaignTypes';
import { MarketplaceWorkflow } from './sections/MarketplaceWorkflow';
import { AIExperience } from './sections/AIExperience';
import { TrustStats } from './sections/TrustStats';
import { Testimonials } from './sections/Testimonials';
import { MobileAppShowcase } from './sections/MobileAppShowcase';
import { FinalCTA } from './sections/FinalCTA';

function LandingPageInner() {
  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      <LandingNav />
      <Hero />
      <ProductHighlights />
      <CreatorShowcase />
      <BrandShowcase />
      <AIExperience />
      <CampaignTypes />
      <MarketplaceWorkflow />
      <TrustStats />
      <Testimonials />
      <MobileAppShowcase />
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
