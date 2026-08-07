import { Compass, Handshake, MessageSquare, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Icons/accents are language-invariant, zipped by index with the translated
// title/desc pulled from COPY[lang] below.
const HOW_WORKS_ICONS = [Handshake, Compass, MessageSquare, ShieldCheck];
const BUILT_FOR_ICONS = [Users, Handshake] as const;
const BUILT_FOR_ACCENTS = ['violet', 'orange'] as const;

const COPY = {
  en: {
    seo: {
      title: 'Creator Marketplace Nepal | Connect Brands & Content Creators',
      description: "Kolab is Nepal's creator marketplace — where brands find verified TikTok, Instagram, YouTube and Facebook creators for paid campaigns and collaborations.",
      schemaTitle: 'Creator Marketplace Nepal | Kolab',
      schemaDescription: "Nepal's creator marketplace connecting brands and content creators.",
    },
    breadcrumbName: 'Creator Marketplace Nepal',
    eyebrow: 'Creator Marketplace Nepal',
    heading: "Nepal's Creator Marketplace for Brand Collaborations",
    intro: "Kolab is the marketplace built specifically for Nepal's creator economy — the place where brands in Kathmandu, Pokhara, Lalitpur, and beyond discover verified content creators, and where creators turn their following into paid work.",
    faqs: [
      {
        question: 'What is Kolab?',
        answer: "Kolab is Nepal's creator marketplace — a mobile app that connects businesses with content creators and influencers for paid campaigns and brand collaborations. Brands post campaigns, creators apply with proposals, and both sides communicate and collaborate directly in the app.",
      },
      {
        question: 'How do I find creators in Nepal on Kolab?',
        answer: 'Businesses can browse creator profiles filtered by category (fashion, food, tech, fitness, and more), platform (Instagram, TikTok, YouTube, Facebook), and location anywhere in Nepal, then send a collaboration request or post an open campaign for creators to apply to.',
      },
      {
        question: 'Is Kolab free to use?',
        answer: 'Kolab is a free download on iOS and Android. Creators build a profile and apply to campaigns at no cost. Businesses create an account and set their own campaign budgets when posting a paid campaign or open event.',
      },
      {
        question: 'Which social media platforms does Kolab support?',
        answer: 'Creator profiles on Kolab can showcase Instagram, TikTok, YouTube, Facebook, and other platforms including Twitter / X, LinkedIn, Pinterest, Snapchat, Twitch.',
      },
      {
        question: 'How does payment work between brands and creators?',
        answer: 'Paid campaigns use escrow-protected payments — funds are held safely and released once the collaboration is approved, so both the brand and the creator are protected.',
      },
      {
        question: 'Is Kolab only for creators in Kathmandu?',
        answer: 'No — Kolab is built for creators and brands across Nepal, including Kathmandu, Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, and Nepalgunj. Campaign discovery works by location, so creators anywhere in the country can find relevant opportunities.',
      },
    ],
    related: [
      { label: 'For Content Creators', path: '/content-creators', description: 'Build a profile, get discovered, and apply to paid campaigns.' },
      { label: 'For Brands', path: '/brands', description: 'Post campaigns and hire verified creators across Nepal.' },
      { label: 'Browse Influencers', path: '/influencers', description: 'See how Kolab connects businesses with Nepali influencers.' },
      { label: 'Find Campaigns', path: '/find-campaigns', description: 'Open events and paid campaigns creators can apply to right now.' },
      { label: 'UGC Creators', path: '/ugc-creators-nepal', description: 'Hire creators for authentic, ad-ready UGC content.' },
    ],
    cta: { heading: "Join Nepal's Creator Marketplace", sub: 'Download Kolab and start collaborating today.' },
    sections: {
      whatIs: {
        heading: 'What is a creator marketplace?',
        paragraphs: [
          "A creator marketplace is a platform that structures the process of finding, hiring, and paying content creators — rather than brands cold-messaging influencers on Instagram and hoping for a reply, or creators fielding one-off DMs with no guarantee they'll actually get paid. In Nepal, the creator economy has grown fast on TikTok, Instagram, YouTube, and Facebook, but the tooling around it — discovery, proposals, budgets, payment — has mostly stayed informal.",
          "Kolab exists to close that gap. It's a dedicated creator marketplace for Nepal: businesses post campaigns or open events, creators discover and apply to the ones that fit their niche and following, and the whole collaboration — messaging, proposal, payment, review — happens in one place instead of scattered across DMs and bank transfers.",
        ],
      },
      howWorks: {
        heading: "How Kolab's creator marketplace works",
        benefits: [
          { title: 'Brands post campaigns', desc: 'Businesses create a paid campaign or a free open event with a budget, category, and platform requirements.' },
          { title: 'Creators discover & apply', desc: 'Creators browse campaigns by category, platform, and location, then submit a proposal to the ones that fit.' },
          { title: 'Collaborate directly', desc: 'Once matched, brands and creators message directly in-app to align on deliverables and timelines.' },
          { title: 'Get paid securely', desc: 'Paid campaigns use escrow — funds are held until the work is approved, then released to the creator.' },
        ],
      },
      everyNiche: {
        heading: 'Every niche and platform, covered',
        paragraph: 'Kolab supports creator profiles across Instagram, TikTok, YouTube, Facebook, Twitter / X, LinkedIn, Pinterest, Snapchat, Twitch, spanning categories like Food & Beverage, Travel, Fashion, Beauty, Fitness & Health, Gaming, Technology, Education, Lifestyle, Home & Living, Music, Art & Design, Finance, Photography, Sports, Entertainment, and more. Whether a brand needs a Kathmandu-based fashion creator on Instagram or a Pokhara food vlogger on YouTube, campaigns can be filtered and matched by exactly what the collaboration needs. See platform-specific creators on the',
        linkTiktok: 'TikTok creators',
        linkInstagram: 'Instagram creators',
        linkYoutube: 'YouTube creators',
        linkFacebook: 'Facebook creators',
        and: 'and',
        pagesSuffix: 'pages.',
      },
      builtFor: {
        heading: 'Built for both sides of the collaboration',
        benefits: [
          { title: 'For creators', desc: 'Turn your following into income — build a profile, get discovered, and apply to paid campaigns across Nepal. See the creator page for details.' },
          { title: 'For brands', desc: 'Find and hire the right creators fast, with verified profiles and budgets you control. See the brand page for details.' },
        ],
      },
      whyChoose: {
        heading: 'Why Nepali brands and creators choose Kolab',
        paragraph: "Trust is the hardest part of any informal creator-brand relationship to get right, so it's built into the platform: creator identity is confirmed with citizenship document verification, every account goes through email, phone, and document checks, payments on paid campaigns are escrow-protected until work is approved, and every collaboration ends with a transparent, honest rating — so reputation on Kolab actually means something.",
      },
    },
  },
  ne: {
    seo: {
      title: 'Creator Marketplace Nepal | Connect Brands & Content Creators',
      description: "Kolab is Nepal's creator marketplace — where brands find verified TikTok, Instagram, YouTube and Facebook creators for paid campaigns and collaborations.",
      schemaTitle: 'Creator Marketplace Nepal | Kolab',
      schemaDescription: "Nepal's creator marketplace connecting brands and content creators.",
    },
    breadcrumbName: 'क्रिएटर मार्केटप्लेस नेपाल',
    eyebrow: 'क्रिएटर मार्केटप्लेस नेपाल',
    heading: 'ब्रान्ड सहकार्यका लागि नेपालको क्रिएटर मार्केटप्लेस',
    intro: 'Kolab नेपालको क्रिएटर इकोनोमीका लागि विशेष रूपमा बनाइएको मार्केटप्लेस हो — जहाँ काठमाडौं, पोखरा, ललितपुर र त्यसभन्दा बाहिरका ब्रान्डहरूले प्रमाणित कन्टेन्ट क्रिएटरहरू फेला पार्छन्, र जहाँ क्रिएटरहरूले आफ्नो फलोअरलाई भुक्तानी हुने काममा बदल्छन्।',
    faqs: [
      {
        question: 'Kolab के हो?',
        answer: 'Kolab नेपालको क्रिएटर मार्केटप्लेस हो — भुक्तानी हुने क्याम्पेन र ब्रान्ड सहकार्यका लागि व्यवसायहरूलाई कन्टेन्ट क्रिएटर र इन्फ्लुएन्सरहरूसँग जोड्ने मोबाइल एप। ब्रान्डहरूले क्याम्पेन पोस्ट गर्छन्, क्रिएटरहरूले प्रस्तावसहित आवेदन दिन्छन्, र दुवै पक्षले एपभित्रै सिधै कुराकानी र सहकार्य गर्छन्।',
      },
      {
        question: 'Kolab मा नेपालका क्रिएटरहरू कसरी फेला पार्ने?',
        answer: 'व्यवसायहरूले श्रेणी (फेसन, खाना, प्रविधि, फिटनेस, र अरू धेरै), प्लेटफर्म (Instagram, TikTok, YouTube, Facebook), र नेपालभरि कुनै पनि स्थान अनुसार फिल्टर गरिएका क्रिएटर प्रोफाइलहरू ब्राउज गर्न सक्छन्, त्यसपछि सहकार्य अनुरोध पठाउन वा क्रिएटरहरूले आवेदन दिनका लागि खुला क्याम्पेन पोस्ट गर्न सक्छन्।',
      },
      {
        question: 'के Kolab प्रयोग गर्न निःशुल्क छ?',
        answer: 'Kolab iOS र Android मा निःशुल्क डाउनलोड हो। क्रिएटरहरूले कुनै शुल्क बिना प्रोफाइल बनाउन र क्याम्पेनमा आवेदन दिन सक्छन्। व्यवसायहरूले खाता बनाउँछन् र तलबसहितको क्याम्पेन वा खुला इभेन्ट पोस्ट गर्दा आफ्नै क्याम्पेन बजेट तय गर्छन्।',
      },
      {
        question: 'Kolab ले कुन सामाजिक सञ्जाल प्लेटफर्महरू समर्थन गर्छ?',
        answer: 'Kolab मा क्रिएटर प्रोफाइलहरूले Instagram, TikTok, YouTube, Facebook, र Twitter / X, LinkedIn, Pinterest, Snapchat, Twitch लगायत अन्य प्लेटफर्महरू देखाउन सक्छन्।',
      },
      {
        question: 'ब्रान्ड र क्रिएटरबीच भुक्तानी कसरी हुन्छ?',
        answer: 'तलबसहितका क्याम्पेनहरूमा एस्क्रो-सुरक्षित भुक्तानी प्रयोग हुन्छ — रकम सुरक्षित राखिन्छ र सहकार्य स्वीकृत भएपछि मात्र रिलिज हुन्छ, त्यसैले ब्रान्ड र क्रिएटर दुवै सुरक्षित रहन्छन्।',
      },
      {
        question: 'के Kolab काठमाडौंका क्रिएटरहरूका लागि मात्र हो?',
        answer: 'होइन — Kolab काठमाडौं, पोखरा, ललितपुर, भक्तपुर, बुटवल, विराटनगर, धरान, चितवन, र नेपालगन्जसमेत नेपालभरका क्रिएटर र ब्रान्डहरूका लागि बनाइएको हो। क्याम्पेन खोज स्थान अनुसार काम गर्छ, त्यसैले देशभरि जहाँ भए पनि क्रिएटरहरूले सान्दर्भिक अवसरहरू फेला पार्न सक्छन्।',
      },
    ],
    related: [
      { label: 'कन्टेन्ट क्रिएटरहरूका लागि', path: '/content-creators', description: 'प्रोफाइल बनाउनुहोस्, फेला पर्नुहोस्, र तलबसहितका क्याम्पेनहरूमा आवेदन दिनुहोस्।' },
      { label: 'ब्रान्डहरूका लागि', path: '/brands', description: 'क्याम्पेन पोस्ट गर्नुहोस् र नेपालभरका प्रमाणित क्रिएटरहरू भाडामा लिनुहोस्।' },
      { label: 'इन्फ्लुएन्सरहरू ब्राउज गर्नुहोस्', path: '/influencers', description: 'Kolab ले व्यवसायहरूलाई नेपाली इन्फ्लुएन्सरहरूसँग कसरी जोड्छ हेर्नुहोस्।' },
      { label: 'क्याम्पेनहरू फेला पार्नुहोस्', path: '/find-campaigns', description: 'क्रिएटरहरूले अहिले नै आवेदन दिन सक्ने खुला इभेन्ट र तलबसहितका क्याम्पेनहरू।' },
      { label: 'UGC क्रिएटरहरू', path: '/ugc-creators-nepal', description: 'प्रामाणिक, विज्ञापन-तयार UGC सामग्रीका लागि क्रिएटरहरू भाडामा लिनुहोस्।' },
    ],
    cta: { heading: 'नेपालको क्रिएटर मार्केटप्लेसमा जोडिनुहोस्', sub: 'Kolab डाउनलोड गर्नुहोस् र आज नै सहकार्य सुरु गर्नुहोस्।' },
    sections: {
      whatIs: {
        heading: 'क्रिएटर मार्केटप्लेस भनेको के हो?',
        paragraphs: [
          'क्रिएटर मार्केटप्लेस भनेको कन्टेन्ट क्रिएटरहरू फेला पार्ने, भाडामा लिने, र भुक्तानी गर्ने प्रक्रियालाई संरचित बनाउने प्लेटफर्म हो — ब्रान्डहरूले Instagram मा इन्फ्लुएन्सरहरूलाई चिसो म्यासेज पठाएर जवाफको आशा गर्नुको सट्टा, वा क्रिएटरहरूले साँच्चै भुक्तानी पाउने ग्यारेन्टी नभएका एकपटके DM हरू सामना गर्नुको सट्टा। नेपालमा, क्रिएटर इकोनोमी TikTok, Instagram, YouTube, र Facebook मा छिटो बढेको छ, तर यसको वरपरका उपकरणहरू — खोज, प्रस्ताव, बजेट, भुक्तानी — प्रायः अनौपचारिक नै रहेका छन्।',
          'Kolab त्यही खाडल पूर्ने उद्देश्यले बनेको हो। यो नेपालका लागि समर्पित क्रिएटर मार्केटप्लेस हो: व्यवसायहरूले क्याम्पेन वा खुला इभेन्ट पोस्ट गर्छन्, क्रिएटरहरूले आफ्नो निच र फलोअरसँग मिल्नेहरू फेला पार्छन् र आवेदन दिन्छन्, र सम्पूर्ण सहकार्य — म्यासेजिङ, प्रस्ताव, भुक्तानी, समीक्षा — DM र बैंक ट्रान्सफरमा छरिनुको सट्टा एउटै ठाउँमा हुन्छ।',
        ],
      },
      howWorks: {
        heading: 'Kolab को क्रिएटर मार्केटप्लेस कसरी काम गर्छ',
        benefits: [
          { title: 'ब्रान्डले क्याम्पेन पोस्ट गर्छन्', desc: 'व्यवसायहरूले बजेट, श्रेणी, र प्लेटफर्म आवश्यकतासहित तलबसहितको क्याम्पेन वा निःशुल्क खुला इभेन्ट बनाउँछन्।' },
          { title: 'क्रिएटरले फेला पार्छन् र आवेदन दिन्छन्', desc: 'क्रिएटरहरूले श्रेणी, प्लेटफर्म, र स्थान अनुसार क्याम्पेनहरू ब्राउज गर्छन्, त्यसपछि मिल्नेहरूमा प्रस्ताव पेश गर्छन्।' },
          { title: 'सिधै सहकार्य गर्नुहोस्', desc: 'मिलेपछि, ब्रान्ड र क्रिएटरले डेलिभरेबल र समयसीमामा सहमत हुन एपभित्रै सिधै म्यासेज गर्छन्।' },
          { title: 'सुरक्षित रूपमा भुक्तानी पाउनुहोस्', desc: 'तलबसहितका क्याम्पेनहरूमा एस्क्रो प्रयोग हुन्छ — काम स्वीकृत नभएसम्म रकम सुरक्षित राखिन्छ, त्यसपछि क्रिएटरलाई रिलिज गरिन्छ।' },
        ],
      },
      everyNiche: {
        heading: 'हरेक निच र प्लेटफर्म समेटिएको',
        paragraph: 'Kolab मा Instagram, TikTok, YouTube, Facebook, Twitter / X, LinkedIn, Pinterest, Snapchat, Twitch लगायतका प्लेटफर्महरूमा, र फेसन, ट्राभल, खाना र पेय, ब्युटी, फिटनेस र स्वास्थ्य, गेमिङ, प्रविधि, शिक्षा, लाइफस्टाइल, घर र सजावट, संगीत, कला र डिजाइन, फाइनान्स, फोटोग्राफी, खेलकुद, मनोरञ्जन लगायतका श्रेणीहरूमा क्रिएटर प्रोफाइलहरू छन्। चाहे ब्रान्डलाई Instagram मा काठमाडौंको फेसन क्रिएटर चाहिएको होस् वा YouTube मा पोखराको खाना भ्लगर, क्याम्पेनहरूलाई सहकार्यलाई ठ्याक्कै चाहिने कुराअनुसार फिल्टर र म्याच गर्न सकिन्छ। प्लेटफर्म-विशेष क्रिएटरहरू हेर्नुहोस्',
        linkTiktok: 'TikTok क्रिएटरहरू',
        linkInstagram: 'Instagram क्रिएटरहरू',
        linkYoutube: 'YouTube क्रिएटरहरू',
        linkFacebook: 'Facebook क्रिएटरहरू',
        and: 'र',
        pagesSuffix: 'पेजहरूमा।',
      },
      builtFor: {
        heading: 'सहकार्यका दुवै पक्षका लागि बनाइएको',
        benefits: [
          { title: 'क्रिएटरहरूका लागि', desc: 'आफ्नो फलोअरलाई आम्दानीमा बदल्नुहोस् — प्रोफाइल बनाउनुहोस्, फेला पर्नुहोस्, र नेपालभरका तलबसहितका क्याम्पेनहरूमा आवेदन दिनुहोस्। विवरणका लागि क्रिएटर पेज हेर्नुहोस्।' },
          { title: 'ब्रान्डहरूका लागि', desc: 'प्रमाणित प्रोफाइल र तपाईंले नियन्त्रण गर्ने बजेटसहित सही क्रिएटरहरू छिटो फेला पार्नुहोस् र भाडामा लिनुहोस्। विवरणका लागि ब्रान्ड पेज हेर्नुहोस्।' },
        ],
      },
      whyChoose: {
        heading: 'नेपाली ब्रान्ड र क्रिएटरहरूले Kolab किन रोज्छन्',
        paragraph: 'कुनै पनि अनौपचारिक क्रिएटर-ब्रान्ड सम्बन्धमा भरोसा नै सबैभन्दा गाह्रो कुरा हो, त्यसैले यो प्लेटफर्ममै निर्मित छ: क्रिएटरको पहिचान नागरिकता कागजात प्रमाणीकरणद्वारा पुष्टि गरिन्छ, प्रत्येक खाता इमेल, फोन, र कागजात जाँचबाट गुज्र्छ, तलबसहितका क्याम्पेनहरूमा भुक्तानी काम स्वीकृत नभएसम्म एस्क्रो-सुरक्षित रहन्छ, र प्रत्येक सहकार्य पारदर्शी, इमानदार रेटिङसँग सकिन्छ — त्यसैले Kolab मा प्रतिष्ठाले साँच्चै अर्थ राख्छ।',
      },
    },
  },
};

export function CreatorMarketplaceNepalPage() {
  return (
    <LandingLanguageProvider>
      <CreatorMarketplaceNepalPageInner />
    </LandingLanguageProvider>
  );
}

function CreatorMarketplaceNepalPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/creator-marketplace-nepal',
        keywords: ['creator marketplace Nepal', 'creator platform Nepal', 'Nepal influencer platform', 'hire creator Nepal', 'creator economy Nepal', 'influencer marketplace Nepal', 'creator discovery Nepal', 'discover creators Nepal', 'social media creators Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/creator-marketplace-nepal', title: t.seo.schemaTitle, description: t.seo.schemaDescription })],
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/creator-marketplace-nepal' }]}
      icon={Sparkles}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
    >
      <ContentSection heading={t.sections.whatIs.heading}>
        {t.sections.whatIs.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </ContentSection>

      <ContentSection heading={t.sections.howWorks.heading}>
        <BenefitGrid
          items={t.sections.howWorks.benefits.map((b, i) => ({ icon: HOW_WORKS_ICONS[i], title: b.title, desc: b.desc }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.everyNiche.heading}>
        <p>
          {t.sections.everyNiche.paragraph}{' '}
          <a href="/tiktok-creators" className="font-medium text-violet hover:underline">{t.sections.everyNiche.linkTiktok}</a>,{' '}
          <a href="/instagram-creators" className="font-medium text-violet hover:underline">{t.sections.everyNiche.linkInstagram}</a>,{' '}
          <a href="/youtube-creators" className="font-medium text-violet hover:underline">{t.sections.everyNiche.linkYoutube}</a>, {t.sections.everyNiche.and}{' '}
          <a href="/facebook-creators" className="font-medium text-violet hover:underline">{t.sections.everyNiche.linkFacebook}</a> {t.sections.everyNiche.pagesSuffix}
        </p>
      </ContentSection>

      <ContentSection heading={t.sections.builtFor.heading}>
        <BenefitGrid
          items={t.sections.builtFor.benefits.map((b, i) => ({ icon: BUILT_FOR_ICONS[i], title: b.title, desc: b.desc, accent: BUILT_FOR_ACCENTS[i] }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.whyChoose.heading}>
        <p>{t.sections.whyChoose.paragraph}</p>
      </ContentSection>
    </ContentPageLayout>
  );
}
