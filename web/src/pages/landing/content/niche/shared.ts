import { Compass, Handshake, MessageSquare, ShieldCheck } from 'lucide-react';
import type { BenefitItem } from '../../components/ContentBlocks';
import type { FAQItem } from '../../components/FAQAccordion';
import type { RelatedLink } from '../ContentPageLayout';
import type { LandingLang } from '../../context/LanguageContext';

// Parametrized building blocks reused across the industry/city niche pages
// (see NichePage.tsx) — the brand-facing mechanics of Kolab (discover,
// message, pay via escrow) are identical regardless of niche, so only the
// wording plugs in the niche label rather than being rewritten per page.
// Each template carries both languages so translating it once here covers
// every niche page instead of duplicating the boilerplate sentences per city
// or industry entry.

export interface NicheLabel {
  en: string;
  ne: string;
}

export function defaultBenefits(label: NicheLabel, lang: LandingLang): BenefitItem[] {
  if (lang === 'ne') {
    return [
      { icon: Compass, title: 'निच र स्थान अनुसार पत्ता लगाउनुहोस्', desc: `${label.ne} फेला पार्न श्रेणी र सहर अनुसार क्रिएटर प्रोफाइल फिल्टर गर्नुहोस्, जसले पहिले नै तपाईंको ब्रिफ नजिकको सामग्री बनाइरहेका छन्।` },
      { icon: Handshake, title: 'क्याम्पेन वा इभेन्ट पोस्ट गर्नुहोस्', desc: 'तलबसहितको क्याम्पेनको लागि बजेट र डेलिभरेबल तय गर्नुहोस्, वा सामग्री र एक्सपोजरको बदलामा निःशुल्क खुला इभेन्ट प्रस्ताव गर्नुहोस्।' },
      { icon: MessageSquare, title: 'सिधै म्यासेज गर्नुहोस्', desc: 'क्रिएटरले आवेदन दिएपछि, एपभित्रै नै ब्रिफ, समयसीमा, र क्रिएटिभ दिशामा सहमत हुनुहोस् — छरिएका DM हरू आवश्यक छैन।' },
      { icon: ShieldCheck, title: 'एस्क्रो सुरक्षासहित भुक्तानी गर्नुहोस्', desc: 'क्याम्पेन बजेट एस्क्रोमा राखिन्छ र तपाईंले सम्पन्न कामलाई स्वीकृत गरेपछि मात्र रिलिज हुन्छ।' },
    ];
  }
  return [
    { icon: Compass, title: 'Discover by niche & location', desc: `Filter creator profiles by category and city to find ${label.en} who already make content close to your brief.` },
    { icon: Handshake, title: 'Post a campaign or event', desc: 'Set a budget and deliverables for a paid campaign, or offer a free open event in exchange for content and exposure.' },
    { icon: MessageSquare, title: 'Message directly', desc: 'Once a creator applies, align on the brief, timeline, and creative direction in-app — no scattered DMs.' },
    { icon: ShieldCheck, title: 'Pay with escrow protection', desc: 'Campaign budgets are held in escrow and released once you approve the finished work.' },
  ];
}

export function defaultSteps(label: NicheLabel, lang: LandingLang): string[] {
  if (lang === 'ne') {
    return [
      'Kolab मा व्यावसायिक खाता खोल्नुहोस् र तलबसहितको क्याम्पेन वा निःशुल्क खुला इभेन्ट पोस्ट गर्नुहोस्।',
      `तपाईंको श्रेणी, प्लेटफर्म, बजेट वा प्रस्ताव तय गर्नुहोस्, र नेपालभरि जहाँ पनि रहेका ${label.ne} लाई लक्षित गर्नुहोस्।`,
      'क्रिएटर प्रोफाइलहरू सिधै हेर्नुहोस्, वा क्रिएटरहरूले तपाईंको क्याम्पेनमा पेश गरेका प्रस्तावहरू समीक्षा गर्नुहोस्।',
      'ब्रिफ, डेलिभरेबल, र समयसीमामा सहमत हुन छनोट गरिएका क्रिएटरहरूलाई एपभित्रै म्यासेज गर्नुहोस्।',
      'सम्पन्न सामग्री स्वीकृत गर्नुहोस् र Kolab को एस्क्रो-सुरक्षित प्रणालीमार्फत भुक्तानी रिलिज गर्नुहोस्।',
      'सहकार्य सकिएपछि समीक्षा छोड्नुहोस्, जसले भविष्यका क्याम्पेनहरूको लागि ट्र्याक रेकर्ड बनाउँछ।',
    ];
  }
  return [
    'Create a business account on Kolab and post a paid campaign or a free open event.',
    `Set your category, platform, budget or offer, and target ${label.en} anywhere in Nepal.`,
    'Browse creator profiles directly, or review the proposals creators submit to your campaign.',
    'Message shortlisted creators in-app to align on the brief, deliverables, and timeline.',
    'Approve the finished content and release payment through Kolab’s escrow-protected system.',
    'Leave a review once the collaboration wraps up, building a track record for future campaigns.',
  ];
}

export function defaultFaqs(label: NicheLabel, lang: LandingLang, extra: FAQItem[] = []): FAQItem[] {
  if (lang === 'ne') {
    return [
      {
        question: `Kolab मा ${label.ne} कसरी फेला पार्ने?`,
        answer: `Kolab मा क्रिएटर प्रोफाइलहरू हेर्नुहोस् र ${label.ne} फेला पार्न श्रेणी, प्लेटफर्म, र स्थान अनुसार फिल्टर गर्नुहोस्। प्रत्येक प्रोफाइलमा क्रिएटरको निच र जोडिएका प्लेटफर्महरू देखिन्छन्, ताकि सम्पर्क गर्नु वा क्याम्पेन पोस्ट गर्नुअघि नै उपयुक्तता जाँच्न सकियोस्।`,
      },
      ...extra,
      {
        question: 'के Kolab का क्रिएटरहरू प्रमाणित छन्?',
        answer: 'क्रिएटर खाताहरू पहिचान प्रमाणीकरणबाट गुज्रन्छन्, जसमा इमेल र फोन प्रमाणीकरणसँगै नागरिकता-कागजात जाँच पनि समावेश छ, ताकि व्यवसायहरूले सहकार्य गर्नुअघि नै साँचो, प्रमाणित क्रिएटरसँग व्यवहार गरिरहेका छन् भन्ने थाहा पाउन सकून्।',
      },
      {
        question: 'भुक्तानी कसरी काम गर्छ?',
        answer: 'तलबसहितका क्याम्पेनहरूमा एस्क्रो-सुरक्षित भुक्तानी प्रयोग हुन्छ — तपाईंले तय गरेको बजेट सुरक्षित रूपमा राखिन्छ र तपाईंले सम्पन्न काम स्वीकृत गरेपछि मात्र क्रिएटरलाई रिलिज हुन्छ, जसले कुनै पनि पक्ष कुर्नु वा जोखिममा पर्नु पर्दैन।',
      },
      {
        question: 'के Kolab प्रयोग गर्न निःशुल्क छ?',
        answer: 'Kolab iOS र Android मा निःशुल्क डाउनलोड हो। क्रिएटरहरूले निःशुल्क प्रोफाइल बनाउँछन् र क्याम्पेनहरूमा आवेदन दिन्छन्। व्यवसायहरूले खाता खोल्छन् र तलबसहितको क्याम्पेन वा खुला इभेन्ट पोस्ट गर्दा आफ्नै क्याम्पेन बजेट तय गर्छन्।',
      },
    ];
  }
  return [
    {
      question: `How do I find ${label.en} on Kolab?`,
      answer: `Browse creator profiles on Kolab and filter by category, platform, and location to find ${label.en}. Each profile shows the creator’s niche and connected platforms so you can judge fit before reaching out or posting a campaign.`,
    },
    ...extra,
    {
      question: 'Are creators on Kolab verified?',
      answer: 'Creator accounts go through identity verification, including citizenship-document checks alongside email and phone verification, so businesses know they’re dealing with a real, verifiable creator before collaborating.',
    },
    {
      question: 'How does payment work?',
      answer: 'Paid campaigns use escrow-protected payments — the budget you set is held securely and released to the creator once you approve the completed work, so neither side is left waiting or exposed.',
    },
    {
      question: 'Is Kolab free to use?',
      answer: 'Kolab is a free download on iOS and Android. Creators build a profile and apply to campaigns at no cost. Businesses create an account and set their own campaign budgets when posting a paid campaign or open event.',
    },
  ];
}

export const CORE_RELATED: Record<LandingLang, RelatedLink[]> = {
  en: [
    { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
    { label: 'For Brands', path: '/brands', description: 'Post campaigns and hire verified creators across Nepal.' },
    { label: 'For Content Creators', path: '/content-creators', description: 'Build a profile and apply to paid campaigns.' },
    { label: 'Browse Influencers', path: '/influencers', description: 'See how Kolab connects businesses with Nepali influencers.' },
  ],
  ne: [
    { label: 'Kolab क्रिएटर मार्केटप्लेस नेपाल', path: '/creator-marketplace-nepal', description: "Kolab को पूर्ण क्रिएटर मार्केटप्लेसको सिंहावलोकन।" },
    { label: 'ब्रान्डहरूका लागि', path: '/brands', description: 'नेपालभरि क्याम्पेन पोस्ट गर्नुहोस् र प्रमाणित क्रिएटरहरू भाडामा लिनुहोस्।' },
    { label: 'कन्टेन्ट क्रिएटरहरूका लागि', path: '/content-creators', description: 'प्रोफाइल बनाउनुहोस् र तलबसहितका क्याम्पेनहरूमा आवेदन दिनुहोस्।' },
    { label: 'इन्फ्लुएन्सरहरू ब्राउज गर्नुहोस्', path: '/influencers', description: 'Kolab ले नेपाली इन्फ्लुएन्सरहरूलाई व्यवसायहरूसँग कसरी जोड्छ हेर्नुहोस्।' },
  ],
};
