import { LayoutGrid } from 'lucide-react';
import { NicheHubPage } from './niche/NicheHubPage';
import { INDUSTRY_PAGES } from './niche/industries.data';

export function IndustriesHubPage() {
  return (
    <NicheHubPage
      slug="industries-nepal"
      seoTitle="Influencers by Industry in Nepal | Browse All Niches"
      seoDescription="Browse Nepali influencers and content creators by industry — food, travel, fashion, beauty, fitness, tech, and more — and hire the right creator for your brand."
      keywords={['influencers by industry Nepal', 'niche influencers Nepal', 'industry influencers Nepal', 'creator categories Nepal']}
      breadcrumbName="Influencers by Industry"
      icon={LayoutGrid}
      eyebrow="Browse by Industry"
      heading="Influencers by Industry in Nepal"
      intro="Every industry needs a different kind of creator. Browse Kolab's niche pages to find influencers who already make content for your category — from food and travel to tech and real estate."
      gridHeading="Choose an industry"
      items={INDUSTRY_PAGES}
      ctaHeading="Find the Right Creators for Your Industry"
      ctaSub="Download Kolab and start browsing creators by category."
    />
  );
}
