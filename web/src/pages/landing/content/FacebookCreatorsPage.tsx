import { MapPin, MessageSquare, Newspaper, Users } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';
import { LandingLanguageProvider, useLandingLanguage } from '../context/LanguageContext';

// Icons/accents are language-invariant, zipped by index with the translated
// title/desc pulled from COPY[lang] below.
const WHAT_THEY_BRING_ICONS = [MapPin, Newspaper, Users, MessageSquare];

const COPY = {
  en: {
    seo: {
      title: 'Facebook Creators in Nepal | Hire Facebook Influencers',
      description: 'Find Facebook creators and page owners in Nepal on Kolab. Connect with verified Facebook influencers for paid campaigns and collaborations.',
    },
    breadcrumbName: 'Facebook Creators',
    eyebrow: 'Facebook Creators',
    heading: 'Hire Facebook Creators in Nepal',
    intro: "Facebook is still where a huge share of Nepal's online communities actually live — local groups, city pages, and family networks that trust a familiar face more than a stranger's ad. Kolab connects brands with the Facebook creators and page owners driving those communities, for paid campaigns and collaborations across the country.",
    faqs: [
      {
        question: 'Why hire a Facebook creator instead of just running Facebook ads?',
        answer: "Facebook ads reach people who don't know your brand; a Facebook creator's post reaches people who already trust the page or profile it's coming from. In Nepal, where local Facebook groups and community pages still drive a lot of buying decisions, that trust is hard to replicate with an ad alone.",
      },
      {
        question: 'What kind of Facebook creators are on Kolab?',
        answer: 'Personal-profile creators, local community and city pages, niche interest pages (food, travel, tech, and more), and small-business-adjacent pages that post regularly and have an engaged local following.',
      },
      {
        question: 'Can I filter for Facebook specifically when browsing creators?',
        answer: 'Yes — creator profiles list every platform they use, so you can filter the marketplace to creators active on Facebook, then narrow further by category and location anywhere in Nepal.',
      },
      {
        question: 'Do Facebook creators on Kolab do paid posts, or only free collaborations?',
        answer: 'Both. You can post a paid campaign with a set budget and deliverables, or a free open event where a creator covers or attends in exchange for content and exposure.',
      },
      {
        question: 'How is payment handled for a Facebook campaign?',
        answer: 'Paid campaigns use escrow-protected payments — your budget is held by Kolab and released to the creator only once you approve the completed post or deliverable.',
      },
      {
        question: 'Are Facebook creators on Kolab verified?',
        answer: "Yes. Every creator's identity is confirmed through citizenship-document verification, along with email and phone checks, before their profile is active on the marketplace.",
      },
    ],
    related: [
      { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
      { label: 'YouTube Creators', path: '/youtube-creators', description: 'Browse YouTube creators in Nepal.' },
      { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
      { label: 'For Brands', path: '/brands', description: 'Hire creators for your next campaign.' },
    ],
    cta: { heading: 'Connect with Facebook Creators in Nepal', sub: 'Download Kolab to browse profiles and post campaigns.' },
    sections: {
      localConversation: {
        heading: "Facebook still runs Nepal's local conversation",
        paragraphs: [
          "While newer platforms chase short-form video, Facebook remains the backbone of local community life in Nepal — city and neighborhood groups, alumni networks, buy-and-sell pages, and family circles that check Facebook out of habit more than any other app. A lot of that activity is anchored by individual creators and page owners who've spent years building a specific, local audience rather than a broad national one.",
          "That's exactly the kind of reach that's hard to buy with an ad and easy to underestimate: a well-run Facebook page in Pokhara or Biratnagar can move more local foot traffic than a generic campaign aimed at all of Nepal. Kolab exists to connect brands with these creators directly, instead of leaving that reach scattered across DMs and comment sections.",
        ],
      },
      whatTheyBring: {
        heading: 'What Facebook creators bring to a campaign',
        benefits: [
          { title: 'Hyper-local reach', desc: 'City and neighborhood pages with audiences that trust local recommendations over national ads.' },
          { title: 'Longer-format content', desc: "Facebook's format still rewards detailed posts, photo albums, and community updates that other platforms cut short." },
          { title: 'Community trust', desc: 'Group admins and long-running pages carry credibility built over years, not just follower counts.' },
          { title: 'Direct engagement', desc: 'Comments and shares on Facebook still drive real conversation — and real word-of-mouth — around a brand.' },
        ],
      },
      findingCreator: {
        heading: 'Finding the right Facebook creator on Kolab',
        paragraph: 'Browse the marketplace filtered by platform, category, and location, and every Facebook-active creator profile shows what kind of page or presence they run — personal profile, community page, or niche content page — along with their category focus, whether that\'s food, travel, fashion, tech, or any of Kolab\'s other supported categories.',
        items: [
          'Filter creator profiles to those active on Facebook alongside other platforms.',
          'Narrow by category so a Facebook post reaches an audience that already cares about your niche.',
          'Filter by city — Kathmandu, Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, Nepalgunj, and beyond.',
          'Post a paid campaign with a clear budget and deliverable, or a free open event for creators to cover.',
          'Review proposals and message the creator directly in-app once you find the right fit.',
        ],
      },
      sameProtections: {
        heading: 'Same protections as every campaign on Kolab',
        paragraph: "A Facebook collaboration on Kolab works under the same trust layer as every other campaign on the platform. Creator identity is confirmed with citizenship-document verification, plus email and phone checks, so you know who you're actually working with. Paid campaigns are escrow-protected — your budget is held safely and released only once you approve the finished post — and every collaboration wraps with a transparent review from both sides, so a Facebook creator's track record on Kolab means something.",
      },
    },
  },
  ne: {
    seo: {
      title: 'Facebook Creators in Nepal | Hire Facebook Influencers',
      description: 'Find Facebook creators and page owners in Nepal on Kolab. Connect with verified Facebook influencers for paid campaigns and collaborations.',
    },
    breadcrumbName: 'Facebook क्रिएटरहरू',
    eyebrow: 'Facebook क्रिएटरहरू',
    heading: 'नेपालमा Facebook क्रिएटरहरू भाडामा लिनुहोस्',
    intro: 'Facebook अझै पनि नेपालका अनलाइन समुदायहरूको ठूलो हिस्सा वास्तवमा बस्ने ठाउँ हो — स्थानीय ग्रुपहरू, सहर पेजहरू, र पारिवारिक नेटवर्कहरू जसले अपरिचित व्यक्तिको विज्ञापनभन्दा चिनेको अनुहारलाई बढी भरोसा गर्छन्। Kolab ले ब्रान्डहरूलाई ती समुदायहरू चलाउने Facebook क्रिएटर र पेज मालिकहरूसँग देशभरका तलबसहितका क्याम्पेन र सहकार्यका लागि जोड्छ।',
    faqs: [
      {
        question: 'Facebook विज्ञापन चलाउनुको सट्टा किन Facebook क्रिएटर भाडामा लिने?',
        answer: 'Facebook विज्ञापनले तपाईंको ब्रान्ड नचिनेका मानिसहरूसम्म पुग्छ; Facebook क्रिएटरको पोस्टले भने त्यो पेज वा प्रोफाइललाई पहिले नै भरोसा गर्नेहरूसम्म पुग्छ। नेपालमा, जहाँ स्थानीय Facebook ग्रुप र समुदाय पेजहरूले अझै धेरै खरिद निर्णयहरू प्रभावित पार्छन्, त्यो भरोसा एक्लो विज्ञापनले दोहोर्याउन गाह्रो हुन्छ।',
      },
      {
        question: 'Kolab मा कस्ता Facebook क्रिएटरहरू छन्?',
        answer: 'व्यक्तिगत-प्रोफाइल क्रिएटरहरू, स्थानीय समुदाय र सहर पेजहरू, निच रुचिका पेजहरू (खाना, यात्रा, प्रविधि, र अरू), र नियमित पोस्ट गर्ने तथा सक्रिय स्थानीय फलोअरिङ भएका साना व्यवसायसँग सम्बन्धित पेजहरू।',
      },
      {
        question: 'क्रिएटर ब्राउज गर्दा के म विशेष गरी Facebook फिल्टर गर्न सक्छु?',
        answer: 'हो — क्रिएटर प्रोफाइलहरूले तिनीहरूले प्रयोग गर्ने हरेक प्लेटफर्म सूचीबद्ध गर्छन्, त्यसैले तपाईंले मार्केटप्लेसलाई Facebook मा सक्रिय क्रिएटरहरूमा फिल्टर गर्न सक्नुहुन्छ, त्यसपछि नेपालभरि कुनै पनि श्रेणी र स्थानअनुसार अझ साँघुर्याउन सक्नुहुन्छ।',
      },
      {
        question: 'के Kolab का Facebook क्रिएटरहरूले तलबसहितको पोस्ट गर्छन्, वा निःशुल्क सहकार्य मात्र?',
        answer: 'दुवै। तपाईंले निश्चित बजेट र डेलिभरेबलसहित तलबसहितको क्याम्पेन पोस्ट गर्न सक्नुहुन्छ, वा क्रिएटरले सामग्री र एक्सपोजरको बदलामा कभर गर्ने वा उपस्थित हुने निःशुल्क खुला इभेन्ट पनि पोस्ट गर्न सक्नुहुन्छ।',
      },
      {
        question: 'Facebook क्याम्पेनको लागि भुक्तानी कसरी हुन्छ?',
        answer: 'तलबसहितका क्याम्पेनहरूमा एस्क्रो-सुरक्षित भुक्तानी प्रयोग हुन्छ — तपाईंको बजेट Kolab ले सुरक्षित राख्छ र तपाईंले सम्पन्न पोस्ट वा डेलिभरेबल स्वीकृत गरेपछि मात्र क्रिएटरलाई रिलिज गरिन्छ।',
      },
      {
        question: 'के Kolab का Facebook क्रिएटरहरू प्रमाणित छन्?',
        answer: 'हो। प्रत्येक क्रिएटरको पहिचान नागरिकता-कागजात प्रमाणीकरण, साथै इमेल र फोन जाँचद्वारा पुष्टि गरिन्छ, अनि मात्र तिनीहरूको प्रोफाइल मार्केटप्लेसमा सक्रिय हुन्छ।',
      },
    ],
    related: [
      { label: 'कन्टेन्ट क्रिएटरहरूका लागि', path: '/content-creators', description: 'Kolab मा आफ्नो क्रिएटर प्रोफाइल बनाउनुहोस्।' },
      { label: 'YouTube क्रिएटरहरू', path: '/youtube-creators', description: 'नेपालका YouTube क्रिएटरहरू ब्राउज गर्नुहोस्।' },
      { label: 'क्रिएटर मार्केटप्लेस नेपाल', path: '/creator-marketplace-nepal', description: 'Kolab को पूर्ण क्रिएटर मार्केटप्लेस अवलोकन।' },
      { label: 'ब्रान्डहरूका लागि', path: '/brands', description: 'आफ्नो अर्को क्याम्पेनका लागि क्रिएटरहरू भाडामा लिनुहोस्।' },
    ],
    cta: { heading: 'नेपालका Facebook क्रिएटरहरूसँग जोडिनुहोस्', sub: 'प्रोफाइलहरू ब्राउज गर्न र क्याम्पेन पोस्ट गर्न Kolab डाउनलोड गर्नुहोस्।' },
    sections: {
      localConversation: {
        heading: 'Facebook ले अझै नेपालको स्थानीय कुराकानी चलाउँछ',
        paragraphs: [
          "नयाँ प्लेटफर्महरूले छोटो-फर्म भिडियोको पछि लागिरहँदा, Facebook नेपालको स्थानीय सामुदायिक जीवनको मेरुदण्ड बनिरहेको छ — सहर र छिमेकी ग्रुपहरू, पूर्वविद्यार्थी नेटवर्कहरू, किनबेच पेजहरू, र अरू कुनै पनि एपभन्दा बढी बानीले Facebook जाँच्ने पारिवारिक घेराहरू। त्यो गतिविधिको धेरै भाग व्यापक राष्ट्रिय दर्शकको सट्टा विशिष्ट, स्थानीय दर्शकवर्ग बनाउन वर्षौं लगाएका व्यक्तिगत क्रिएटर र पेज मालिकहरूले टिकाइराखेका छन्।",
          'यही नै विज्ञापनले किन्न गाह्रो र कम आँक्न सजिलो हुने खालको पहुँच हो: पोखरा वा विराटनगरमा राम्रोसँग चलाइएको Facebook पेजले सम्पूर्ण नेपाललाई लक्षित सामान्य क्याम्पेनभन्दा बढी स्थानीय फुट ट्राफिक ल्याउन सक्छ। त्यो पहुँच DM र कमेन्ट सेक्सनहरूमा छरिएर रहनुको सट्टा, Kolab ले ब्रान्डहरूलाई यी क्रिएटरहरूसँग सिधै जोड्न बनाइएको हो।',
        ],
      },
      whatTheyBring: {
        heading: 'Facebook क्रिएटरहरूले क्याम्पेनमा के ल्याउँछन्',
        benefits: [
          { title: 'अति-स्थानीय पहुँच', desc: 'राष्ट्रिय विज्ञापनभन्दा स्थानीय सिफारिसलाई भरोसा गर्ने दर्शकवर्ग भएका सहर र छिमेकी पेजहरू।' },
          { title: 'लामो-ढाँचाको सामग्री', desc: 'Facebook को ढाँचाले अन्य प्लेटफर्महरूले छोट्याइदिने विस्तृत पोस्ट, फोटो एल्बम, र सामुदायिक अपडेटहरूलाई अझै महत्त्व दिन्छ।' },
          { title: 'सामुदायिक भरोसा', desc: 'ग्रुप एड्मिन र लामो समयदेखि चलिरहेका पेजहरूले फलोअर संख्या मात्र होइन, वर्षौंमा बनेको विश्वसनीयता बोक्छन्।' },
          { title: 'प्रत्यक्ष सहभागिता', desc: 'Facebook मा कमेन्ट र सेयरले ब्रान्डको वरिपरि वास्तविक कुराकानी — र वास्तविक शब्द-प्रचार — अझै सिर्जना गर्छ।' },
        ],
      },
      findingCreator: {
        heading: 'Kolab मा उपयुक्त Facebook क्रिएटर फेला पार्नुहोस्',
        paragraph: 'प्लेटफर्म, श्रेणी, र स्थानअनुसार फिल्टर गरिएको मार्केटप्लेस ब्राउज गर्नुहोस्, र Facebook मा सक्रिय हरेक क्रिएटर प्रोफाइलले तिनीहरूले चलाउने पेज वा उपस्थितिको किसिम — व्यक्तिगत प्रोफाइल, समुदाय पेज, वा निच कन्टेन्ट पेज — साथै तिनीहरूको श्रेणी फोकस, त्यो खाना, यात्रा, फेसन, प्रविधि, वा Kolab ले समर्थन गर्ने अन्य कुनै श्रेणी भए पनि, देखाउँछ।',
        items: [
          'अन्य प्लेटफर्महरूसँगै Facebook मा सक्रिय क्रिएटर प्रोफाइलहरूमा फिल्टर गर्नुहोस्।',
          'श्रेणीअनुसार साँघुर्याउनुहोस् ताकि Facebook पोस्टले तपाईंको निचलाई पहिले नै वास्ता गर्ने दर्शकवर्गसम्म पुगोस्।',
          'सहरअनुसार फिल्टर गर्नुहोस् — काठमाडौं, पोखरा, ललितपुर, भक्तपुर, बुटवल, विराटनगर, धरान, चितवन, नेपालगन्ज, र थप।',
          'स्पष्ट बजेट र डेलिभरेबलसहित तलबसहितको क्याम्पेन पोस्ट गर्नुहोस्, वा क्रिएटरहरूले कभर गर्ने निःशुल्क खुला इभेन्ट पोस्ट गर्नुहोस्।',
          'प्रस्तावहरू समीक्षा गर्नुहोस् र उपयुक्त क्रिएटर फेला पारेपछि एपभित्रै सिधै म्यासेज गर्नुहोस्।',
        ],
      },
      sameProtections: {
        heading: 'Kolab का सबै क्याम्पेनजस्तै उही सुरक्षा',
        paragraph: "Kolab मा Facebook सहकार्य प्लेटफर्मका अन्य सबै क्याम्पेनजस्तै उही भरोसाको तहमा काम गर्छ। क्रिएटरको पहिचान नागरिकता-कागजात प्रमाणीकरण, साथै इमेल र फोन जाँचद्वारा पुष्टि गरिन्छ, त्यसैले तपाईंलाई साँच्चै कोसँग काम गरिरहनुभएको छ भन्ने थाहा हुन्छ। तलबसहितका क्याम्पेनहरू एस्क्रो-सुरक्षित हुन्छन् — तपाईंको बजेट सुरक्षित राखिन्छ र तपाईंले सम्पन्न पोस्ट स्वीकृत गरेपछि मात्र रिलिज हुन्छ — र प्रत्येक सहकार्य दुवै पक्षको पारदर्शी समीक्षासँग सकिन्छ, त्यसैले Kolab मा Facebook क्रिएटरको ट्र्याक रेकर्डको अर्थ राख्छ।",
      },
    },
  },
};

export function FacebookCreatorsPage() {
  return (
    <LandingLanguageProvider>
      <FacebookCreatorsPageInner />
    </LandingLanguageProvider>
  );
}

function FacebookCreatorsPageInner() {
  const { lang, d } = useLandingLanguage();
  const t = COPY[lang];

  return (
    <ContentPageLayout
      seo={{
        title: t.seo.title,
        description: t.seo.description,
        path: '/facebook-creators',
        keywords: ['Facebook creator Nepal', 'Facebook Nepal', 'hire Facebook influencer Nepal', 'Facebook influencers Nepal', 'hire Facebook influencers Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/facebook-creators', title: 'Facebook Creators in Nepal | Kolab', description: 'Find and hire verified Facebook creators and page owners in Nepal.' })],
      }}
      breadcrumb={[{ name: d.contentPage.home, path: '/' }, { name: t.breadcrumbName, path: '/facebook-creators' }]}
      icon={Users}
      eyebrow={t.eyebrow}
      heading={t.heading}
      intro={t.intro}
      faqs={t.faqs}
      related={t.related}
      cta={t.cta}
    >
      <ContentSection heading={t.sections.localConversation.heading}>
        {t.sections.localConversation.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </ContentSection>

      <ContentSection heading={t.sections.whatTheyBring.heading}>
        <BenefitGrid
          items={t.sections.whatTheyBring.benefits.map((b, i) => ({ icon: WHAT_THEY_BRING_ICONS[i], title: b.title, desc: b.desc }))}
        />
      </ContentSection>

      <ContentSection heading={t.sections.findingCreator.heading}>
        <p>{t.sections.findingCreator.paragraph}</p>
        <ContentList items={t.sections.findingCreator.items} />
      </ContentSection>

      <ContentSection heading={t.sections.sameProtections.heading}>
        <p>{t.sections.sameProtections.paragraph}</p>
      </ContentSection>
    </ContentPageLayout>
  );
}
