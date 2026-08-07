import { LayoutGrid } from 'lucide-react';
import { NicheHubPage } from './niche/NicheHubPage';
import { INDUSTRY_PAGES } from './niche/industries.data';

export function IndustriesHubPage() {
  return (
    <NicheHubPage
      slug="industries-nepal"
      keywords={['influencers by industry Nepal', 'niche influencers Nepal', 'industry influencers Nepal', 'creator categories Nepal', 'lifestyle influencers Nepal', 'food influencers Nepal', 'tech influencers Nepal', 'travel influencers Nepal', 'fashion influencers Nepal', 'hire creators for restaurant Nepal', 'hire creators for ecommerce Nepal', 'hire creators for hotel Nepal', 'hire creators for travel company Nepal', 'hire creators for startup Nepal']}
      icon={LayoutGrid}
      items={INDUSTRY_PAGES}
      en={{
        seoTitle: 'Influencers by Industry in Nepal | Browse All Niches',
        seoDescription: 'Browse Nepali influencers and content creators by industry — food, travel, fashion, beauty, fitness, tech, and more — and hire the right creator for your brand.',
        breadcrumbName: 'Influencers by Industry',
        eyebrow: 'Browse by Industry',
        heading: 'Influencers by Industry in Nepal',
        intro: "Every industry needs a different kind of creator. Browse Kolab's niche pages to find influencers who already make content for your category — from food and travel to tech and real estate.",
        gridHeading: 'Choose an industry',
        ctaHeading: 'Find the Right Creators for Your Industry',
        ctaSub: 'Download Kolab and start browsing creators by category.',
      }}
      ne={{
        seoTitle: 'Influencers by Industry in Nepal | Browse All Niches',
        seoDescription: 'Browse Nepali influencers and content creators by industry — food, travel, fashion, beauty, fitness, tech, and more — and hire the right creator for your brand.',
        breadcrumbName: 'क्षेत्र अनुसार इन्फ्लुएन्सरहरू',
        eyebrow: 'क्षेत्र अनुसार ब्राउज गर्नुहोस्',
        heading: 'नेपालमा क्षेत्र अनुसार इन्फ्लुएन्सरहरू',
        intro: 'हरेक क्षेत्रलाई फरक किसिमको क्रिएटर चाहिन्छ। तपाईंको श्रेणीका लागि पहिले नै सामग्री बनाइरहेका इन्फ्लुएन्सरहरू फेला पार्न Kolab का निच पृष्ठहरू ब्राउज गर्नुहोस् — खाना र यात्रादेखि प्रविधि र घरजग्गासम्म।',
        gridHeading: 'एउटा क्षेत्र छान्नुहोस्',
        ctaHeading: 'तपाईंको क्षेत्रका लागि उपयुक्त क्रिएटरहरू फेला पार्नुहोस्',
        ctaSub: 'Kolab डाउनलोड गर्नुहोस् र श्रेणी अनुसार क्रिएटरहरू ब्राउज गर्न सुरु गर्नुहोस्।',
      }}
    />
  );
}
