import { BookOpen, Compass, Handshake, MessageSquare, PlayCircle, ShieldCheck } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Icons are language-invariant, zipped by index with the translated
// title/desc pulled from COPY[lang] below.
const WHAT_BRANDS_GET_ICONS = [Compass, Handshake, MessageSquare, ShieldCheck];

// Category labels differ per language, so each language gets its own list —
// referenced directly inside COPY below to build the same joined strings
// the original single-language copy used.
const YOUTUBE_CATEGORIES_EN = ['Technology', 'Education', 'Gaming', 'Finance', 'Travel', 'Food & Beverage', 'Fitness & Health', 'Entertainment'];
const YOUTUBE_CATEGORIES_NE = ['प्रविधि', 'शिक्षा', 'गेमिङ', 'फाइनान्स', 'ट्राभल', 'खाना र पेय', 'फिटनेस र स्वास्थ्य', 'मनोरञ्जन'];

const COPY = {
  en: {
    seo: {
      title: 'YouTube Creators in Nepal | Hire YouTube Influencers',
      description: 'Discover YouTube creators in Nepal on Kolab. Connect with verified YouTubers for paid campaigns, product reviews, and brand collaborations.',
    },
    breadcrumbName: 'YouTube Creators',
    eyebrow: 'YouTube Creators',
    heading: 'YouTube Creators in Nepal',
    intro: "YouTube is where Nepali creators go deep — a 15-minute product review, a step-by-step tutorial, a travel vlog through Pokhara or Chitwan that actually shows the journey. Kolab connects brands with YouTube creators across Nepal for the kind of longer-form, considered content that short-form platforms don't have room for.",
    faqs: [
      {
        question: 'How do I find YouTube creators in Nepal on Kolab?',
        answer: 'Browse creator profiles and filter by platform (YouTube), category, and location anywhere in Nepal. Each profile lists the creator’s niche and connected platforms, so you can find a YouTuber whose content style fits your product or campaign.',
      },
      {
        question: 'Can I hire a YouTuber for a product review or tutorial?',
        answer: 'Yes. Post a paid campaign specifying the format — a review, tutorial, unboxing, or vlog mention — along with your budget and deliverables, and YouTube creators who fit can apply with a proposal.',
      },
      {
        question: 'Are YouTube creators on Kolab verified?',
        answer: 'Creator accounts go through identity verification, including citizenship-document checks alongside email and phone verification, so businesses know they’re working with a real, accountable creator.',
      },
      {
        question: 'How does payment work for a YouTube campaign?',
        answer: 'Paid campaigns use escrow-protected payments — your budget is held securely and released to the creator once you approve the published video, so both sides are protected through a longer production timeline.',
      },
      {
        question: 'What kind of YouTube content can creators make on Kolab?',
        answer: `Creators on Kolab list categories including ${YOUTUBE_CATEGORIES_EN.slice(0, 5).join(', ')}, and more — from in-depth tech reviews to recipe tutorials to travel vlogs, so you can match a campaign to a creator's established format.`,
      },
      {
        question: 'Do YouTube creators need a large subscriber count to join?',
        answer: 'No strict subscriber minimum applies. Brands look at a creator’s niche, video quality, and audience fit for a specific campaign rather than subscriber count alone, so smaller, focused channels can still land paid work.',
      },
    ],
    related: [
      { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
      { label: 'Instagram Creators', path: '/instagram-creators', description: 'Browse Instagram creators in Nepal.' },
      { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
      { label: 'For Brands', path: '/brands', description: 'Hire creators for your next campaign.' },
    ],
    cta: { heading: 'Connect with YouTube Creators in Nepal', sub: 'Download Kolab to browse profiles and post campaigns.' },
    sections: {
      whyMatters: {
        heading: 'Why YouTube matters for brands in Nepal',
        paragraphs: [
          "YouTube rewards depth in a way other platforms don't — a viewer who clicks into a 10-minute review or tutorial is already leaning in, which makes YouTube creators especially effective for products or services that need explaining, demonstrating, or comparing rather than just showing. A skincare routine, a phone review, a home-cooking recipe, a personal-finance breakdown — these all land better as a considered video than a six-second clip.",
          "That format also means production takes longer, so matching with the right creator up front matters more. Kolab lets businesses browse YouTube creator profiles filtered by category and location, review a creator's usual format before reaching out, and post a campaign that YouTubers with the right niche can apply to directly.",
        ],
      },
      whatBrandsGet: {
        heading: 'What brands get from YouTube creators on Kolab',
        benefits: [
          { title: 'Find the right format', desc: 'Filter YouTube creator profiles by category and location to find reviewers, tutorial-makers, or vloggers who fit.' },
          { title: 'Post a campaign or event', desc: 'Set a budget and deliverables — a dedicated review, an integration, a vlog mention — for a paid campaign or open event.' },
          { title: 'Message directly', desc: 'Coordinate the brief, talking points, and publish timeline in-app once a creator applies to your campaign.' },
          { title: 'Pay with escrow protection', desc: 'Campaign budgets are held in escrow and released once you approve the published video.' },
        ],
      },
      categories: {
        heading: 'YouTube content categories on Kolab',
        paragraph: `YouTube creators on Kolab cover categories including ${YOUTUBE_CATEGORIES_EN.join(', ')}, and more — a Kathmandu-based tech channel doing hands-on phone and gadget reviews, an education creator breaking down exam prep, a Butwal or Biratnagar food channel filming full recipe walkthroughs, or a finance creator explaining budgeting basics for a Nepali audience. Filtering by category means a brand with a tutorial- or review-style product can find a creator already fluent in that format instead of starting from zero.`,
        note: "Because YouTube videos take longer to plan, film, and edit than short-form content, campaign timelines and talking points are worth agreeing on clearly up front — Kolab's in-app messaging keeps that brief in one place instead of scattered across email and chat threads.",
      },
      howToHire: {
        heading: 'How to hire a YouTube creator in Nepal',
        items: [
          'Create a business account on Kolab and post a paid campaign or a free open event.',
          'Set your category, platform (YouTube), budget or offer, and location targeting anywhere in Nepal.',
          'Browse YouTube creator profiles directly, or review proposals submitted to your campaign.',
          'Message shortlisted creators in-app to agree on format, talking points, and publish date.',
          'Approve the published video and release payment through Kolab’s escrow-protected system.',
          'Leave a review once the collaboration wraps, building a record for future campaigns.',
        ],
      },
      trust: {
        heading: 'Verified creators, protected payments',
        paragraph: "A YouTube collaboration is a bigger commitment than a single post, so trust matters more, not less. Kolab verifies creator identity with citizenship-document checks alongside email and phone verification, holds paid-campaign budgets in escrow until you approve the finished video, and closes every collaboration with a transparent, honest review — so a longer-form YouTube partnership on Kolab still comes with the same protection as a quick one.",
      },
    },
  },
  ne: {
    seo: {
      title: 'YouTube Creators in Nepal | Hire YouTube Influencers',
      description: 'Discover YouTube creators in Nepal on Kolab. Connect with verified YouTubers for paid campaigns, product reviews, and brand collaborations.',
    },
    breadcrumbName: 'YouTube क्रिएटरहरू',
    eyebrow: 'YouTube क्रिएटरहरू',
    heading: 'नेपालमा YouTube क्रिएटरहरू',
    intro: 'YouTube नै हो जहाँ नेपाली क्रिएटरहरू गहिराइमा जान्छन् — १५ मिनेटको प्रोडक्ट समीक्षा, चरणबद्ध ट्युटोरियल, पोखरा वा चितवन हुँदै साँच्चै यात्रा देखाउने ट्राभल भ्लग। Kolab ले छोटो-फर्म्याट प्लेटफर्महरूमा ठाउँ नपाउने त्यस्तो लामो-फर्म्याट, विचारपूर्ण सामग्रीका लागि नेपालभरका YouTube क्रिएटरहरूलाई ब्रान्डहरूसँग जोड्छ।',
    faqs: [
      {
        question: 'Kolab मा नेपालका YouTube क्रिएटरहरू कसरी फेला पार्ने?',
        answer: 'क्रिएटर प्रोफाइलहरू ब्राउज गर्नुहोस् र प्लेटफर्म (YouTube), श्रेणी, र नेपालभरि कुनै पनि स्थान अनुसार फिल्टर गर्नुहोस्। प्रत्येक प्रोफाइलले क्रिएटरको निच र जोडिएका प्लेटफर्महरू सूचीबद्ध गर्छ, त्यसैले तपाईंले आफ्नो प्रोडक्ट वा क्याम्पेनसँग मेल खाने सामग्री शैली भएको YouTuber फेला पार्न सक्नुहुन्छ।',
      },
      {
        question: 'के म प्रोडक्ट समीक्षा वा ट्युटोरियलका लागि YouTuber भाडामा लिन सक्छु?',
        answer: 'हो। ढाँचा तोकेर — समीक्षा, ट्युटोरियल, अनबक्सिङ, वा भ्लग उल्लेख — आफ्नो बजेट र डेलिभरेबलसहित तलबसहितको क्याम्पेन पोस्ट गर्नुहोस्, र मिल्ने YouTube क्रिएटरहरूले प्रस्तावसहित आवेदन दिन्छन्।',
      },
      {
        question: 'के Kolab का YouTube क्रिएटरहरू प्रमाणित छन्?',
        answer: 'क्रिएटर खाताहरू पहिचान प्रमाणीकरणबाट गुज्रन्छन्, जसमा नागरिकता-कागजात जाँच साथै इमेल र फोन प्रमाणीकरण समावेश छ, त्यसैले व्यवसायहरूलाई साँचो, जवाफदेही क्रिएटरसँग काम गरिरहेको थाहा हुन्छ।',
      },
      {
        question: 'YouTube क्याम्पेनका लागि भुक्तानी कसरी काम गर्छ?',
        answer: 'तलबसहितका क्याम्पेनहरूमा एस्क्रो-सुरक्षित भुक्तानी प्रयोग हुन्छ — तपाईंको बजेट सुरक्षित राखिन्छ र तपाईंले प्रकाशित भिडियो स्वीकृत गरेपछि मात्र क्रिएटरलाई रिलिज हुन्छ, त्यसैले लामो निर्माण समयसीमाभर दुवै पक्ष सुरक्षित रहन्छन्।',
      },
      {
        question: 'क्रिएटरहरूले Kolab मा कस्तो प्रकारको YouTube सामग्री बनाउन सक्छन्?',
        answer: `Kolab का क्रिएटरहरूले ${YOUTUBE_CATEGORIES_NE.slice(0, 5).join(', ')}, र अरू धेरै श्रेणी सूचीबद्ध गर्छन् — गहिरो टेक समीक्षादेखि रेसिपी ट्युटोरियल र ट्राभल भ्लगसम्म, त्यसैले तपाईंले क्याम्पेनलाई क्रिएटरको स्थापित ढाँचासँग मिलाउन सक्नुहुन्छ।`,
      },
      {
        question: 'के YouTube क्रिएटरहरूलाई जोडिन ठूलो सब्स्क्राइबर संख्या चाहिन्छ?',
        answer: 'कुनै कडा न्यूनतम सब्स्क्राइबर लागू हुँदैन। ब्रान्डहरूले सब्स्क्राइबर संख्या मात्र नभई विशेष क्याम्पेनका लागि क्रिएटरको निच, भिडियो गुणस्तर, र दर्शक उपयुक्तता हेर्छन्, त्यसैले साना, केन्द्रित च्यानलहरूले पनि तलबसहितको काम पाउन सक्छन्।',
      },
    ],
    related: [
      { label: 'कन्टेन्ट क्रिएटरहरूका लागि', path: '/content-creators', description: 'Kolab मा आफ्नो क्रिएटर प्रोफाइल बनाउनुहोस्।' },
      { label: 'Instagram क्रिएटरहरू', path: '/instagram-creators', description: 'नेपालका Instagram क्रिएटरहरू ब्राउज गर्नुहोस्।' },
      { label: 'क्रिएटर मार्केटप्लेस नेपाल', path: '/creator-marketplace-nepal', description: 'Kolab को सम्पूर्ण क्रिएटर मार्केटप्लेस अवलोकन।' },
      { label: 'ब्रान्डहरूका लागि', path: '/brands', description: 'आफ्नो अर्को क्याम्पेनका लागि क्रिएटरहरू भाडामा लिनुहोस्।' },
    ],
    cta: { heading: 'नेपालका YouTube क्रिएटरहरूसँग जोडिनुहोस्', sub: 'प्रोफाइलहरू ब्राउज गर्न र क्याम्पेन पोस्ट गर्न Kolab डाउनलोड गर्नुहोस्।' },
    sections: {
      whyMatters: {
        heading: 'नेपालका ब्रान्डहरूका लागि YouTube किन महत्त्वपूर्ण छ',
        paragraphs: [
          'YouTube ले अन्य प्लेटफर्महरूले नगर्ने तरिकाले गहिराइलाई प्रतिफल दिन्छ — १०-मिनेटको समीक्षा वा ट्युटोरियलमा क्लिक गर्ने दर्शक पहिले नै रुचि लिइरहेको हुन्छ, जसले YouTube क्रिएटरहरूलाई केवल देखाउनुभन्दा व्याख्या, प्रदर्शन, वा तुलना गर्नुपर्ने प्रोडक्ट वा सेवाहरूका लागि विशेष प्रभावकारी बनाउँछ। स्किनकेयर रुटिन, फोन समीक्षा, घरेलु-खाना रेसिपी, व्यक्तिगत-फाइनान्स विश्लेषण — यी सबै छ-सेकेन्डको क्लिपभन्दा विचारपूर्ण भिडियोको रूपमा राम्रोसँग बस्छन्।',
          'त्यो ढाँचाले निर्माणमा पनि बढी समय लाग्ने अर्थ राख्छ, त्यसैले सुरुमै सही क्रिएटरसँग मिलान गर्नु बढी महत्त्वपूर्ण हुन्छ। Kolab ले व्यवसायहरूलाई श्रेणी र स्थानअनुसार फिल्टर गरिएका YouTube क्रिएटर प्रोफाइलहरू ब्राउज गर्न, सम्पर्क गर्नुअघि नै क्रिएटरको सामान्य ढाँचा समीक्षा गर्न, र सही निच भएका YouTuber हरूले सिधै आवेदन दिन सक्ने क्याम्पेन पोस्ट गर्न दिन्छ।',
        ],
      },
      whatBrandsGet: {
        heading: 'Kolab मा YouTube क्रिएटरहरूबाट ब्रान्डहरूले के पाउँछन्',
        benefits: [
          { title: 'सही ढाँचा फेला पार्नुहोस्', desc: 'मिल्ने समीक्षक, ट्युटोरियल-निर्माता, वा भ्लगर फेला पार्न YouTube क्रिएटर प्रोफाइलहरू श्रेणी र स्थान अनुसार फिल्टर गर्नुहोस्।' },
          { title: 'क्याम्पेन वा इभेन्ट पोस्ट गर्नुहोस्', desc: 'तलबसहितको क्याम्पेन वा खुला इभेन्टका लागि बजेट र डेलिभरेबल — समर्पित समीक्षा, इन्टिग्रेसन, भ्लग उल्लेख — तय गर्नुहोस्।' },
          { title: 'सिधै म्यासेज गर्नुहोस्', desc: 'क्रिएटरले तपाईंको क्याम्पेनमा आवेदन दिएपछि ब्रिफ, कुराकानीका बुँदा, र प्रकाशन समयसीमा एपभित्रै मिलाउनुहोस्।' },
          { title: 'एस्क्रो सुरक्षासहित भुक्तानी गर्नुहोस्', desc: 'क्याम्पेन बजेटहरू एस्क्रोमा राखिन्छन् र तपाईंले प्रकाशित भिडियो स्वीकृत गरेपछि रिलिज हुन्छन्।' },
        ],
      },
      categories: {
        heading: 'Kolab मा YouTube सामग्री श्रेणीहरू',
        paragraph: `Kolab का YouTube क्रिएटरहरूले ${YOUTUBE_CATEGORIES_NE.join(', ')}, र अरू धेरै श्रेणी समेट्छन् — हातैले फोन र ग्याजेट समीक्षा गर्ने काठमाडौं-आधारित टेक च्यानलदेखि, परीक्षा तयारी व्याख्या गर्ने शिक्षा क्रिएटर, पूरा रेसिपी वाकथ्रु फिल्माउने बुटवल वा विराटनगरको फुड च्यानल, वा नेपाली दर्शकका लागि बजेटिङका आधारभूत कुरा व्याख्या गर्ने फाइनान्स क्रिएटरसम्म। श्रेणी अनुसार फिल्टर गर्नु भनेको ट्युटोरियल- वा समीक्षा-शैलीको प्रोडक्ट भएको ब्रान्डले शून्यबाट सुरु गर्नुको सट्टा त्यो ढाँचामा पहिले नै दक्ष क्रिएटर फेला पार्न सक्छ भन्ने हो।`,
        note: "YouTube भिडियोहरू योजना, फिल्मांकन, र सम्पादन गर्न छोटो-फर्म्याट सामग्रीभन्दा बढी समय लाग्ने भएकाले, क्याम्पेन समयसीमा र कुराकानीका बुँदाहरूमा सुरुमै स्पष्ट रूपमा सहमत हुनु राम्रो हुन्छ — Kolab को एपभित्रैको म्यासेजिङले त्यो ब्रिफलाई इमेल र च्याट थ्रेडमा छरिनुको सट्टा एउटै ठाउँमा राख्छ।",
      },
      howToHire: {
        heading: 'नेपालमा YouTube क्रिएटर कसरी भाडामा लिने',
        items: [
          'Kolab मा व्यावसायिक खाता बनाउनुहोस् र तलबसहितको क्याम्पेन वा निःशुल्क खुला इभेन्ट पोस्ट गर्नुहोस्।',
          'आफ्नो श्रेणी, प्लेटफर्म (YouTube), बजेट वा प्रस्ताव, र नेपालभरि कुनै पनि स्थान लक्ष्यीकरण तय गर्नुहोस्।',
          'सिधै YouTube क्रिएटर प्रोफाइलहरू ब्राउज गर्नुहोस्, वा तपाईंको क्याम्पेनमा पेश गरिएका प्रस्तावहरू समीक्षा गर्नुहोस्।',
          'ढाँचा, कुराकानीका बुँदा, र प्रकाशन मितिमा सहमत हुन छनोट गरिएका क्रिएटरहरूलाई एपमै म्यासेज गर्नुहोस्।',
          'प्रकाशित भिडियो स्वीकृत गर्नुहोस् र Kolab को एस्क्रो-सुरक्षित प्रणालीमार्फत भुक्तानी रिलिज गर्नुहोस्।',
          'सहकार्य सकिएपछि समीक्षा छोड्नुहोस्, भविष्यका क्याम्पेनका लागि रेकर्ड बनाउँदै।',
        ],
      },
      trust: {
        heading: 'प्रमाणित क्रिएटरहरू, सुरक्षित भुक्तानीहरू',
        paragraph: 'YouTube सहकार्य एउटा मात्र पोस्टभन्दा ठूलो प्रतिबद्धता हो, त्यसैले भरोसा कम होइन, बढी महत्त्वपूर्ण हुन्छ। Kolab ले नागरिकता-कागजात जाँच साथै इमेल र फोन प्रमाणीकरणद्वारा क्रिएटरको पहिचान प्रमाणित गर्छ, तपाईंले सम्पन्न भिडियो स्वीकृत नगरेसम्म तलबसहितको क्याम्पेन बजेट एस्क्रोमा राख्छ, र हरेक सहकार्यलाई पारदर्शी, इमानदार समीक्षासहित बन्द गर्छ — त्यसैले Kolab मा लामो-फर्म्याट YouTube साझेदारीले पनि छोटोजस्तै उही सुरक्षा पाउँछ।',
      },
    },
  },
};

export function YouTubeCreatorsPage() {
  return (
    <LandingLanguageProvider>
      <YouTubeCreatorsPageInner />
    </LandingLanguageProvider>
  );
}

function YouTubeCreatorsPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/youtube-creators',
        keywords: ['YouTube creator Nepal', 'YouTube Nepal', 'find YouTube creators Nepal', 'hire YouTube creators Nepal', 'YouTube creators Nepal', 'YouTube influencers Nepal'],
        jsonLd: webPageSchema({ path: '/youtube-creators', title: 'YouTube Creators in Nepal | Kolab', description: 'Discover YouTube creators in Nepal on Kolab.' }),
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/youtube-creators' }]}
      icon={PlayCircle}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
    >
      <ContentSection heading={t.sections.whyMatters.heading}>
        {t.sections.whyMatters.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </ContentSection>

      <ContentSection heading={t.sections.whatBrandsGet.heading}>
        <BenefitGrid
          items={t.sections.whatBrandsGet.benefits.map((b, i) => ({ icon: WHAT_BRANDS_GET_ICONS[i], title: b.title, desc: b.desc }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.categories.heading}>
        <p>{t.sections.categories.paragraph}</p>
        <p className="flex items-start gap-2.5">
          <BookOpen size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>{t.sections.categories.note}</span>
        </p>
      </ContentSection>

      <ContentSection heading={t.sections.howToHire.heading}>
        <ContentList items={t.sections.howToHire.items} />
      </ContentSection>

      <ContentSection heading={t.sections.trust.heading}>
        <p>{t.sections.trust.paragraph}</p>
      </ContentSection>
    </ContentPageLayout>
  );
}
