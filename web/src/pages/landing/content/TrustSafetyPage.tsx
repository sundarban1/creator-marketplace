import { CheckCircle2, MessageSquareLock, ScrollText, ShieldCheck, Star, Wallet } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Every claim here mirrors the homepage's own Security section copy
// (`i18n/*.ts` → `security.points`) rather than introducing new claims — this
// page exists to give that content a standalone, indexable URL, not to say
// anything new about how collaboration or payment actually works.
const POINT_ICONS = [CheckCircle2, Star, ScrollText, Wallet, MessageSquareLock, ShieldCheck] as const;

const COPY = {
  en: {
    seo: {
      title: 'Trust & Safety | Kolab',
      description: 'How Kolab keeps creator-business collaboration safe: verified accounts, escrow-protected payments, secure in-app communication, reviews, and reporting.',
    },
    breadcrumbName: 'Trust & Safety',
    eyebrow: 'Trust & Safety',
    heading: 'Built for safe, structured collaboration.',
    intro: 'Every profile, campaign, and payment on Kolab is designed around the same idea: creators and businesses should be able to work together without guesswork about who they’re dealing with, what was agreed, or whether they’ll get paid.',
    faqs: [
      {
        question: 'How are creators and businesses verified?',
        answer: 'Identity is confirmed through citizenship-document verification, plus email and phone checks, before an account can publish a profile, apply to a campaign, or message another user.',
      },
      {
        question: 'How is a campaign budget protected?',
        answer: "For paid campaigns, the business's budget is held by Kolab and released to the creator only once the business has reviewed and approved the completed work — it's never sent directly upfront.",
      },
      {
        question: 'What happens if something goes wrong?',
        answer: 'You can report a profile, conversation, or campaign at any time. Our safety team reviews every report and can take action on a payment or a conversation if something looks wrong.',
      },
      {
        question: 'Where can I read the full Terms and Privacy Policy?',
        answer: 'The complete Terms of Service and Privacy Policy are available on their own pages, linked below and in the footer of every page.',
      },
    ],
    related: [
      { label: 'About Kolab', path: '/about', description: 'Who we are and why Kolab exists.' },
      { label: 'Terms of Service', path: '/terms', description: 'The full terms that govern using Kolab.' },
      { label: 'Privacy Policy', path: '/privacy', description: 'How your data is collected and used.' },
      { label: 'Support', path: '/support', description: 'Contact our team or browse frequently asked questions.' },
    ],
    cta: { heading: 'Ready to Collaborate Safely?', sub: 'Download Kolab and start your first collaboration.' },
    sections: {
      foundations: { heading: 'What keeps collaboration safe' },
      disputesHeading: 'Reports and disputes',
      disputesBody:
        'If a creator or a business believes the other side hasn’t held up their end of a campaign, they can flag it from within the app. A dedicated safety team reviews the report against the agreed terms and the campaign history, and can act on the payment or the conversation while it’s under review.',
      restrictionsHeading: 'Account restrictions',
      restrictionsBody:
        'Accounts that violate Kolab’s terms — including misrepresenting who they are, failing to deliver agreed work, or misusing the reporting system — can be restricted while a report is reviewed, in line with our Terms of Service.',
      privacyHeading: 'Privacy',
      privacyBody:
        'Kolab only asks for the information needed to verify accounts and run a collaboration. What’s shown on a public profile, and what stays private, is covered in full in our Privacy Policy.',
    },
  },
  ne: {
    seo: {
      title: 'Trust & Safety | Kolab',
      description: 'How Kolab keeps creator-business collaboration safe: verified accounts, escrow-protected payments, secure in-app communication, reviews, and reporting.',
    },
    breadcrumbName: 'भरोसा र सुरक्षा',
    eyebrow: 'भरोसा र सुरक्षा',
    heading: 'सुरक्षित, संरचित सहकार्यका लागि बनाइएको।',
    intro: 'Kolab मा प्रत्येक प्रोफाइल, क्याम्पेन, र भुक्तानी एउटै सोचमा डिजाइन गरिएको छ: क्रिएटर र व्यवसायले उनीहरू कोसँग काम गरिरहेका छन्, के सहमति भएको थियो, वा भुक्तानी पाउँछन् कि पाउँदैनन् भन्ने अनुमान बिना सँगै काम गर्न सक्नुपर्छ।',
    faqs: [
      {
        question: 'क्रिएटर र व्यवसायहरू कसरी प्रमाणित हुन्छन्?',
        answer: 'खाताले प्रोफाइल पोस्ट गर्न, क्याम्पेनमा आवेदन दिन, वा अर्को प्रयोगकर्तालाई म्यासेज गर्न सक्नुअघि नागरिकता-कागजात प्रमाणीकरण, साथै इमेल र फोन जाँचद्वारा पहिचान पुष्टि गरिन्छ।',
      },
      {
        question: 'क्याम्पेन बजेट कसरी सुरक्षित गरिन्छ?',
        answer: 'तलबसहितका क्याम्पेनहरूका लागि, व्यवसायको बजेट Kolab ले राख्छ र व्यवसायले सम्पन्न काम समीक्षा र स्वीकृत गरेपछि मात्र क्रिएटरलाई रिलिज गरिन्छ — यो कहिल्यै सिधै अग्रिम पठाइँदैन।',
      },
      {
        question: 'केही गलत भयो भने के हुन्छ?',
        answer: 'तपाईंले जुनसुकै बेला प्रोफाइल, कुराकानी, वा क्याम्पेन रिपोर्ट गर्न सक्नुहुन्छ। हाम्रो सुरक्षा टोलीले प्रत्येक रिपोर्ट समीक्षा गर्छ र केही गलत देखिएमा भुक्तानी वा कुराकानीमा कारबाही गर्न सक्छ।',
      },
      {
        question: 'पूर्ण नियम र गोपनीयता नीति कहाँ पढ्न सकिन्छ?',
        answer: 'पूर्ण सेवाका सर्तहरू र गोपनीयता नीति तल र प्रत्येक पृष्ठको फुटरमा लिंक गरिएका आफ्नै पृष्ठहरूमा उपलब्ध छन्।',
      },
    ],
    related: [
      { label: 'Kolab बारे', path: '/about', description: 'हामी को हौं र Kolab किन अस्तित्वमा छ।' },
      { label: 'सेवाका सर्तहरू', path: '/terms', description: 'Kolab प्रयोग गर्न लागू हुने पूर्ण सर्तहरू।' },
      { label: 'गोपनीयता नीति', path: '/privacy', description: 'तपाईंको डेटा कसरी सङ्कलन र प्रयोग गरिन्छ।' },
      { label: 'सहयोग', path: '/support', description: 'हाम्रो टोलीलाई सम्पर्क गर्नुहोस् वा बारम्बार सोधिने प्रश्नहरू हेर्नुहोस्।' },
    ],
    cta: { heading: 'सुरक्षित रूपमा सहकार्य गर्न तयार हुनुहुन्छ?', sub: 'Kolab डाउनलोड गर्नुहोस् र आफ्नो पहिलो सहकार्य सुरु गर्नुहोस्।' },
    sections: {
      foundations: { heading: 'सहकार्यलाई के कुराले सुरक्षित राख्छ' },
      disputesHeading: 'रिपोर्ट र विवादहरू',
      disputesBody:
        'यदि क्रिएटर वा व्यवसायलाई अर्को पक्षले क्याम्पेनको आफ्नो भाग पूरा गरेन भन्ने लाग्छ भने, उनीहरूले एपभित्रैबाट यसलाई फ्ल्याग गर्न सक्छन्। एउटा समर्पित सुरक्षा टोलीले सहमत सर्त र क्याम्पेन इतिहासको आधारमा रिपोर्ट समीक्षा गर्छ, र समीक्षा हुँदा भुक्तानी वा कुराकानीमा कारबाही गर्न सक्छ।',
      restrictionsHeading: 'खाता प्रतिबन्ध',
      restrictionsBody:
        'Kolab का सर्त उल्लङ्घन गर्ने खाताहरू — आफू को हो भनेर गलत प्रस्तुत गर्ने, सहमत काम पूरा नगर्ने, वा रिपोर्टिङ प्रणाली दुरुपयोग गर्ने खाताहरू सहित — हाम्रो सेवाका सर्तहरूअनुसार रिपोर्ट समीक्षा हुँदा प्रतिबन्धित हुन सक्छन्।',
      privacyHeading: 'गोपनीयता',
      privacyBody:
        'Kolab ले खाता प्रमाणीकरण र सहकार्य सञ्चालनका लागि आवश्यक जानकारी मात्र माग्छ। सार्वजनिक प्रोफाइलमा के देखिन्छ, र के निजी रहन्छ भन्ने कुरा हाम्रो गोपनीयता नीतिमा पूर्ण रूपमा उल्लेख छ।',
    },
  },
};

export function TrustSafetyPage() {
  return (
    <LandingLanguageProvider>
      <TrustSafetyPageInner />
    </LandingLanguageProvider>
  );
}

function TrustSafetyPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];
  const points = d.security.points;

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/trust-and-safety',
        keywords: ['Kolab trust and safety', 'Kolab verification', 'escrow payment Nepal', 'creator marketplace safety Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/trust-and-safety', title: t.seo.title, description: t.seo.description })],
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/trust-and-safety' }]}
      icon={ShieldCheck}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
      backToHome
    >
      <ContentSection heading={t.sections.foundations.heading}>
        <BenefitGrid
          items={points.map((p, i) => ({ icon: POINT_ICONS[i]!, title: p.title, desc: p.detail }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.disputesHeading}>
        <p>{t.sections.disputesBody}</p>
      </ContentSection>

      <ContentSection heading={t.sections.restrictionsHeading}>
        <p>{t.sections.restrictionsBody}</p>
      </ContentSection>

      <ContentSection heading={t.sections.privacyHeading}>
        <p>{t.sections.privacyBody}</p>
      </ContentSection>
    </ContentPageLayout>
  );
}
