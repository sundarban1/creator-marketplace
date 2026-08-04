import { Map } from 'lucide-react';
import { NicheHubPage } from './niche/NicheHubPage';
import { CITY_PAGES } from './niche/cities.data';

export function CitiesHubPage() {
  return (
    <NicheHubPage
      slug="cities-nepal"
      seoTitle="Influencers by City in Nepal | Kathmandu, Pokhara & More"
      seoDescription="Browse Nepali influencers and content creators by city — Kathmandu, Pokhara, Lalitpur, Bhaktapur, Chitwan, Butwal, Biratnagar, and Dharan."
      keywords={['influencers by city Nepal', 'city influencers Nepal', 'local influencers Nepal', 'Nepal influencer cities', 'Kathmandu content creators', 'Kathmandu influencers', 'Pokhara influencers', 'Lalitpur influencers', 'Bhaktapur creators', 'Chitwan influencers', 'Biratnagar influencers', 'Butwal influencers', 'Dharan influencers']}
      breadcrumbName="Influencers by City"
      icon={Map}
      eyebrow="Browse by City"
      heading="Influencers by City in Nepal"
      intro="Find creators based in the city that matters for your campaign — from Kathmandu's large, all-category creator base to Pokhara's travel and hospitality specialists."
      gridHeading="Choose a city"
      items={CITY_PAGES}
      ctaHeading="Find Local Creators in Your City"
      ctaSub="Download Kolab and start browsing creators by location."
    />
  );
}
