import { Compass, MessageSquare, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Icons/accents are language-invariant, zipped by index with the translated
// title/desc pulled from COPY[lang] below.
const WHAT_BRANDS_GET_ICONS = [Compass, Video, MessageSquare, ShieldCheck];

const UGC_FORMATS = {
  en: ['Unboxings', 'Product reviews', 'Testimonials', 'Before & after', 'Day-in-the-life', 'Tutorials & how-tos'],
  ne: ['अनबक्सिङ', 'प्रोडक्ट समीक्षा', 'टेस्टिमोनियल', 'पहिले र पछि', 'दैनिक जीवनको झलक', 'ट्युटोरियल र गाइड'],
};

const COPY = {
  en: {
    seo: {
      title: 'UGC Creators in Nepal | Hire UGC Content Creators',
      description: 'Hire UGC creators in Nepal on Kolab. Get authentic, ad-ready reviews, unboxings, and testimonials from verified creators for your brand — no large following required.',
    },
    breadcrumbName: 'UGC Creators',
    eyebrow: 'UGC Creators',
    heading: 'Hire UGC Creators in Nepal',
    intro: "User-generated content — an honest unboxing, a real review, a quick testimonial — often converts better than a polished ad, precisely because it doesn't look like one. Kolab connects brands with Nepali creators who make exactly this kind of content, whether or not they have a large following of their own.",
    faqs: [
      {
        question: 'What is UGC, and how is it different from influencer marketing?',
        answer: "UGC (user-generated content) is authentic, native-feeling content — reviews, unboxings, testimonials — made to be used in your own ads, website, or social channels. Influencer marketing is about reaching a creator's own audience through their account. On Kolab, the same creator profiles can do either: post a campaign asking for UGC-style deliverables if that's what you need, or a standard collaboration if you want the content to go out on the creator's own page.",
      },
      {
        question: 'Do UGC creators need a large following?',
        answer: "No. Since UGC is meant for your channels, not the creator's, follower count matters far less than content quality, delivery, and fit with your brand. This makes UGC a practical way to work with skilled creators on Kolab regardless of audience size.",
      },
      {
        question: 'How do I hire a UGC creator on Kolab?',
        answer: 'Post a paid campaign describing the UGC format you need — an unboxing, a testimonial, a demo — along with your budget and any script or talking points. Creators who fit apply with a proposal, and you review profiles and pick who to work with.',
      },
      {
        question: 'Can I reuse UGC content in my own ads?',
        answer: "Usage rights aren't a fixed platform setting — agree on exactly how the content can be used (organic posting only, vs. paid ads, vs. website use) directly with the creator as part of your campaign brief before work starts, so both sides are clear upfront.",
      },
      {
        question: 'How is payment handled for UGC work?',
        answer: 'The same escrow-protected system used for every campaign on Kolab applies to UGC work — your budget is held securely and released to the creator once you approve the delivered content.',
      },
      {
        question: 'What kind of UGC content can I request?',
        answer: `Common formats brands request include ${UGC_FORMATS.en.slice(0, 4).join(', ')}, and more — describe the format and length you need in your campaign brief so creators can pitch accordingly.`,
      },
    ],
    related: [
      { label: 'For Brands', path: '/brands', description: 'Post a campaign and hire creators for your next project.' },
      { label: 'Paid Collaborations', path: '/paid-collaborations-nepal', description: 'How paid campaigns and brand deals work on Kolab.' },
      { label: 'Content Creators', path: '/content-creators', description: 'For creators looking to make UGC and other paid content.' },
      { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
    ],
    cta: { heading: 'Ready to Get Authentic Content for Your Brand?', sub: 'Download Kolab and post a UGC campaign in minutes.' },
    sections: {
      whyUgc: {
        heading: 'Why brands in Nepal are turning to UGC',
        paragraphs: [
          "Audiences have gotten good at scrolling past anything that looks like an ad. Content that looks like it came from a real person — a shaky unboxing, an honest opinion, a quick before-and-after — earns attention precisely because it doesn't feel staged. That's the core appeal of UGC: it borrows the credibility of a real customer's voice, even when it's commissioned and paid for.",
          "Kolab makes it possible to source that kind of content deliberately, from creators who already know how to make it feel native to a phone screen, instead of waiting for it to happen organically or guessing at who can deliver it.",
        ],
      },
      whatBrandsGet: {
        heading: 'What brands get from UGC creators on Kolab',
        benefits: [
          { title: 'Find the right fit', desc: 'Browse creator profiles by category and location to find creators whose style suits an authentic, unscripted format.' },
          { title: 'Brief the exact format', desc: 'Describe the UGC format you need — unboxing, testimonial, demo — in your campaign so creators pitch accordingly.' },
          { title: 'Coordinate in-app', desc: "Share scripts, talking points, and feedback directly with the creator through Kolab's messaging, no scattered DMs." },
          { title: 'Pay with escrow protection', desc: 'Your budget is held securely and released only once you approve the delivered content.' },
        ],
      },
      commonFormats: {
        heading: 'Common UGC formats requested on Kolab',
      },
      howToHire: {
        heading: 'How to hire a UGC creator in Nepal',
        items: [
          'Create a business account on Kolab and post a paid campaign.',
          'Describe the UGC format, script or talking points, and deliverable length in your brief.',
          'Set your budget and location targeting anywhere in Nepal, and review creator proposals as they come in.',
          'Message the creator you choose to align on shot list, timing, and how the final content can be used.',
          "Approve the delivered content and release payment through Kolab's escrow-protected system.",
          'Leave a review once the collaboration wraps up — helpful for future UGC campaigns on both sides.',
        ],
      },
    },
  },
  ne: {
    seo: {
      title: 'UGC Creators in Nepal | Hire UGC Content Creators',
      description: 'Hire UGC creators in Nepal on Kolab. Get authentic, ad-ready reviews, unboxings, and testimonials from verified creators for your brand — no large following required.',
    },
    breadcrumbName: 'UGC क्रिएटरहरू',
    eyebrow: 'UGC क्रिएटरहरू',
    heading: 'नेपालमा UGC क्रिएटरहरू भाडामा लिनुहोस्',
    intro: 'प्रयोगकर्ता-निर्मित सामग्री — एउटा इमानदार अनबक्सिङ, साँचो समीक्षा, छोटो टेस्टिमोनियल — प्रायः पालिस गरिएको विज्ञापनभन्दा राम्रोसँग कन्भर्ट हुन्छ, ठ्याक्कै किनभने यो विज्ञापनजस्तो देखिँदैन। Kolab ले ब्रान्डहरूलाई ठ्याक्कै यस्तै किसिमको सामग्री बनाउने नेपाली क्रिएटरहरूसँग जोड्छ, तिनीहरूको आफ्नै ठूलो फलोअरिङ छ या छैन भन्ने कुराले फरक पार्दैन।',
    faqs: [
      {
        question: 'UGC के हो, र यो इन्फ्लुएन्सर मार्केटिङभन्दा कसरी फरक छ?',
        answer: 'UGC (प्रयोगकर्ता-निर्मित सामग्री) प्रामाणिक, स्वाभाविक महसुस हुने सामग्री हो — समीक्षा, अनबक्सिङ, टेस्टिमोनियल — जुन तपाईंको आफ्नै विज्ञापन, वेबसाइट, वा सामाजिक च्यानलहरूमा प्रयोग गर्न बनाइन्छ। इन्फ्लुएन्सर मार्केटिङ भनेको क्रिएटरको आफ्नै खातामार्फत उनको आफ्नै दर्शकवर्गसम्म पुग्ने कुरा हो। Kolab मा, उही क्रिएटर प्रोफाइलहरूले दुवै गर्न सक्छन्: तपाईंलाई त्यही चाहिन्छ भने UGC-शैलीको डेलिभरेबल माग्ने क्याम्पेन पोस्ट गर्नुहोस्, वा सामग्री क्रिएटरको आफ्नै पेजमा जाओस् भन्ने चाहनुहुन्छ भने मानक सहकार्य।',
      },
      {
        question: 'UGC क्रिएटरहरूलाई ठूलो फलोअरिङ चाहिन्छ?',
        answer: 'चाहिँदैन। UGC तपाईंका च्यानलहरूका लागि बनाइएको हो, क्रिएटरका होइन, त्यसैले फलोअर संख्याले सामग्रीको गुणस्तर, डेलिभरी, र तपाईंको ब्रान्डसँगको मिलानभन्दा धेरै कम महत्त्व राख्छ। यसले UGC लाई दर्शकवर्गको आकार जेसुकै भए पनि Kolab मा दक्ष क्रिएटरहरूसँग काम गर्ने व्यावहारिक तरिका बनाउँछ।',
      },
      {
        question: 'Kolab मा UGC क्रिएटर कसरी भाडामा लिने?',
        answer: 'तपाईंलाई चाहिने UGC ढाँचा — अनबक्सिङ, टेस्टिमोनियल, डेमो — वर्णन गर्दै आफ्नो बजेट र कुनै स्क्रिप्ट वा कुराका बुँदाहरूसहित तलबसहितको क्याम्पेन पोस्ट गर्नुहोस्। मिल्ने क्रिएटरहरूले प्रस्तावसहित आवेदन दिन्छन्, र तपाईंले प्रोफाइलहरू समीक्षा गरी कोसँग काम गर्ने भनी छान्नुहुन्छ।',
      },
      {
        question: 'के म UGC सामग्री आफ्नै विज्ञापनमा पुनः प्रयोग गर्न सक्छु?',
        answer: 'प्रयोग अधिकार निश्चित प्लेटफर्म सेटिङ होइन — सामग्री कसरी प्रयोग गर्न सकिन्छ (केवल अर्गानिक पोस्टिङ, वा तलबसहितको विज्ञापन, वा वेबसाइट प्रयोग) भनेर काम सुरु हुनुअघि नै आफ्नो क्याम्पेन ब्रिफको भागको रूपमा सिधै क्रिएटरसँग सहमत हुनुहोस्, ताकि दुवै पक्षलाई सुरुदेखि नै स्पष्ट होस्।',
      },
      {
        question: 'UGC कामको लागि भुक्तानी कसरी हुन्छ?',
        answer: 'Kolab मा हरेक क्याम्पेनका लागि प्रयोग हुने उही एस्क्रो-सुरक्षित प्रणाली UGC काममा पनि लागू हुन्छ — तपाईंको बजेट सुरक्षित राखिन्छ र तपाईंले डेलिभर गरिएको सामग्री स्वीकृत गरेपछि क्रिएटरलाई रिलिज गरिन्छ।',
      },
      {
        question: 'म कस्तो किसिमको UGC सामग्री अनुरोध गर्न सक्छु?',
        answer: `ब्रान्डहरूले सामान्यतया अनुरोध गर्ने ढाँचाहरूमा ${UGC_FORMATS.ne.slice(0, 4).join(', ')}, र थप समावेश छन् — क्रिएटरहरूले सोहीअनुसार प्रस्ताव पेश गर्न सकून् भनेर आफ्नो क्याम्पेन ब्रिफमा तपाईंलाई चाहिने ढाँचा र लम्बाइ वर्णन गर्नुहोस्।`,
      },
    ],
    related: [
      { label: 'ब्रान्डहरूका लागि', path: '/brands', description: 'क्याम्पेन पोस्ट गर्नुहोस् र आफ्नो अर्को प्रोजेक्टका लागि क्रिएटरहरू भाडामा लिनुहोस्।' },
      { label: 'तलबसहितका सहकार्यहरू', path: '/paid-collaborations-nepal', description: 'Kolab मा तलबसहितका क्याम्पेन र ब्रान्ड डिलहरू कसरी काम गर्छन्।' },
      { label: 'कन्टेन्ट क्रिएटरहरू', path: '/content-creators', description: 'UGC र अन्य तलबसहितको सामग्री बनाउन चाहने क्रिएटरहरूका लागि।' },
      { label: 'क्रिएटर मार्केटप्लेस नेपाल', path: '/creator-marketplace-nepal', description: 'Kolab को पूर्ण क्रिएटर मार्केटप्लेस अवलोकन।' },
    ],
    cta: { heading: 'आफ्नो ब्रान्डका लागि प्रामाणिक सामग्री पाउन तयार हुनुहुन्छ?', sub: 'Kolab डाउनलोड गर्नुहोस् र मिनेटमै UGC क्याम्पेन पोस्ट गर्नुहोस्।' },
    sections: {
      whyUgc: {
        heading: 'नेपालका ब्रान्डहरू किन UGC तिर आकर्षित भइरहेका छन्',
        paragraphs: [
          "दर्शकहरू विज्ञापनजस्तो देखिने कुनै पनि कुरालाई स्क्रोल गरेर छोड्न निपुण भइसकेका छन्। साँचो व्यक्तिबाट आएको जस्तो देखिने सामग्री — हल्लिँदो अनबक्सिङ, इमानदार विचार, छोटो पहिले-र-पछि — मञ्चित महसुस नहुने भएकैले ठ्याक्कै ध्यान तान्छ। यही नै UGC को मूल आकर्षण हो: यसले साँचो ग्राहकको आवाजको विश्वसनीयता उधारो लिन्छ, त्यो कमिसन गरिएको र भुक्तानी गरिएको भए पनि।",
          'Kolab ले फोन स्क्रिनमा स्वाभाविक महसुस हुने सामग्री कसरी बनाउने भन्ने पहिले नै थाहा भएका क्रिएटरहरूबाट, जैविक रूपमा हुनको प्रतीक्षा गर्नु वा को डेलिभर गर्न सक्छ भनेर अनुमान लगाउनुको सट्टा, त्यस्तो सामग्री जानाजानी स्रोत गर्न सम्भव बनाउँछ।',
        ],
      },
      whatBrandsGet: {
        heading: 'Kolab का UGC क्रिएटरहरूबाट ब्रान्डहरूले के पाउँछन्',
        benefits: [
          { title: 'उपयुक्त फिट फेला पार्नुहोस्', desc: 'प्रामाणिक, स्क्रिप्ट-रहित ढाँचामा मिल्ने स्टाइल भएका क्रिएटरहरू फेला पार्न श्रेणी र स्थानअनुसार क्रिएटर प्रोफाइलहरू ब्राउज गर्नुहोस्।' },
          { title: 'ठ्याक्कै ढाँचा ब्रिफ गर्नुहोस्', desc: 'तपाईंलाई चाहिने UGC ढाँचा — अनबक्सिङ, टेस्टिमोनियल, डेमो — आफ्नो क्याम्पेनमा वर्णन गर्नुहोस् ताकि क्रिएटरहरूले सोहीअनुसार प्रस्ताव पेश गरून्।' },
          { title: 'एपभित्रै समन्वय गर्नुहोस्', desc: 'Kolab को म्यासेजिङमार्फत स्क्रिप्ट, कुराका बुँदाहरू, र संशोधनहरू सिधै क्रिएटरसँग साझा गर्नुहोस्, छरिएका DM हरू छैनन्।' },
          { title: 'एस्क्रो सुरक्षासहित भुक्तानी गर्नुहोस्', desc: 'तपाईंको बजेट सुरक्षित राखिन्छ र तपाईंले डेलिभर गरिएको सामग्री स्वीकृत गरेपछि मात्र रिलिज हुन्छ।' },
        ],
      },
      commonFormats: {
        heading: 'Kolab मा अनुरोध गरिने सामान्य UGC ढाँचाहरू',
      },
      howToHire: {
        heading: 'नेपालमा UGC क्रिएटर कसरी भाडामा लिने',
        items: [
          'Kolab मा व्यावसायिक खाता बनाउनुहोस् र तलबसहितको क्याम्पेन पोस्ट गर्नुहोस्।',
          'आफ्नो ब्रिफमा UGC ढाँचा, स्क्रिप्ट वा कुराका बुँदाहरू, र डेलिभरेबल लम्बाइ वर्णन गर्नुहोस्।',
          'आफ्नो बजेट तय गर्नुहोस् र नेपालभरि जुनसुकै स्थान लक्षित गर्नुहोस्, अनि आउने क्रिएटर प्रस्तावहरू समीक्षा गर्नुहोस्।',
          'शट लिस्ट, समय, र अन्तिम सामग्री कसरी प्रयोग गर्न सकिन्छ भनेर सहमत हुन आफूले छानेको क्रिएटरलाई म्यासेज गर्नुहोस्।',
          'डेलिभर गरिएको सामग्री स्वीकृत गर्नुहोस् र Kolab को एस्क्रो-सुरक्षित प्रणालीमार्फत भुक्तानी रिलिज गर्नुहोस्।',
          'सहकार्य सकिएपछि समीक्षा छोड्नुहोस् — दुवै पक्षका भविष्यका UGC क्याम्पेनहरूका लागि उपयोगी।',
        ],
      },
    },
  },
};

export function UGCCreatorsPage() {
  return (
    <LandingLanguageProvider>
      <UGCCreatorsPageInner />
    </LandingLanguageProvider>
  );
}

function UGCCreatorsPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];
  const formats = UGC_FORMATS[lang];

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/ugc-creators-nepal',
        keywords: ['UGC creators Nepal', 'hire UGC creators Nepal', 'UGC content Nepal', 'user generated content Nepal', 'UGC vs influencer marketing', 'authentic content creators Nepal', 'UGC content creator Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/ugc-creators-nepal', title: 'UGC Creators in Nepal | Kolab', description: 'Hire UGC creators in Nepal on Kolab for authentic, ad-ready content.' })],
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/ugc-creators-nepal' }]}
      icon={Sparkles}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
    >
      <ContentSection heading={t.sections.whyUgc.heading}>
        {t.sections.whyUgc.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </ContentSection>

      <ContentSection heading={t.sections.whatBrandsGet.heading}>
        <BenefitGrid
          items={t.sections.whatBrandsGet.benefits.map((b, i) => ({ icon: WHAT_BRANDS_GET_ICONS[i], title: b.title, desc: b.desc }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.commonFormats.heading}>
        <p>
          {lang === 'en'
            ? `Brands typically request formats like ${formats.join(', ')}. None of these require a creator with a large audience — they require someone who can deliver a believable, well-shot piece of content on a brief, which is exactly what a UGC-focused campaign is built to source.`
            : `ब्रान्डहरूले सामान्यतया ${formats.join(', ')} जस्ता ढाँचाहरू अनुरोध गर्छन्। यीमध्ये कुनैलाई पनि ठूलो दर्शकवर्ग भएको क्रिएटर चाहिँदैन — तिनीहरूलाई ब्रिफअनुसार विश्वसनीय, राम्रोसँग खिचिएको सामग्री डेलिभर गर्न सक्ने कोही चाहिन्छ, जुन ठ्याक्कै UGC-केन्द्रित क्याम्पेनले स्रोत गर्न बनाइएको हो।`}
        </p>
      </ContentSection>

      <ContentSection heading={t.sections.howToHire.heading}>
        <ContentList items={t.sections.howToHire.items} />
      </ContentSection>
    </ContentPageLayout>
  );
}
