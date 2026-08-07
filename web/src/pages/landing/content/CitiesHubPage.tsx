import { Map } from 'lucide-react';
import { NicheHubPage } from './niche/NicheHubPage';
import { CITY_PAGES } from './niche/cities.data';

export function CitiesHubPage() {
  return (
    <NicheHubPage
      slug="cities-nepal"
      keywords={['influencers by city Nepal', 'city influencers Nepal', 'local influencers Nepal', 'Nepal influencer cities', 'Kathmandu content creators', 'Kathmandu influencers', 'Pokhara influencers', 'Lalitpur influencers', 'Bhaktapur creators', 'Chitwan influencers', 'Biratnagar influencers', 'Butwal influencers', 'Dharan influencers']}
      icon={Map}
      items={CITY_PAGES}
      en={{
        seoTitle: 'Influencers by City in Nepal | Kathmandu, Pokhara & More',
        seoDescription: 'Browse Nepali influencers and content creators by city — Kathmandu, Pokhara, Lalitpur, Bhaktapur, Chitwan, Butwal, Biratnagar, and Dharan.',
        breadcrumbName: 'Influencers by City',
        eyebrow: 'Browse by City',
        heading: 'Influencers by City in Nepal',
        intro: "Find creators based in the city that matters for your campaign — from Kathmandu's large, all-category creator base to Pokhara's travel and hospitality specialists.",
        gridHeading: 'Choose a city',
        ctaHeading: 'Find Local Creators in Your City',
        ctaSub: 'Download Kolab and start browsing creators by location.',
      }}
      ne={{
        seoTitle: 'Influencers by City in Nepal | Kathmandu, Pokhara & More',
        seoDescription: 'Browse Nepali influencers and content creators by city — Kathmandu, Pokhara, Lalitpur, Bhaktapur, Chitwan, Butwal, Biratnagar, and Dharan.',
        breadcrumbName: 'सहर अनुसार इन्फ्लुएन्सरहरू',
        eyebrow: 'सहर अनुसार ब्राउज गर्नुहोस्',
        heading: 'नेपालमा सहर अनुसार इन्फ्लुएन्सरहरू',
        intro: 'तपाईंको क्याम्पेनका लागि महत्त्वपूर्ण सहरमा आधारित क्रिएटरहरू फेला पार्नुहोस् — काठमाडौंको ठूलो, सबै-श्रेणीको क्रिएटर समुदायदेखि पोखराका ट्राभल र हस्पिटालिटी विशेषज्ञहरूसम्म।',
        gridHeading: 'एउटा सहर छान्नुहोस्',
        ctaHeading: 'तपाईंको सहरमा स्थानीय क्रिएटरहरू फेला पार्नुहोस्',
        ctaSub: 'Kolab डाउनलोड गर्नुहोस् र स्थान अनुसार क्रिएटरहरू ब्राउज गर्न सुरु गर्नुहोस्।',
      }}
    />
  );
}
