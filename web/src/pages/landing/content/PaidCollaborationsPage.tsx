import { Banknote, Compass, Handshake, Megaphone, ShieldCheck, Users } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Icons/accents are language-invariant, zipped by index with the translated
// title/desc pulled from COPY[lang] below.
const WHAT_YOU_GET_ICONS = [Compass, Megaphone, ShieldCheck, Handshake];

const COPY = {
  en: {
    seo: {
      title: 'Paid Collaborations & Brand Deals in Nepal | Kolab',
      description: 'Get paid collaborations and brand deals in Nepal on Kolab. Sponsorship opportunities and paid promotion work for TikTok, Instagram, and YouTube creators.',
    },
    breadcrumbName: 'Paid Collaborations',
    eyebrow: 'Paid Collaborations Nepal',
    heading: 'Get Paid Brand Deals in Nepal',
    intro: "Whether you're posting on TikTok, Instagram, YouTube, or Facebook, Kolab is where Nepali creators turn a following into real, paid work — with visible budgets, direct brand contact, and payment protected until the job is done.",
    faqs: [
      {
        question: 'How do I get brand deals in Nepal?',
        answer: 'Create a creator profile on Kolab with your categories and connected platforms, then browse open paid campaigns and apply with a proposal. Brands also discover creators directly by browsing profiles, so a complete, well-categorized profile increases your chances of being approached.',
      },
      {
        question: 'How much can I earn from sponsorships on Kolab?',
        answer: 'Every paid campaign shows its budget before you apply, so earnings vary by brand and deliverables — but you always know what a collaboration pays before committing your time.',
      },
      {
        question: 'Can I get paid for TikTok, Instagram, or YouTube content specifically?',
        answer: 'Yes. Campaigns on Kolab specify which platform they need — TikTok, Instagram, YouTube, Facebook, and others — so you can filter for sponsorship opportunities that match where your audience actually is.',
      },
      {
        question: "What if a brand doesn't pay after I deliver the work?",
        answer: "Paid campaigns on Kolab use escrow — the brand's budget is held securely from the start and only released to you once they approve the completed work, so you're not left chasing payment after a deal.",
      },
      {
        question: 'Do I need a large following to land paid promotions?',
        answer: 'No strict minimum applies. Brands evaluate creators by niche, content quality, and audience fit for a specific campaign, so creators with smaller but engaged followings regularly land paid deals.',
      },
      {
        question: 'Is joining Kolab as a creator free?',
        answer: 'Yes — Kolab is a free download, and building a profile and applying to paid campaigns costs nothing.',
      },
    ],
    related: [
      { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
      { label: 'Find Campaigns', path: '/find-campaigns', description: 'Browse open paid campaigns and free events right now.' },
      { label: 'TikTok Creators', path: '/tiktok-creators', description: 'TikTok-specific creator opportunities.' },
      { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
      { label: 'UGC Creators', path: '/ugc-creators-nepal', description: 'Paid UGC work — reviews, unboxings, and testimonials.' },
    ],
    cta: { heading: 'Start Landing Paid Collaborations', sub: 'Download Kolab and build your creator profile in minutes.' },
    sections: {
      whereFrom: {
        heading: 'Where paid collaborations actually come from',
        paragraphs: [
          "Most creators in Nepal still land their first brand deal through a DM, a mutual connection, or pure luck — which also means most brands never see them at all. Kolab replaces that with a structured pipeline: brands post campaigns with a real budget attached, and creators who fit the niche, platform, and audience can apply directly, or get discovered by browsing their profile.",
          "That structure works in your favor. Instead of negotiating rates from scratch over DM, you see the budget before you apply. Instead of hoping a brand pays on time, the money is already held in escrow before the work even starts.",
        ],
      },
      whatYouGet: {
        heading: 'What you get as a creator on Kolab',
        benefits: [
          { title: 'Get discovered', desc: 'Brands browse creator profiles by category, platform, and location — a complete profile puts you in front of relevant deals.' },
          { title: 'See the budget upfront', desc: "Every paid campaign lists its budget and deliverables before you apply, so there's no guessing or awkward rate negotiation." },
          { title: 'Escrow-protected payment', desc: "Campaign budgets are held securely and released to you once your work is approved — payment is never dependent on a brand's goodwill." },
          { title: 'Direct brand contact', desc: 'Message brands in-app once matched to align on deliverables, timelines, and creative direction — no scattered, unpaid DMs.' },
        ],
      },
      howToStart: {
        heading: 'How to start earning from brand deals',
        items: [
          'Download Kolab and create a creator profile with your niche and connected platforms (TikTok, Instagram, YouTube, Facebook, and more).',
          "Complete identity verification so brands can trust who they're working with.",
          'Browse open paid campaigns and free events, filtered by category, platform, and location.',
          "Apply with a proposal to campaigns that fit your content — budgets are visible before you commit.",
          'Message the brand directly once matched, and deliver the agreed content.',
          'Get paid through escrow once the brand approves your work, and build a public review history for future deals.',
        ],
      },
      growingNetwork: {
        heading: 'Join a growing creator network',
        paragraph: "Kolab's creator community spans every major platform and category across Nepal — the more active the network, the more campaigns brands post, and the more sponsorship opportunities show up for creators at every follower size.",
      },
    },
  },
  ne: {
    seo: {
      title: 'Paid Collaborations & Brand Deals in Nepal | Kolab',
      description: 'Get paid collaborations and brand deals in Nepal on Kolab. Sponsorship opportunities and paid promotion work for TikTok, Instagram, and YouTube creators.',
    },
    breadcrumbName: 'तलबसहितका सहकार्यहरू',
    eyebrow: 'नेपालमा तलबसहितका सहकार्यहरू',
    heading: 'नेपालमा तलबसहितको ब्रान्ड डिल पाउनुहोस्',
    intro: 'तपाईं TikTok, Instagram, YouTube, वा Facebook मा पोस्ट गर्नुहुन्छ भने, Kolab त्यो ठाउँ हो जहाँ नेपाली क्रिएटरहरूले आफ्नो फलोअरलाई वास्तविक, तलबसहितको काममा बदल्छन् — देखिने बजेट, ब्रान्डसँग प्रत्यक्ष सम्पर्क, र काम नसकिएसम्म सुरक्षित भुक्तानीसहित।',
    faqs: [
      {
        question: 'नेपालमा ब्रान्ड डिल कसरी पाउने?',
        answer: 'आफ्नो श्रेणी र जोडिएका प्लेटफर्महरूसहित Kolab मा क्रिएटर प्रोफाइल बनाउनुहोस्, त्यसपछि खुला तलबसहितका क्याम्पेनहरू ब्राउज गरी प्रस्तावसहित आवेदन दिनुहोस्। ब्रान्डहरूले प्रोफाइलहरू ब्राउज गरेर सिधै क्रिएटरहरू पनि भेट्टाउँछन्, त्यसैले पूर्ण र राम्ररी वर्गीकृत प्रोफाइलले तपाईंलाई सम्पर्क गरिने सम्भावना बढाउँछ।',
      },
      {
        question: 'Kolab मा स्पन्सरसिपबाट म कति कमाउन सक्छु?',
        answer: 'तपाईंले आवेदन दिनुअघि नै हरेक तलबसहितको क्याम्पेनले आफ्नो बजेट देखाउँछ, त्यसैले आम्दानी ब्रान्ड र डेलिभरेबलअनुसार फरक हुन्छ — तर तपाईंलाई आफ्नो समय खर्च गर्नुअघि नै सहकार्यले कति भुक्तानी गर्छ भन्ने सधैं थाहा हुन्छ।',
      },
      {
        question: 'के म विशेष गरी TikTok, Instagram, वा YouTube सामग्रीका लागि भुक्तानी पाउन सक्छु?',
        answer: 'हो। Kolab का क्याम्पेनहरूले तिनीहरूलाई कुन प्लेटफर्म चाहिन्छ भनी उल्लेख गर्छन् — TikTok, Instagram, YouTube, Facebook, र अन्य — त्यसैले तपाईंले आफ्नो दर्शकवर्ग वास्तवमा कहाँ छ भन्नेसँग मिल्ने स्पन्सरसिप अवसरहरू फिल्टर गर्न सक्नुहुन्छ।',
      },
      {
        question: 'मैले काम डेलिभर गरेपछि ब्रान्डले भुक्तानी नगरे नि?',
        answer: 'Kolab का तलबसहितका क्याम्पेनहरूले एस्क्रो प्रयोग गर्छन् — ब्रान्डको बजेट सुरुदेखि नै सुरक्षित राखिन्छ र उनीहरूले सम्पन्न काम स्वीकृत गरेपछि मात्र तपाईंलाई रिलिज हुन्छ, त्यसैले डिलपछि तपाईंले भुक्तानीको पछि दौडनु पर्दैन।',
      },
      {
        question: 'तलबसहितका प्रोमोसनहरू पाउन ठूलो फलोअर संख्या चाहिन्छ?',
        answer: 'कुनै कडा न्यूनतम सीमा लागू हुँदैन। ब्रान्डहरूले क्रिएटरहरूलाई निच, सामग्रीको गुणस्तर, र कुनै खास क्याम्पेनसँगको दर्शकवर्ग मिलानका आधारमा मूल्याङ्कन गर्छन्, त्यसैले साना तर सक्रिय फलोअरिङ भएका क्रिएटरहरूले पनि नियमित रूपमा तलबसहितका डिलहरू पाउँछन्।',
      },
      {
        question: 'के Kolab मा क्रिएटरको रूपमा जोडिनु निःशुल्क छ?',
        answer: 'हो — Kolab निःशुल्क डाउनलोड हो, र प्रोफाइल बनाउनु र तलबसहितका क्याम्पेनहरूमा आवेदन दिनुमा कुनै खर्च लाग्दैन।',
      },
    ],
    related: [
      { label: 'कन्टेन्ट क्रिएटरहरूका लागि', path: '/content-creators', description: 'Kolab मा आफ्नो क्रिएटर प्रोफाइल बनाउनुहोस्।' },
      { label: 'क्याम्पेनहरू फेला पार्नुहोस्', path: '/find-campaigns', description: 'अहिले नै खुला तलबसहितका क्याम्पेन र निःशुल्क इभेन्टहरू ब्राउज गर्नुहोस्।' },
      { label: 'TikTok क्रिएटरहरू', path: '/tiktok-creators', description: 'TikTok-विशेष क्रिएटर अवसरहरू।' },
      { label: 'क्रिएटर मार्केटप्लेस नेपाल', path: '/creator-marketplace-nepal', description: 'Kolab को पूर्ण क्रिएटर मार्केटप्लेस अवलोकन।' },
      { label: 'UGC क्रिएटरहरू', path: '/ugc-creators-nepal', description: 'तलबसहितको UGC काम — समीक्षा, अनबक्सिङ, र टेस्टिमोनियलहरू।' },
    ],
    cta: { heading: 'तलबसहितका सहकार्यहरू पाउन सुरु गर्नुहोस्', sub: 'Kolab डाउनलोड गर्नुहोस् र मिनेटमै आफ्नो क्रिएटर प्रोफाइल बनाउनुहोस्।' },
    sections: {
      whereFrom: {
        heading: 'तलबसहितका सहकार्यहरू वास्तवमा कहाँबाट आउँछन्',
        paragraphs: [
          'नेपालका धेरैजसो क्रिएटरहरूले आफ्नो पहिलो ब्रान्ड डिल अझै पनि DM, कुनै चिनजान, वा शुद्ध भाग्यमार्फत पाउँछन् — जसको अर्थ धेरैजसो ब्रान्डहरूले उनीहरूलाई कहिल्यै देख्दैनन् पनि। Kolab ले त्यसलाई संरचित पाइपलाइनले प्रतिस्थापन गर्छ: ब्रान्डहरूले वास्तविक बजेटसहित क्याम्पेनहरू पोस्ट गर्छन्, र निच, प्लेटफर्म, र दर्शकवर्गसँग मिल्ने क्रिएटरहरूले सिधै आवेदन दिन सक्छन्, वा आफ्नो प्रोफाइल ब्राउज गरेर भेट्टाइन्छन्।',
          'त्यो संरचनाले तपाईंको फाइदामा काम गर्छ। DM मार्फत सुरुदेखि दर मोलमोलाइ गर्नुको सट्टा, तपाईंले आवेदन दिनुअघि नै बजेट देख्नुहुन्छ। ब्रान्डले समयमै भुक्तानी गर्छ भनेर आशा राख्नुको सट्टा, काम सुरु हुनुअघि नै रकम एस्क्रोमा राखिसकिएको हुन्छ।',
        ],
      },
      whatYouGet: {
        heading: 'Kolab मा क्रिएटरको रूपमा तपाईंले के पाउनुहुन्छ',
        benefits: [
          { title: 'भेट्टाइनुहोस्', desc: 'ब्रान्डहरूले श्रेणी, प्लेटफर्म, र स्थानअनुसार क्रिएटर प्रोफाइलहरू ब्राउज गर्छन् — पूर्ण प्रोफाइलले तपाईंलाई सान्दर्भिक डिलहरूको सामु राख्छ।' },
          { title: 'बजेट पहिले नै हेर्नुहोस्', desc: 'तपाईंले आवेदन दिनुअघि नै हरेक तलबसहितको क्याम्पेनले आफ्नो बजेट र डेलिभरेबल सूचीबद्ध गर्छ, त्यसैले कुनै अनुमान वा अप्ठ्यारो दर मोलमोलाइ हुँदैन।' },
          { title: 'एस्क्रो-सुरक्षित भुक्तानी', desc: 'क्याम्पेन बजेटहरू सुरक्षित राखिन्छन् र तपाईंको काम स्वीकृत भएपछि मात्र तपाईंलाई रिलिज गरिन्छ — भुक्तानी कहिल्यै ब्रान्डको इच्छामा भर पर्दैन।' },
          { title: 'ब्रान्डसँग प्रत्यक्ष सम्पर्क', desc: 'मिलेपछि डेलिभरेबल, समयसीमा, र क्रिएटिभ दिशामा सहमत हुन एपमा सिधै ब्रान्डलाई म्यासेज गर्नुहोस् — छरिएका, तलब नपाइने DM हरू छैनन्।' },
        ],
      },
      howToStart: {
        heading: 'ब्रान्ड डिलबाट कमाउन सुरु गर्ने तरिका',
        items: [
          'Kolab डाउनलोड गर्नुहोस् र आफ्नो निच र जोडिएका प्लेटफर्महरू (TikTok, Instagram, YouTube, Facebook, र अरू) सहित क्रिएटर प्रोफाइल बनाउनुहोस्।',
          'ब्रान्डहरूले कोसँग काम गरिरहेका छन् भनी भरोसा गर्न सकून् भनेर पहिचान प्रमाणीकरण पूरा गर्नुहोस्।',
          'श्रेणी, प्लेटफर्म, र स्थानअनुसार फिल्टर गरिएका खुला तलबसहितका क्याम्पेन र निःशुल्क इभेन्टहरू ब्राउज गर्नुहोस्।',
          'तपाईंको सामग्रीसँग मिल्ने क्याम्पेनहरूमा प्रस्तावसहित आवेदन दिनुहोस् — प्रतिबद्ध हुनुअघि नै बजेटहरू देखिन्छन्।',
          'मिलेपछि सिधै ब्रान्डलाई म्यासेज गर्नुहोस्, र सहमत सामग्री डेलिभर गर्नुहोस्।',
          'ब्रान्डले तपाईंको काम स्वीकृत गरेपछि एस्क्रोमार्फत भुक्तानी पाउनुहोस्, र भविष्यका डिलहरूका लागि सार्वजनिक समीक्षा इतिहास बनाउनुहोस्।',
        ],
      },
      growingNetwork: {
        heading: 'बढ्दो क्रिएटर नेटवर्कमा जोडिनुहोस्',
        paragraph: "Kolab को क्रिएटर समुदाय नेपालभरका हरेक प्रमुख प्लेटफर्म र श्रेणीमा फैलिएको छ — नेटवर्क जति सक्रिय हुन्छ, ब्रान्डहरूले त्यति नै धेरै क्याम्पेन पोस्ट गर्छन्, र हरेक फलोअर संख्याका क्रिएटरहरूका लागि त्यति नै धेरै स्पन्सरसिप अवसरहरू देखा पर्छन्।",
      },
    },
  },
};

export function PaidCollaborationsPage() {
  return (
    <LandingLanguageProvider>
      <PaidCollaborationsPageInner />
    </LandingLanguageProvider>
  );
}

function PaidCollaborationsPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/paid-collaborations-nepal',
        keywords: [
          'paid collaborations Nepal', 'brand deals Nepal', 'sponsorship opportunities Nepal', 'get brand deals Nepal',
          'earn from social media Nepal', 'influencer jobs Nepal', 'TikTok earning Nepal', 'Instagram earning Nepal',
          'YouTube sponsorship Nepal', 'paid promotion Nepal', 'creator community Nepal', 'creator network Nepal',
          'paid brand collaborations', 'sponsored post Nepal', 'influencer pricing Nepal', 'creator rates Nepal',
        ],
        jsonLd: webPageSchema({
          path: '/paid-collaborations-nepal',
          title: 'Paid Collaborations & Brand Deals in Nepal | Kolab',
          description: 'Get paid collaborations and brand deals in Nepal on Kolab.',
        }),
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/paid-collaborations-nepal' }]}
      icon={Banknote}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
    >
      <ContentSection heading={t.sections.whereFrom.heading}>
        {t.sections.whereFrom.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </ContentSection>

      <ContentSection heading={t.sections.whatYouGet.heading}>
        <BenefitGrid
          items={t.sections.whatYouGet.benefits.map((b, i) => ({ icon: WHAT_YOU_GET_ICONS[i], title: b.title, desc: b.desc }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.howToStart.heading}>
        <ContentList items={t.sections.howToStart.items} />
      </ContentSection>

      <ContentSection heading={t.sections.growingNetwork.heading}>
        <p className="flex items-start gap-2.5">
          <Users size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>{t.sections.growingNetwork.paragraph}</span>
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
