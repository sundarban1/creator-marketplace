import { ClipboardList, MessagesSquare, ScrollText, ShieldCheck, Star, Target } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Icons/accents are language-invariant, zipped by index with the translated
// title/desc pulled from COPY[lang] below.
const PROCESS_STEPS_ICONS = [ClipboardList, Target, MessagesSquare, ShieldCheck];

const COPY = {
  en: {
    seo: {
      title: 'Brand Collaboration Platform Nepal',
      description: "Kolab is Nepal's brand collaboration platform — connect with verified content creators, agree on deliverables, and pay securely through escrow-protected campaigns.",
    },
    breadcrumbName: 'Brand Collaboration Nepal',
    eyebrow: 'Brand Collaboration Nepal',
    heading: 'How Brand Collaborations Work on Kolab',
    intro: 'A brand collaboration is only as good as the process behind it. Kolab structures every step — from posting a campaign to the final review — so Nepali brands and creators know exactly what to expect at each stage.',
    faqs: [
      {
        question: 'What counts as a brand collaboration on Kolab?',
        answer: 'Any paid campaign or free open event a business posts, and a creator applies to and completes — from a single sponsored post to an ongoing content partnership.',
      },
      {
        question: 'How long does a typical collaboration take from posting to payment?',
        answer: "It depends on the campaign's deadline and deliverables, which the brand sets when posting. Because proposals, messaging, and approval all happen in-app, there's no added delay waiting on emails or separate payment transfers once the work is approved.",
      },
      {
        question: 'What happens if the delivered content does not match the brief?',
        answer: 'Payment is escrow-protected and only released once the brand reviews and approves the completed work, so brands and creators are expected to align on deliverables clearly during the messaging stage before work begins.',
      },
      {
        question: 'Can a collaboration involve more than one creator?',
        answer: 'Yes — a brand can post a single campaign or open event and review proposals from multiple creators, then work with as many as fit the budget and reach they need.',
      },
      {
        question: 'Is there a contract involved?',
        answer: "The campaign details — budget, deliverables, deadline — set by the brand when posting, plus the proposal a creator submits, form the terms both sides agree to when a collaboration is matched.",
      },
    ],
    related: [
      { label: 'For Brands', path: '/brands', description: 'Post a campaign and hire verified creators.' },
      { label: 'Influencer Marketing in Nepal', path: '/influencer-marketing-nepal', description: 'A guide to running influencer campaigns in Nepal.' },
      { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
      { label: 'Find Campaigns', path: '/find-campaigns', description: 'See how creators discover and apply to campaigns.' },
    ],
    cta: { heading: 'Start a Brand Collaboration Today', sub: 'Download Kolab and post your first campaign.' },
    sections: {
      processSteps: {
        heading: 'The collaboration process, step by step',
        benefits: [
          { title: '1. Post the campaign', desc: 'Set a budget, category, platform, and deadline for a paid campaign — or post a free open event instead.' },
          { title: '2. Review proposals', desc: 'Creators who fit the brief apply directly, so every proposal is already relevant to what you posted.' },
          { title: '3. Align in messages', desc: 'Message the creator directly in-app to confirm deliverables, timeline, and any specifics before work starts.' },
          { title: '4. Approve & pay via escrow', desc: 'Once the work is delivered, review it and approve — payment releases from escrow only at that point.' },
        ],
      },
      whyStructured: {
        heading: 'Why a structured process matters',
        paragraphs: [
          "Most brand-creator collaborations in Nepal still happen informally — a DM, a verbal agreement on price, a bank transfer, and hope that the content shows up as discussed. That works fine until it doesn't: a creator disappears after being paid upfront, a brand delays payment after content is delivered, or neither side is ever quite sure what the \"agreement\" actually was.",
          "Structuring the collaboration doesn't mean adding bureaucracy — it means the budget, deliverables, and deadline are visible before anyone applies, the messaging thread that follows is tied to that specific campaign, and the payment only moves once both sides have something concrete to point to: approved, delivered work.",
        ],
      },
      goodBrief: {
        heading: 'What a good collaboration brief includes',
        items: [
          'A clear budget — either a fixed paid-campaign amount or a defined open-event exchange (product, experience, exposure).',
          'The platform the content is for — Instagram, TikTok, YouTube, Facebook, or another supported platform.',
          'The category or niche the campaign fits (fashion, food, tech, fitness, travel, and more).',
          'A realistic deadline, so creators applying already know the timeline they are committing to.',
          'Any specific deliverables — post count, format, usage rights — stated up front rather than negotiated after matching.',
        ],
      },
      trustBothSides: {
        heading: 'Trust on both sides',
        paragraph: 'A collaboration platform only works if both sides can trust it. On Kolab, creator identity is confirmed through citizenship-document verification alongside email and phone checks, paid-campaign budgets sit in escrow until the brand approves the finished work, and every completed collaboration — for both the brand and the creator — ends with a transparent review.',
        starParagraph: "That review history is what makes repeat collaboration easier over time — a brand can see a creator's track record, and a creator can point to a real history of completed, paid work instead of screenshots of past posts.",
      },
      whereToStart: {
        heading: 'Where to start',
        before1: "If you're a brand ready to post your first campaign, head to the ",
        link1: 'for brands',
        after1: " page. If you want the broader picture of how Kolab's creator marketplace works, start with ",
        link2: "Nepal's creator marketplace",
        after2: ' overview.',
      },
    },
  },
  ne: {
    seo: {
      title: 'Brand Collaboration Platform Nepal',
      description: "Kolab is Nepal's brand collaboration platform — connect with verified content creators, agree on deliverables, and pay securely through escrow-protected campaigns.",
    },
    breadcrumbName: 'ब्रान्ड सहकार्य नेपाल',
    eyebrow: 'ब्रान्ड सहकार्य नेपाल',
    heading: 'Kolab मा ब्रान्ड सहकार्य कसरी काम गर्छ',
    intro: 'ब्रान्ड सहकार्य त्यति नै राम्रो हुन्छ जति त्यसको पछाडिको प्रक्रिया राम्रो हुन्छ। Kolab ले क्याम्पेन पोस्ट गर्नेदेखि अन्तिम समीक्षासम्म हरेक चरण संरचित बनाउँछ, ताकि नेपाली ब्रान्ड र क्रिएटरहरूलाई प्रत्येक चरणमा के अपेक्षा गर्ने भन्ने ठ्याक्कै थाहा होस्।',
    faqs: [
      {
        question: 'Kolab मा ब्रान्ड सहकार्य भनेको के हो?',
        answer: 'व्यवसायले पोस्ट गरेको र क्रिएटरले आवेदन दिई पूरा गरेको जुनसुकै तलबसहितको क्याम्पेन वा निःशुल्क खुला इभेन्ट — एउटै स्पन्सर्ड पोस्टदेखि निरन्तर चलिरहने कन्टेन्ट साझेदारीसम्म।',
      },
      {
        question: 'पोस्ट गरेदेखि भुक्तानीसम्म सामान्यतया सहकार्यमा कति समय लाग्छ?',
        answer: 'यो क्याम्पेनको समयसीमा र डेलिभरेबलमा भर पर्छ, जुन ब्रान्डले पोस्ट गर्दा नै तय गर्छ। प्रस्ताव, म्यासेजिङ, र स्वीकृति सबै एपभित्रै हुने भएकाले, काम स्वीकृत भएपछि इमेल वा छुट्टै भुक्तानी ट्रान्सफरको पर्खाइमा थप ढिलाइ हुँदैन।',
      },
      {
        question: 'दिइएको सामग्री ब्रिफसँग नमिलेमा के हुन्छ?',
        answer: 'भुक्तानी एस्क्रो-सुरक्षित हुन्छ र ब्रान्डले सम्पन्न काम समीक्षा र स्वीकृत गरेपछि मात्र रिलिज हुन्छ, त्यसैले काम सुरु हुनुअघि नै म्यासेजिङ चरणमा ब्रान्ड र क्रिएटरले डेलिभरेबलमा स्पष्ट रूपमा सहमत हुनु अपेक्षित हुन्छ।',
      },
      {
        question: 'के एउटा सहकार्यमा एकभन्दा बढी क्रिएटर संलग्न हुन सक्छन्?',
        answer: 'हो — एउटा ब्रान्डले एउटै क्याम्पेन वा खुला इभेन्ट पोस्ट गरी धेरै क्रिएटरका प्रस्तावहरू समीक्षा गर्न सक्छ, त्यसपछि आफ्नो बजेट र पहुँचअनुसार जति क्रिएटरसँग चाहिन्छ त्यति क्रिएटरसँग काम गर्न सक्छ।',
      },
      {
        question: 'के यसमा कुनै सम्झौता हुन्छ?',
        answer: 'ब्रान्डले पोस्ट गर्दा तय गरेको क्याम्पेन विवरण — बजेट, डेलिभरेबल, समयसीमा — र क्रिएटरले पेश गरेको प्रस्तावले नै सहकार्य मिलेपछि दुवै पक्ष सहमत हुने सर्तहरू बनाउँछ।',
      },
    ],
    related: [
      { label: 'ब्रान्डहरूका लागि', path: '/brands', description: 'क्याम्पेन पोस्ट गर्नुहोस् र प्रमाणित क्रिएटरहरू भाडामा लिनुहोस्।' },
      { label: 'नेपालमा इन्फ्लुएन्सर मार्केटिङ', path: '/influencer-marketing-nepal', description: 'नेपालमा इन्फ्लुएन्सर क्याम्पेन चलाउने गाइड।' },
      { label: 'क्रिएटर मार्केटप्लेस नेपाल', path: '/creator-marketplace-nepal', description: 'Kolab को सम्पूर्ण क्रिएटर मार्केटप्लेस झलक।' },
      { label: 'क्याम्पेन खोज्नुहोस्', path: '/find-campaigns', description: 'क्रिएटरहरूले क्याम्पेन कसरी फेला पार्छन् र आवेदन दिन्छन् हेर्नुहोस्।' },
    ],
    cta: { heading: 'आज नै ब्रान्ड सहकार्य सुरु गर्नुहोस्', sub: 'Kolab डाउनलोड गर्नुहोस् र आफ्नो पहिलो क्याम्पेन पोस्ट गर्नुहोस्।' },
    sections: {
      processSteps: {
        heading: 'सहकार्य प्रक्रिया, चरणबद्ध रूपमा',
        benefits: [
          { title: '१. क्याम्पेन पोस्ट गर्नुहोस्', desc: 'तलबसहितको क्याम्पेनका लागि बजेट, श्रेणी, प्लेटफर्म, र समयसीमा तय गर्नुहोस् — वा त्यसको सट्टा निःशुल्क खुला इभेन्ट पोस्ट गर्नुहोस्।' },
          { title: '२. प्रस्तावहरू समीक्षा गर्नुहोस्', desc: 'ब्रिफसँग मिल्ने क्रिएटरहरूले सिधै आवेदन दिन्छन्, त्यसैले प्रत्येक प्रस्ताव तपाईंले पोस्ट गरेको कुरासँग पहिले नै सान्दर्भिक हुन्छ।' },
          { title: '३. म्यासेजमा सहमत हुनुहोस्', desc: 'काम सुरु हुनुअघि डेलिभरेबल, समयसीमा, र अन्य विवरणहरू पक्का गर्न क्रिएटरलाई एपभित्रै सिधै म्यासेज गर्नुहोस्।' },
          { title: '४. स्वीकृत गर्नुहोस् र एस्क्रो मार्फत भुक्तानी गर्नुहोस्', desc: 'काम बुझाइएपछि, यसलाई समीक्षा गरी स्वीकृत गर्नुहोस् — त्यसपछि मात्र एस्क्रोबाट भुक्तानी रिलिज हुन्छ।' },
        ],
      },
      whyStructured: {
        heading: 'किन संरचित प्रक्रिया महत्त्वपूर्ण छ',
        paragraphs: [
          'नेपालमा धेरैजसो ब्रान्ड-क्रिएटर सहकार्य अझै पनि अनौपचारिक रूपमै हुन्छ — एउटा DM, मूल्यमा मौखिक सहमति, बैंक ट्रान्सफर, र सामग्री सहमति भएअनुसार नै आउला भन्ने आशा। यो कहिलेकाहीं ठिकै चल्छ, तर बिग्रिँदा बिग्रिन्छ: अग्रिम भुक्तानी पाएपछि क्रिएटर हराउँछ, सामग्री बुझाइसकेपछि ब्रान्डले भुक्तानी ढिलो गर्छ, वा कुनै पक्षलाई "सम्झौता" वास्तवमा के थियो भन्ने कहिल्यै पक्का हुँदैन।',
          'सहकार्यलाई संरचित बनाउनुको अर्थ थप कागजी प्रक्रिया थप्नु होइन — यसको अर्थ हो, कसैले आवेदन दिनुअघि नै बजेट, डेलिभरेबल, र समयसीमा देखिन्छ, त्यसपछिको म्यासेजिङ थ्रेड त्यही निश्चित क्याम्पेनसँग जोडिएको हुन्छ, र भुक्तानी दुवै पक्षसँग देखाउन मिल्ने ठोस कुरा — स्वीकृत, बुझाइएको काम — भएपछि मात्र चल्छ।',
        ],
      },
      goodBrief: {
        heading: 'राम्रो सहकार्य ब्रिफमा के समावेश हुन्छ',
        items: [
          'स्पष्ट बजेट — या त निश्चित तलबसहितको क्याम्पेन रकम वा परिभाषित खुला-इभेन्ट साटासाट (प्रोडक्ट, अनुभव, एक्सपोजर)।',
          'सामग्री कुन प्लेटफर्मका लागि हो — Instagram, TikTok, YouTube, Facebook, वा समर्थित अन्य कुनै प्लेटफर्म।',
          'क्याम्पेन मिल्ने श्रेणी वा निच (फेसन, खाना, प्रविधि, फिटनेस, यात्रा, र अरू धेरै)।',
          'यथार्थपरक समयसीमा, ताकि आवेदन दिने क्रिएटरहरूलाई उनीहरूले प्रतिबद्ध हुने समयसीमा पहिले नै थाहा होस्।',
          'मिलान भएपछि छलफल गर्नुको सट्टा पहिले नै उल्लेख गरिएका विशेष डेलिभरेबलहरू — पोस्ट संख्या, ढाँचा, प्रयोग अधिकार।',
        ],
      },
      trustBothSides: {
        heading: 'दुवै पक्षमा भरोसा',
        paragraph: 'सहकार्य प्लेटफर्मले तब मात्र काम गर्छ जब दुवै पक्षले यसमा भरोसा गर्न सक्छन्। Kolab मा, क्रिएटरको पहिचान नागरिकता-कागजात प्रमाणीकरण, इमेल, र फोन जाँचमार्फत पुष्टि गरिन्छ, ब्रान्डले सम्पन्न काम स्वीकृत नगरेसम्म तलबसहितको क्याम्पेन बजेट एस्क्रोमा रहन्छ, र प्रत्येक सम्पन्न सहकार्य — ब्रान्ड र क्रिएटर दुवैका लागि — पारदर्शी समीक्षासँग सकिन्छ।',
        starParagraph: 'त्यही समीक्षा इतिहासले समयसँगै दोहोरिने सहकार्यलाई सजिलो बनाउँछ — ब्रान्डले क्रिएटरको ट्र्याक रेकर्ड हेर्न सक्छ, र क्रिएटरले विगतका पोस्टका स्क्रिनसटको सट्टा सम्पन्न, तलबसहितका कामको वास्तविक इतिहास देखाउन सक्छ।',
      },
      whereToStart: {
        heading: 'कहाँबाट सुरु गर्ने',
        before1: 'यदि तपाईं आफ्नो पहिलो क्याम्पेन पोस्ट गर्न तयार ब्रान्ड हुनुहुन्छ भने, ',
        link1: 'ब्रान्डहरूका लागि',
        after1: ' पेजमा जानुहोस्। Kolab को क्रिएटर मार्केटप्लेस समग्रमा कसरी काम गर्छ भन्ने बुझ्न चाहनुहुन्छ भने, ',
        link2: 'नेपालको क्रिएटर मार्केटप्लेस',
        after2: ' बाट सुरु गर्नुहोस्।',
      },
    },
  },
};

export function BrandCollaborationNepalPage() {
  return (
    <LandingLanguageProvider>
      <BrandCollaborationNepalPageInner />
    </LandingLanguageProvider>
  );
}

function BrandCollaborationNepalPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/brand-collaboration-nepal',
        keywords: ['brand collaboration Nepal', 'creator collaboration', 'brand campaign Nepal', 'creator marketplace Nepal', 'collaborate with brands Nepal', 'collaborate with creators Nepal', 'brand partnership Nepal', 'creator partnership Nepal'],
        jsonLd: webPageSchema({ path: '/brand-collaboration-nepal', title: 'Brand Collaboration Platform Nepal | Kolab', description: "How brand collaborations work end to end on Kolab." }),
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/brand-collaboration-nepal' }]}
      icon={Target}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
    >
      <ContentSection heading={t.sections.processSteps.heading}>
        <BenefitGrid
          items={t.sections.processSteps.benefits.map((b, i) => ({ icon: PROCESS_STEPS_ICONS[i], title: b.title, desc: b.desc }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.whyStructured.heading}>
        {t.sections.whyStructured.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </ContentSection>

      <ContentSection heading={t.sections.goodBrief.heading}>
        <ContentList items={t.sections.goodBrief.items} />
      </ContentSection>

      <ContentSection heading={t.sections.trustBothSides.heading}>
        <p>{t.sections.trustBothSides.paragraph}</p>
        <p className="flex items-start gap-2.5">
          <Star size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>{t.sections.trustBothSides.starParagraph}</span>
        </p>
      </ContentSection>

      <ContentSection heading={t.sections.whereToStart.heading}>
        <p className="flex items-start gap-2.5">
          <ScrollText size={18} className="mt-0.5 flex-shrink-0 text-violet" />
          <span>
            {t.sections.whereToStart.before1}
            <a href="/brands" className="font-medium text-violet hover:underline">{t.sections.whereToStart.link1}</a>
            {t.sections.whereToStart.after1}
            <a href="/creator-marketplace-nepal" className="font-medium text-violet hover:underline">{t.sections.whereToStart.link2}</a>
            {t.sections.whereToStart.after2}
          </span>
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
