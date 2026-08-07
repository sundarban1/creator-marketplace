import { BadgeCheck, Compass, Filter, Sparkles, Star } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Icons/accents are language-invariant, zipped by index with the translated
// title/desc pulled from COPY[lang] below.
const DISCOVER_ICONS = [Filter, Compass, Sparkles, BadgeCheck];

const PLATFORMS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Twitter / X', 'LinkedIn', 'Pinterest', 'Snapchat', 'Twitch'];
const CATEGORIES = [
  'Food & Beverage', 'Travel', 'Fashion', 'Beauty', 'Fitness & Health', 'Gaming', 'Technology', 'Education',
  'Lifestyle', 'Home & Living', 'Music', 'Art & Design', 'Finance', 'Photography', 'Sports', 'Entertainment',
];
const CATEGORIES_NE = [
  'खाना र पेय', 'ट्राभल', 'फेसन', 'ब्युटी', 'फिटनेस र स्वास्थ्य', 'गेमिङ', 'प्रविधि', 'शिक्षा',
  'लाइफस्टाइल', 'गृह र रहनसहन', 'संगीत', 'कला र डिजाइन', 'फाइनान्स', 'फोटोग्राफी', 'खेलकुद', 'मनोरञ्जन',
];

const COPY = {
  en: {
    seo: {
      title: 'Influencers in Nepal | Discover Verified Creators',
      description: 'Kolab connects Nepali brands with verified influencers across TikTok, Instagram, YouTube, and Facebook. Discover creators and collaborate on paid campaigns.',
    },
    breadcrumbName: 'Influencers',
    eyebrow: 'Influencers in Nepal',
    heading: 'Discover Influencers in Nepal',
    intro: 'Looking for influencers in Nepal? Kolab is where verified influencers across TikTok, Instagram, YouTube, and Facebook are actually discoverable — filterable by category, platform, and city — instead of a manual scroll through hashtags and guesswork.',
    faqs: [
      {
        question: 'How do I find influencers in Nepal on Kolab?',
        answer: 'Browse the creator marketplace and filter by category (fashion, food, tech, fitness, and more), platform (TikTok, Instagram, YouTube, Facebook, and others), and location anywhere in Nepal. You can message a creator directly or post a campaign for influencers to apply to.',
      },
      {
        question: 'What counts as an "influencer" on Kolab?',
        answer: "Any content creator with an active audience on a supported platform — from niche micro-influencers with a highly engaged following to larger creators with reach across several cities. There's no fixed follower threshold; brands match on niche fit as much as follower count.",
      },
      {
        question: 'Are the influencers on Kolab verified?',
        answer: 'Yes. Every creator profile goes through identity verification, confirmed with a citizenship document plus email and phone checks, before it appears on the marketplace.',
      },
      {
        question: 'Can I discover influencers on a specific platform, like TikTok or Facebook?',
        answer: "Yes — filter by platform to see influencers active on TikTok, Instagram, YouTube, Facebook, and more, or browse Kolab's platform-specific pages for a focused view of each one.",
      },
      {
        question: 'How do I actually collaborate with an influencer I find?',
        answer: "Send a collaboration request directly, or post a paid campaign or free open event with your requirements and let interested influencers apply with a proposal. Either way, you message and finalize details directly in-app.",
      },
      {
        question: 'Is discovering influencers on Kolab free?',
        answer: 'Yes — Kolab is a free download, and browsing and filtering the creator marketplace costs nothing. You only set a budget if and when you post a paid campaign.',
      },
    ],
    related: [
      { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
      { label: 'For Brands', path: '/brands', description: 'Post a campaign and hire verified creators.' },
      { label: 'For Content Creators', path: '/content-creators', description: 'Are you a creator? Start here.' },
      { label: 'Find Campaigns', path: '/find-campaigns', description: 'See open campaigns creators can apply to.' },
    ],
    cta: { heading: 'Discover Influencers in Nepal', sub: 'Download Kolab to browse verified creator profiles.' },
    sections: {
      whereToFind: {
        heading: 'Where do you actually find influencers in Nepal?',
        paragraphs: [
          "The usual way brands find influencers in Nepal is manual: scroll a platform's explore tab, search a hashtag, ask around, and hope the person you land on actually responds — with no visibility into whether they've worked with brands before, what they charge, or whether they're even a real, verified account. It works occasionally, but it doesn't scale past one or two collaborations.",
          "Kolab turns that scroll-and-hope process into an actual discovery flow. Instead of searching one platform at a time, you're browsing a single marketplace of influencers across every major platform, filterable by exactly what your campaign needs — category, platform, and city — with verified identities and a transparent history behind every profile.",
        ],
      },
      discover: {
        heading: 'Discover influencers by what your campaign needs',
        benefits: [
          { title: 'Filter by category', desc: `Narrow to influencers in your niche — ${CATEGORIES.slice(0, 6).join(', ')}, and more.` },
          { title: 'Filter by platform', desc: `Find influencers active on ${PLATFORMS.slice(0, 4).join(', ')}, or any of the other supported platforms.` },
          { title: 'Filter by city', desc: 'Discover influencers in Kathmandu, Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, or Nepalgunj.' },
          { title: 'Verified profiles only', desc: 'Every influencer completes identity verification before their profile is visible on the marketplace.' },
        ],
      },
      twoWays: {
        heading: 'Two ways to start a collaboration',
        paragraph: 'Once you\'ve found influencers that fit, there are two ways to move forward. Reach out directly to a specific profile with a collaboration request, or post a paid campaign or free open event with your budget, category, and platform requirements visible, and let interested influencers come to you with proposals. Larger outreach efforts usually work better as a posted campaign; a specific influencer you already have in mind is easier to approach directly.',
        items: [
          'Browse and filter the influencer marketplace by category, platform, and city.',
          'Review a profile\'s platforms, category focus, and past collaboration history.',
          'Message a specific influencer directly, or post a campaign for influencers to apply to.',
          'Agree on deliverables and timeline in-app before any budget moves.',
          'Pay through escrow, released only once you approve the completed work.',
        ],
      },
      builtOnTrust: {
        heading: 'Built on trust, not just follower counts',
        paragraph: "Follower count alone doesn't tell you whether an influencer will actually deliver, respond, or represent your brand well — which is why every part of the collaboration on Kolab is built around verifiable trust instead. Identity is confirmed with a citizenship document plus email and phone checks, payments on paid campaigns are held in escrow until you approve the work, and every collaboration ends with an honest, visible review from both sides — so an influencer's reputation on Kolab is something you can actually check before you commit a budget.",
      },
    },
  },
  ne: {
    seo: {
      title: 'Influencers in Nepal | Discover Verified Creators',
      description: 'Kolab connects Nepali brands with verified influencers across TikTok, Instagram, YouTube, and Facebook. Discover creators and collaborate on paid campaigns.',
    },
    breadcrumbName: 'इन्फ्लुएन्सरहरू',
    eyebrow: 'नेपालमा इन्फ्लुएन्सरहरू',
    heading: 'नेपालमा इन्फ्लुएन्सरहरू फेला पार्नुहोस्',
    intro: 'नेपालमा इन्फ्लुएन्सर खोजिरहनुभएको छ? Kolab नै हो जहाँ TikTok, Instagram, YouTube, र Facebook भरिका प्रमाणित इन्फ्लुएन्सरहरू वास्तवमै फेला पार्न सकिन्छ — ह्यासट्याग स्क्रोल र अनुमानको सट्टा श्रेणी, प्लेटफर्म, र सहरअनुसार फिल्टर गर्दै।',
    faqs: [
      {
        question: 'Kolab मा नेपालका इन्फ्लुएन्सरहरू कसरी फेला पार्ने?',
        answer: 'क्रिएटर मार्केटप्लेस ब्राउज गर्नुहोस् र श्रेणी (फेसन, खाना, प्रविधि, फिटनेस, र अरू धेरै), प्लेटफर्म (TikTok, Instagram, YouTube, Facebook, र अन्य), र नेपालभरि कुनै पनि स्थानअनुसार फिल्टर गर्नुहोस्। तपाईं क्रिएटरलाई सिधै म्यासेज गर्न सक्नुहुन्छ वा इन्फ्लुएन्सरहरूले आवेदन दिनसक्ने क्याम्पेन पोस्ट गर्न सक्नुहुन्छ।',
      },
      {
        question: 'Kolab मा "इन्फ्लुएन्सर" भनेको के हो?',
        answer: 'समर्थित प्लेटफर्ममा सक्रिय दर्शक भएको जुनसुकै कन्टेन्ट क्रिएटर — उच्च संलग्नता भएका निच माइक्रो-इन्फ्लुएन्सरदेखि धेरै सहरमा पहुँच भएका ठूला क्रिएटरसम्म। कुनै निश्चित फलोअर सीमा छैन; ब्रान्डहरूले फलोअर संख्या जत्तिकै निच मिलानमा पनि जोड दिन्छन्।',
      },
      {
        question: 'के Kolab का इन्फ्लुएन्सरहरू प्रमाणित छन्?',
        answer: 'हो। मार्केटप्लेसमा देखिनुअघि प्रत्येक क्रिएटर प्रोफाइलले पहिचान प्रमाणीकरण गुज्रन्छ, नागरिकता कागजात साथै इमेल र फोन जाँचद्वारा पुष्टि गरिन्छ।',
      },
      {
        question: 'के म TikTok वा Facebook जस्ता कुनै निश्चित प्लेटफर्ममा इन्फ्लुएन्सरहरू फेला पार्न सक्छु?',
        answer: 'हो — TikTok, Instagram, YouTube, Facebook, र अरूमा सक्रिय इन्फ्लुएन्सरहरू हेर्न प्लेटफर्मअनुसार फिल्टर गर्नुहोस्, वा प्रत्येकको केन्द्रित झलकका लागि Kolab का प्लेटफर्म-विशेष पेजहरू ब्राउज गर्नुहोस्।',
      },
      {
        question: 'फेला परेको इन्फ्लुएन्सरसँग वास्तवमा कसरी सहकार्य गर्ने?',
        answer: 'सिधै सहकार्य अनुरोध पठाउनुहोस्, वा आफ्नो आवश्यकतासहित तलबसहितको क्याम्पेन वा निःशुल्क खुला इभेन्ट पोस्ट गरी इच्छुक इन्फ्लुएन्सरहरूलाई प्रस्तावसहित आवेदन दिन दिनुहोस्। जुनसुकै भए पनि, तपाईंले एपभित्रै सिधै म्यासेज गरी विवरण अन्तिम रूप दिनुहुन्छ।',
      },
      {
        question: 'के Kolab मा इन्फ्लुएन्सर फेला पार्नु निःशुल्क छ?',
        answer: 'हो — Kolab निःशुल्क डाउनलोड हो, र क्रिएटर मार्केटप्लेस ब्राउज र फिल्टर गर्न कुनै शुल्क लाग्दैन। तपाईंले तलबसहितको क्याम्पेन पोस्ट गर्दा मात्र बजेट तय गर्नुपर्छ।',
      },
    ],
    related: [
      { label: 'क्रिएटर मार्केटप्लेस नेपाल', path: '/creator-marketplace-nepal', description: 'Kolab को सम्पूर्ण क्रिएटर मार्केटप्लेस झलक।' },
      { label: 'ब्रान्डहरूका लागि', path: '/brands', description: 'क्याम्पेन पोस्ट गर्नुहोस् र प्रमाणित क्रिएटरहरू भाडामा लिनुहोस्।' },
      { label: 'कन्टेन्ट क्रिएटरहरूका लागि', path: '/content-creators', description: 'तपाईं क्रिएटर हुनुहुन्छ? यहाँबाट सुरु गर्नुहोस्।' },
      { label: 'क्याम्पेन खोज्नुहोस्', path: '/find-campaigns', description: 'क्रिएटरहरूले आवेदन दिन सक्ने खुला क्याम्पेनहरू हेर्नुहोस्।' },
    ],
    cta: { heading: 'नेपालमा इन्फ्लुएन्सरहरू फेला पार्नुहोस्', sub: 'प्रमाणित क्रिएटर प्रोफाइलहरू ब्राउज गर्न Kolab डाउनलोड गर्नुहोस्।' },
    sections: {
      whereToFind: {
        heading: 'नेपालमा इन्फ्लुएन्सरहरू वास्तवमा कहाँ फेला पार्ने?',
        paragraphs: [
          'ब्रान्डहरूले नेपालमा इन्फ्लुएन्सर फेला पार्ने सामान्य तरिका म्यानुअल हुन्छ: प्लेटफर्मको एक्स्प्लोर ट्याब स्क्रोल गर्ने, ह्यासट्याग खोज्ने, वरपर सोध्ने, र फेला परेको व्यक्तिले वास्तवमा जवाफ देला भनेर आशा गर्ने — उनीहरूले पहिले ब्रान्डसँग काम गरेका छन् कि छैनन्, कति लिन्छन्, वा वास्तविक, प्रमाणित खाता नै हो कि होइन भन्ने कुनै दृश्यता बिना। यो कहिलेकाहीं काम गर्छ, तर एक-दुई सहकार्यभन्दा बढी विस्तार हुँदैन।',
          'Kolab ले त्यो स्क्रोल-र-आशा प्रक्रियालाई वास्तविक खोज प्रवाहमा बदल्छ। एक पटकमा एउटा प्लेटफर्म खोज्नुको सट्टा, तपाईं हरेक प्रमुख प्लेटफर्मभरिका इन्फ्लुएन्सरहरूको एउटै मार्केटप्लेस ब्राउज गर्दै हुनुहुन्छ, ठ्याक्कै तपाईंको क्याम्पेनलाई चाहिने कुरा — श्रेणी, प्लेटफर्म, र सहर — अनुसार फिल्टर गर्न मिल्ने, र प्रत्येक प्रोफाइलपछाडि प्रमाणित पहिचान र पारदर्शी इतिहाससहित।',
        ],
      },
      discover: {
        heading: 'तपाईंको क्याम्पेनलाई चाहिने अनुसार इन्फ्लुएन्सरहरू फेला पार्नुहोस्',
        benefits: [
          { title: 'श्रेणी अनुसार फिल्टर गर्नुहोस्', desc: `तपाईंको निचका इन्फ्लुएन्सरहरूमा साँघुर्याउनुहोस् — ${CATEGORIES_NE.slice(0, 6).join(', ')}, र अरू।` },
          { title: 'प्लेटफर्म अनुसार फिल्टर गर्नुहोस्', desc: `${PLATFORMS.slice(0, 4).join(', ')}, वा समर्थित अन्य कुनै पनि प्लेटफर्ममा सक्रिय इन्फ्लुएन्सरहरू फेला पार्नुहोस्।` },
          { title: 'सहर अनुसार फिल्टर गर्नुहोस्', desc: 'काठमाडौं, पोखरा, ललितपुर, भक्तपुर, बुटवल, विराटनगर, धरान, चितवन, वा नेपालगन्जका इन्फ्लुएन्सरहरू फेला पार्नुहोस्।' },
          { title: 'प्रमाणित प्रोफाइल मात्र', desc: 'प्रत्येक इन्फ्लुएन्सरको प्रोफाइल मार्केटप्लेसमा देखिनुअघि पहिचान प्रमाणीकरण पूरा गर्छ।' },
        ],
      },
      twoWays: {
        heading: 'सहकार्य सुरु गर्ने दुई तरिका',
        paragraph: 'मिल्ने इन्फ्लुएन्सरहरू फेला पारेपछि, अगाडि बढ्ने दुई तरिका छन्। कुनै निश्चित प्रोफाइललाई सिधै सहकार्य अनुरोध पठाउनुहोस्, वा आफ्नो बजेट, श्रेणी, र प्लेटफर्म आवश्यकता देखिने गरी तलबसहितको क्याम्पेन वा निःशुल्क खुला इभेन्ट पोस्ट गरी इच्छुक इन्फ्लुएन्सरहरूलाई प्रस्तावसहित तपाईंकहाँ आउन दिनुहोस्। ठूलो पहुँच प्रयासका लागि प्रायः पोस्ट गरिएको क्याम्पेन उपयुक्त हुन्छ; पहिले नै मनमा भएको कुनै निश्चित इन्फ्लुएन्सरलाई सिधै सम्पर्क गर्न सजिलो हुन्छ।',
        items: [
          'श्रेणी, प्लेटफर्म, र सहरअनुसार इन्फ्लुएन्सर मार्केटप्लेस ब्राउज र फिल्टर गर्नुहोस्।',
          'प्रोफाइलका प्लेटफर्म, श्रेणी फोकस, र विगतको सहकार्य इतिहास समीक्षा गर्नुहोस्।',
          'कुनै निश्चित इन्फ्लुएन्सरलाई सिधै म्यासेज गर्नुहोस्, वा इन्फ्लुएन्सरहरूले आवेदन दिनसक्ने क्याम्पेन पोस्ट गर्नुहोस्।',
          'कुनै पनि बजेट चल्नुअघि एपभित्रै डेलिभरेबल र समयसीमामा सहमत हुनुहोस्।',
          'एस्क्रो मार्फत भुक्तानी गर्नुहोस्, जुन तपाईंले सम्पन्न काम स्वीकृत गरेपछि मात्र रिलिज हुन्छ।',
        ],
      },
      builtOnTrust: {
        heading: 'फलोअर संख्यामा मात्र होइन, भरोसामा बनेको',
        paragraph: 'फलोअर संख्याले मात्र कुनै इन्फ्लुएन्सरले वास्तवमा काम बुझाउने, जवाफ दिने, वा तपाईंको ब्रान्डलाई राम्ररी प्रतिनिधित्व गर्ने हो कि होइन भन्ने बताउँदैन — त्यसैले नै Kolab मा सहकार्यको हरेक भाग प्रमाणित भरोसाको वरिपरि बनाइएको छ। पहिचान नागरिकता कागजात साथै इमेल र फोन जाँचद्वारा पुष्टि गरिन्छ, तलबसहितका क्याम्पेनका भुक्तानी तपाईंले काम स्वीकृत नगरेसम्म एस्क्रोमा राखिन्छ, र प्रत्येक सहकार्य दुवै पक्षबाट इमानदार, देखिने समीक्षासँग सकिन्छ — त्यसैले Kolab मा इन्फ्लुएन्सरको प्रतिष्ठा तपाईंले बजेट प्रतिबद्ध गर्नुअघि नै जाँच्न सक्ने कुरा हो।',
      },
    },
  },
};

export function InfluencersPage() {
  return (
    <LandingLanguageProvider>
      <InfluencersPageInner />
    </LandingLanguageProvider>
  );
}

function InfluencersPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/influencers',
        keywords: ['influencer Nepal', 'Nepal influencers', 'Nepali influencers', 'influencer platform Nepal', 'social media influencer Nepal', 'find influencers Nepal', 'discover influencers Nepal', 'micro influencers Nepal', 'nano influencers Nepal', 'best influencers in Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/influencers', title: 'Influencers in Nepal | Kolab', description: "Discover verified influencers across Nepal on Kolab's creator marketplace." })],
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/influencers' }]}
      icon={Star}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
    >
      <ContentSection heading={t.sections.whereToFind.heading}>
        {t.sections.whereToFind.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </ContentSection>

      <ContentSection heading={t.sections.discover.heading}>
        <BenefitGrid
          items={t.sections.discover.benefits.map((b, i) => ({ icon: DISCOVER_ICONS[i], title: b.title, desc: b.desc }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.twoWays.heading}>
        <p>{t.sections.twoWays.paragraph}</p>
        <ContentList items={t.sections.twoWays.items} />
      </ContentSection>

      <ContentSection heading={t.sections.builtOnTrust.heading}>
        <p>{t.sections.builtOnTrust.paragraph}</p>
      </ContentSection>
    </ContentPageLayout>
  );
}
