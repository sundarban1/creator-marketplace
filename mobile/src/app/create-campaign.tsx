import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { EVENT_LOADING_SVG } from '@/lib/eventLoadingSvg';
import { profileService } from '@/services/profile';
import { useCategories } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';
import { FeatureImagePicker } from '@/features/creator/components/FeatureImagePicker';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { pickAndUpload } from '@/utilities/uploadImage';
import { RecommendedCreatorsModal } from '@/features/business/components/RecommendedCreatorsModal';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import {
  GOAL_OPTIONS, CREATOR_TYPES, DELIVERABLE_TYPES, DEFAULT_DELIVERABLES, summarizeDeliverables,
} from '@/features/business/constants/campaignForm';
import {
  SectionCard, ChipGroup, ChipMultiGroup, PlatformChipGroup, BudgetTierPicker, Stepper,
  DeliverablesCounterList, HashtagEditor, sc, cg,
} from '@/features/business/components/CampaignFormControls';

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_PROMPT_EXAMPLES = [
  "I want to promote my cafe's new iced coffee.",
  "We're launching a new clothing collection for Dashain.",
  "Looking for travel creators to showcase our hotel in Pokhara.",
  "Need 5 food creators to review our momo restaurant.",
  'Promote our mobile app to university students.',
];

const ERROR_RED = '#EF4444';
const MIN_BUDGET_PER_CREATOR = 500;

// Used when generateWithAi() throws outright (network down, request timeout, backend
// error unrelated to the AI call itself) — the backend's own dummy-template fallback
// already covers OpenAI-specific failures (bad key, quota, malformed response), so this
// only kicks in when the whole request never came back. Keeps campaign creation working
// end-to-end even with zero connectivity to the AI provider.
const GENERIC_AI_TEMPLATE = {
  title: 'New Promotional Campaign',
  description: "Creators will create engaging content that introduces your brand to their audience, highlighting what makes it worth trying and encouraging followers to check it out.",
  objective: 'Increase brand awareness and drive engagement',
  contentGuidelines: [
    'Introduce the brand naturally within the content',
    'Highlight one clear reason to try it',
    'Keep the tone authentic and conversational',
    'Include a clear call-to-action in the caption',
  ],
  targetAudience: ['Any Creator'],
  suggestedDurationDays: 14,
  creatorsNeeded: 4,
  budgetMin: 6000,
  budgetMax: 15000,
  deliverables: { REEL: 1, STORY: 2 } as Record<string, number>,
  hashtags: ['NewBrand', 'MustTry', 'SupportLocal'],
  sampleCaption: "Just discovered this and had to share \u{1F440} If you're into this kind of thing, you're going to love it.",
  approvalRequirements: 'Brand will review draft content before it’s posted',
};

const BENEFITS = [
  'Free food & drinks',
  'Free product / service',
  'Event access',
  'Gift hampers',
  'Networking opportunities',
  'Future collaboration',
];

const EVENT_CONTENT_TYPES = [
  'Instagram Reel',
  'Instagram Story',
  'TikTok Video',
  'Photo Post',
  'Event Coverage Video',
  'Tag Business',
];

const EVENT_TEMPLATE_CONTENT: Record<string, { title: string; desc: string }> = {
  'Food':          { title: 'Exclusive Food Creator Night – Dine, Discover & Create',        desc: "We're inviting food creators to an exclusive creator night at our restaurant. Experience our signature dishes, meet the chef, and create authentic content about your dining journey. Enjoy a curated menu, behind-the-scenes kitchen access, and a memorable evening with fellow creators." },
  'Travel':        { title: 'Travel Creator Experience – Explore & Document',                 desc: "Join us for an exclusive creator experience at our travel destination or property. Enjoy complimentary access, curated activities, and the freedom to document your authentic journey. Perfect for travel creators who love discovering hidden gems and sharing experiences with their audience." },
  'Fashion':       { title: 'Fashion Creator Showcase – Style Night',                         desc: "We're hosting an exclusive fashion creator event where you'll get first access to our latest collection, professional styling support, and a curated backdrop for content creation. A perfect opportunity to create stunning fashion content while connecting with like-minded creators." },
  'Beauty':        { title: 'Beauty Creator Event – Glow, Create & Connect',                 desc: "Join our exclusive beauty creator event for complimentary treatments, product demonstrations, and content creation opportunities. Experience our services firsthand and create authentic beauty content that resonates with your audience." },
  'Fitness':       { title: 'Fitness Creator Invite – Train, Create & Inspire',              desc: "We're inviting fitness creators for a complimentary workout session, facility tour, and content creation day. Experience our equipment, classes, and community — then share your authentic fitness journey with your audience." },
  'Gaming':        { title: 'Gaming Creator Night – Play, Review & Create',                  desc: "Join us for an exclusive gaming creator night. Get early access to our latest games, hardware, or gaming setup. Create honest gameplay content, connect with fellow creators, and share your experience with your gaming community." },
  'Tech':          { title: 'Tech Creator Showcase – Experience & Review',                   desc: "We're hosting an exclusive tech creator event where you'll get hands-on access to our latest products before anyone else. Experience the features, create in-depth content, and share your honest review with your tech-savvy audience." },
  'Education':     { title: 'Education Creator Event – Learn, Explore & Share',              desc: "Join our exclusive creator experience at our educational institution or platform. Attend a live session, meet our instructors, and get behind-the-scenes access to create content that inspires your audience to learn and grow." },
  'Lifestyle':     { title: 'Lifestyle Creator Invite – Experience & Create',                desc: "We're inviting lifestyle creators for an exclusive brand experience. Enjoy our products or services in a curated setting designed for content creation. A perfect opportunity to create beautiful, authentic lifestyle content for your audience." },
  'Home & Living': { title: 'Home Creator Experience – Style, Shoot & Share',               desc: "Join our exclusive home and living creator event. Explore our product collection in a beautifully styled setting, get styling tips from our experts, and create stunning home content that inspires your audience." },
  'Wellness':      { title: 'Wellness Creator Retreat – Relax, Restore & Create',            desc: "We're inviting wellness creators to experience our services firsthand. Enjoy complimentary treatments, wellness sessions, and a serene environment perfect for creating authentic well-being content for your audience." },
  'Music':         { title: 'Music Creator Event – Live, Exclusive & Immersive',             desc: "Join us for an exclusive music creator event featuring live performances, backstage access, and unique content creation opportunities. Perfect for music creators who want to share authentic, immersive experiences with their audience." },
  'Art & Design':  { title: 'Art Creator Experience – Create, Collaborate & Showcase',      desc: "We're hosting an exclusive art and design creator event. Explore our space, meet our artists, and get inspired to create content that celebrates creativity and artistry. A perfect event for creators who appreciate visual storytelling." },
  'Pets':          { title: 'Pet Creator Day – Fun, Play & Create',                          desc: "Bring your furry friends! We're hosting an exclusive pet creator event at our pet-friendly venue. Experience our products or services with your pets, create adorable content, and connect with fellow pet creators." },
  'Parenting':     { title: 'Family Creator Event – Fun Day for Parents & Kids',            desc: "We're hosting an exclusive family and parenting creator event. Enjoy family-friendly activities, experience our products or services with your family, and create authentic parenting content that resonates with your audience." },
  'Automotive':    { title: 'Auto Creator Drive Day – Experience & Review',                  desc: "Join our exclusive automotive creator event for a test drive, facility tour, and behind-the-scenes content creation day. Experience the performance, design, and features of our vehicles — then share your authentic review." },
  'Finance':       { title: 'Finance Creator Workshop – Learn, Experience & Share',          desc: "We're hosting an exclusive finance creator workshop. Gain insights from our experts, experience our tools or services firsthand, and create educational content that helps your audience make better financial decisions." },
  'Sustainability':{ title: 'Eco Creator Event – Sustainable, Beautiful & Impactful',        desc: "Join our sustainability creator event. Explore our eco-friendly products, learn about our sustainability initiatives, and create content that inspires your audience to make conscious choices for the planet." },
  'Photography':   { title: 'Photography Creator Shoot – Exclusive Access & Collaboration', desc: "We're hosting an exclusive photography creator event. Get access to stunning locations, professional equipment, and expert guidance to create breathtaking content while showcasing our brand in an authentic visual style." },
  'Sports':        { title: 'Sports Creator Day – Play, Train & Create',                    desc: "Join our exclusive sports creator event. Experience our facility, equipment, or sporting experience firsthand. Create high-energy content that motivates your athletic audience and showcases your genuine experience." },
  'Film & TV':     { title: 'Entertainment Creator Premiere – Exclusive & Immersive',        desc: "We're inviting entertainment creators to an exclusive premiere or behind-the-scenes event. Get early access, interact with the talent, and create exciting content that builds hype and anticipation for your audience." },
  'Mindfulness':   { title: 'Mindfulness Creator Experience – Find Peace, Create Content',  desc: "Join our exclusive mindfulness creator event. Experience our sessions, products, or retreat setting and create calming, authentic content that helps your audience on their well-being journey." },
  'Food & Drink':  { title: 'Food & Drink Creator Night – Taste, Experience & Create',      desc: "We're hosting an exclusive food and drink creator evening. Enjoy curated tastings, meet the team behind the flavors, and create beautiful content that makes your audience crave the experience." },
  'Entertainment': { title: 'Entertainment Creator Event – Live, Exclusive & Unforgettable',desc: "Join us for an exclusive entertainment creator event. Experience the show, go backstage, and create immersive content that captures the energy and excitement for your audience." },
};

const CATEGORY_BENEFITS: Record<string, string[]> = {
  'Food':          ['Free food & drinks', 'Event access', 'Gift hampers'],
  'Travel':        ['Event access', 'Free product / service', 'Networking opportunities', 'Future collaboration'],
  'Fashion':       ['Free product / service', 'Event access', 'Gift hampers', 'Future collaboration'],
  'Beauty':        ['Free product / service', 'Event access', 'Gift hampers'],
  'Fitness':       ['Event access', 'Free product / service', 'Networking opportunities'],
  'Gaming':        ['Event access', 'Free product / service', 'Networking opportunities', 'Future collaboration'],
  'Tech':          ['Free product / service', 'Event access', 'Future collaboration'],
  'Education':     ['Event access', 'Networking opportunities', 'Future collaboration'],
  'Lifestyle':     ['Free product / service', 'Event access', 'Gift hampers', 'Future collaboration'],
  'Home & Living': ['Free product / service', 'Event access', 'Gift hampers'],
  'Wellness':      ['Free product / service', 'Event access', 'Networking opportunities'],
  'Music':         ['Event access', 'Networking opportunities', 'Future collaboration'],
  'Art & Design':  ['Event access', 'Networking opportunities', 'Future collaboration'],
  'Pets':          ['Free product / service', 'Event access', 'Gift hampers'],
  'Parenting':     ['Free product / service', 'Event access', 'Gift hampers'],
  'Automotive':    ['Event access', 'Future collaboration'],
  'Finance':       ['Event access', 'Networking opportunities', 'Future collaboration'],
  'Sustainability':['Free product / service', 'Event access', 'Networking opportunities', 'Future collaboration'],
  'Photography':   ['Event access', 'Free product / service', 'Networking opportunities', 'Future collaboration'],
  'Sports':        ['Free product / service', 'Event access', 'Networking opportunities'],
  'Film & TV':     ['Event access', 'Networking opportunities', 'Future collaboration'],
  'Mindfulness':   ['Free product / service', 'Event access', 'Networking opportunities'],
  'Food & Drink':  ['Free food & drinks', 'Event access', 'Gift hampers'],
  'Entertainment': ['Event access', 'Networking opportunities', 'Future collaboration'],
};

const EVENT_TEMPLATE_CONTENT_NE: Record<string, { title: string; desc: string }> = {
  'Food':          { title: 'विशेष फूड क्रिएटर नाइट – खाना चाख्नुहोस्, अन्वेषण गर्नुहोस् र सामग्री बनाउनुहोस्', desc: 'हामी फूड क्रिएटरहरूलाई हाम्रो रेस्टुरेन्टमा विशेष क्रिएटर नाइटमा आमन्त्रण गर्दैछौं। हाम्रा विशेष परिकारहरू चाख्नुहोस्, सेफलाई भेट्नुहोस्, र आफ्नो डाइनिङ अनुभवबारे प्रामाणिक सामग्री बनाउनुहोस्। क्युरेटेड मेनु, किचनको ब्याकस्टेज एक्सेस, र साथी क्रिएटरहरूसँगै एउटा यादगार साँझको आनन्द लिनुहोस्।' },
  'Travel':        { title: 'ट्राभल क्रिएटर अनुभव – घुम्नुहोस् र डकुमेन्ट गर्नुहोस्', desc: 'हाम्रो ट्राभल डेस्टिनेसन वा प्रोपर्टीमा एक विशेष क्रिएटर अनुभवमा सामेल हुनुहोस्। नि:शुल्क एक्सेस, क्युरेटेड एक्टिभिटीहरू, र आफ्नो प्रामाणिक यात्रा डकुमेन्ट गर्ने स्वतन्त्रताको आनन्द लिनुहोस्। लुकेका रत्नहरू फेला पार्न र आफ्ना दर्शकहरूसँग अनुभव साझा गर्न रुचाउने ट्राभल क्रिएटरहरूका लागि उपयुक्त।' },
  'Fashion':       { title: 'फेसन क्रिएटर शोकेस – स्टाइल नाइट', desc: 'हामी एउटा विशेष फेसन क्रिएटर इभेन्ट आयोजना गर्दैछौं जहाँ तपाईंले हाम्रो नयाँ कलेक्सनमा पहिलो पहुँच, व्यावसायिक स्टाइलिङ सहयोग, र सामग्री निर्माणका लागि क्युरेटेड ब्याकड्रप पाउनुहुनेछ। समान विचारका क्रिएटरहरूसँग जोडिँदै आकर्षक फेसन सामग्री बनाउने उत्तम अवसर।' },
  'Beauty':        { title: 'ब्युटी क्रिएटर इभेन्ट – ग्लो, क्रिएट र कनेक्ट गर्नुहोस्', desc: 'नि:शुल्क ट्रिटमेन्ट, प्रोडक्ट डेमोन्स्ट्रेसन, र सामग्री निर्माणका अवसरहरूका लागि हाम्रो विशेष ब्युटी क्रिएटर इभेन्टमा सामेल हुनुहोस्। हाम्रा सेवाहरू प्रत्यक्ष अनुभव गर्नुहोस् र आफ्ना दर्शकहरूसँग मेल खाने प्रामाणिक ब्युटी सामग्री बनाउनुहोस्।' },
  'Fitness':       { title: 'फिटनेस क्रिएटर निमन्त्रणा – ट्रेन, क्रिएट र इन्स्पायर गर्नुहोस्', desc: 'हामी फिटनेस क्रिएटरहरूलाई नि:शुल्क वर्कआउट सेसन, सुविधा भ्रमण, र सामग्री निर्माण दिनको लागि आमन्त्रण गर्दैछौं। हाम्रा उपकरण, कक्षाहरू, र समुदाय अनुभव गर्नुहोस् — त्यसपछि आफ्नो प्रामाणिक फिटनेस यात्रा आफ्ना दर्शकहरूसँग साझा गर्नुहोस्।' },
  'Gaming':        { title: 'गेमिङ क्रिएटर नाइट – खेल्नुहोस्, समीक्षा गर्नुहोस् र सामग्री बनाउनुहोस्', desc: 'हाम्रो विशेष गेमिङ क्रिएटर नाइटमा सामेल हुनुहोस्। हाम्रा नयाँ गेम, हार्डवेयर, वा गेमिङ सेटअपमा पहिलो पहुँच पाउनुहोस्। इमानदार गेमप्ले सामग्री बनाउनुहोस्, साथी क्रिएटरहरूसँग जोडिनुहोस्, र आफ्नो गेमिङ समुदायसँग अनुभव साझा गर्नुहोस्।' },
  'Tech':          { title: 'टेक क्रिएटर शोकेस – अनुभव गर्नुहोस् र समीक्षा गर्नुहोस्', desc: 'हामी एउटा विशेष टेक क्रिएटर इभेन्ट आयोजना गर्दैछौं जहाँ तपाईंले हाम्रा नयाँ प्रोडक्टहरूमा सबैभन्दा पहिले ह्यान्ड्स-अन पहुँच पाउनुहुनेछ। फिचरहरू अनुभव गर्नुहोस्, विस्तृत सामग्री बनाउनुहोस्, र आफ्नो टेक-प्रेमी दर्शकसँग इमानदार समीक्षा साझा गर्नुहोस्।' },
  'Education':     { title: 'एजुकेसन क्रिएटर इभेन्ट – सिक्नुहोस्, अन्वेषण गर्नुहोस् र साझा गर्नुहोस्', desc: 'हाम्रो शैक्षिक संस्था वा प्लेटफर्ममा हाम्रो विशेष क्रिएटर अनुभवमा सामेल हुनुहोस्। लाइभ सेसनमा भाग लिनुहोस्, हाम्रा प्रशिक्षकहरूलाई भेट्नुहोस्, र आफ्ना दर्शकहरूलाई सिक्न र बढ्न प्रेरित गर्ने सामग्री बनाउन ब्याकस्टेज पहुँच पाउनुहोस्।' },
  'Lifestyle':     { title: 'लाइफस्टाइल क्रिएटर निमन्त्रणा – अनुभव गर्नुहोस् र सामग्री बनाउनुहोस्', desc: 'हामी लाइफस्टाइल क्रिएटरहरूलाई एउटा विशेष ब्रान्ड अनुभवका लागि आमन्त्रण गर्दैछौं। सामग्री निर्माणका लागि डिजाइन गरिएको क्युरेटेड सेटिङमा हाम्रा प्रोडक्ट वा सेवाहरूको आनन्द लिनुहोस्। आफ्ना दर्शकहरूका लागि सुन्दर, प्रामाणिक लाइफस्टाइल सामग्री बनाउने उत्तम अवसर।' },
  'Home & Living': { title: 'होम क्रिएटर अनुभव – स्टाइल, सुट र साझा गर्नुहोस्', desc: 'हाम्रो विशेष होम एन्ड लिभिङ क्रिएटर इभेन्टमा सामेल हुनुहोस्। सुन्दर स्टाइल गरिएको सेटिङमा हाम्रो प्रोडक्ट कलेक्सन अन्वेषण गर्नुहोस्, हाम्रा विशेषज्ञहरूबाट स्टाइलिङ सुझाव पाउनुहोस्, र आफ्ना दर्शकहरूलाई प्रेरित गर्ने आकर्षक होम सामग्री बनाउनुहोस्।' },
  'Wellness':      { title: 'वेलनेस क्रिएटर रिट्रिट – रिल्याक्स, रिस्टोर र क्रिएट गर्नुहोस्', desc: 'हामी वेलनेस क्रिएटरहरूलाई हाम्रा सेवाहरू प्रत्यक्ष अनुभव गर्न आमन्त्रण गर्दैछौं। नि:शुल्क ट्रिटमेन्ट, वेलनेस सेसन, र आफ्ना दर्शकहरूका लागि प्रामाणिक स्वास्थ्य सामग्री बनाउन उपयुक्त शान्त वातावरणको आनन्द लिनुहोस्।' },
  'Music':         { title: 'म्युजिक क्रिएटर इभेन्ट – लाइभ, विशेष र इमर्सिभ', desc: 'लाइभ प्रदर्शन, ब्याकस्टेज पहुँच, र अनौठो सामग्री निर्माण अवसरहरू सहितको हाम्रो विशेष म्युजिक क्रिएटर इभेन्टमा सामेल हुनुहोस्। आफ्ना दर्शकहरूसँग प्रामाणिक, इमर्सिभ अनुभव साझा गर्न चाहने म्युजिक क्रिएटरहरूका लागि उपयुक्त।' },
  'Art & Design':  { title: 'आर्ट क्रिएटर अनुभव – बनाउनुहोस्, सहकार्य गर्नुहोस् र प्रदर्शन गर्नुहोस्', desc: 'हामी एउटा विशेष आर्ट एन्ड डिजाइन क्रिएटर इभेन्ट आयोजना गर्दैछौं। हाम्रो स्पेस अन्वेषण गर्नुहोस्, हाम्रा कलाकारहरूलाई भेट्नुहोस्, र रचनात्मकता र कलात्मकतालाई मनाउने सामग्री बनाउन प्रेरित हुनुहोस्। भिजुअल स्टोरीटेलिङलाई कदर गर्ने क्रिएटरहरूका लागि उपयुक्त इभेन्ट।' },
  'Pets':          { title: 'पेट क्रिएटर डे – रमाइलो, खेल र सामग्री निर्माण', desc: 'आफ्ना प्यारा साथीहरूलाई लिएर आउनुहोस्! हामी हाम्रो पेट-फ्रेन्डली भेन्युमा विशेष पेट क्रिएटर इभेन्ट आयोजना गर्दैछौं। आफ्ना पेटसँगै हाम्रा प्रोडक्ट वा सेवाहरू अनुभव गर्नुहोस्, प्यारो सामग्री बनाउनुहोस्, र साथी पेट क्रिएटरहरूसँग जोडिनुहोस्।' },
  'Parenting':     { title: 'फ्यामिली क्रिएटर इभेन्ट – अभिभावक र बच्चाहरूका लागि रमाइलो दिन', desc: 'हामी एउटा विशेष फ्यामिली र प्यारेन्टिङ क्रिएटर इभेन्ट आयोजना गर्दैछौं। परिवार-मैत्री गतिविधिहरूको आनन्द लिनुहोस्, आफ्नो परिवारसँग हाम्रा प्रोडक्ट वा सेवाहरू अनुभव गर्नुहोस्, र आफ्ना दर्शकहरूसँग मेल खाने प्रामाणिक प्यारेन्टिङ सामग्री बनाउनुहोस्।' },
  'Automotive':    { title: 'अटो क्रिएटर ड्राइभ डे – अनुभव गर्नुहोस् र समीक्षा गर्नुहोस्', desc: 'टेस्ट ड्राइभ, सुविधा भ्रमण, र ब्याकस्टेज सामग्री निर्माण दिनको लागि हाम्रो विशेष अटोमोटिभ क्रिएटर इभेन्टमा सामेल हुनुहोस्। हाम्रा गाडीहरूको प्रदर्शन, डिजाइन, र फिचरहरू अनुभव गर्नुहोस् — त्यसपछि आफ्नो प्रामाणिक समीक्षा साझा गर्नुहोस्।' },
  'Finance':       { title: 'फाइनान्स क्रिएटर वर्कशप – सिक्नुहोस्, अनुभव गर्नुहोस् र साझा गर्नुहोस्', desc: 'हामी एउटा विशेष फाइनान्स क्रिएटर वर्कशप आयोजना गर्दैछौं। हाम्रा विशेषज्ञहरूबाट अन्तर्दृष्टि पाउनुहोस्, हाम्रा उपकरण वा सेवाहरू प्रत्यक्ष अनुभव गर्नुहोस्, र आफ्ना दर्शकहरूलाई राम्रो आर्थिक निर्णय लिन मद्दत गर्ने शैक्षिक सामग्री बनाउनुहोस्।' },
  'Sustainability':{ title: 'इको क्रिएटर इभेन्ट – दिगो, सुन्दर र प्रभावकारी', desc: 'हाम्रो सस्टेनेबिलिटी क्रिएटर इभेन्टमा सामेल हुनुहोस्। हाम्रा इको-फ्रेन्डली प्रोडक्टहरू अन्वेषण गर्नुहोस्, हाम्रो दिगोपन पहलहरूबारे जान्नुहोस्, र आफ्ना दर्शकहरूलाई पृथ्वीका लागि सचेत विकल्प रोज्न प्रेरित गर्ने सामग्री बनाउनुहोस्।' },
  'Photography':   { title: 'फोटोग्राफी क्रिएटर सुट – विशेष पहुँच र सहकार्य', desc: 'हामी एउटा विशेष फोटोग्राफी क्रिएटर इभेन्ट आयोजना गर्दैछौं। मनमोहक लोकेसन, व्यावसायिक उपकरण, र हाम्रो ब्रान्डलाई प्रामाणिक भिजुअल स्टाइलमा देखाउँदै अद्भुत सामग्री बनाउन विशेषज्ञ मार्गदर्शन पाउनुहोस्।' },
  'Sports':        { title: 'स्पोर्ट्स क्रिएटर डे – खेल्नुहोस्, तालिम लिनुहोस् र सामग्री बनाउनुहोस्', desc: 'हाम्रो विशेष स्पोर्ट्स क्रिएटर इभेन्टमा सामेल हुनुहोस्। हाम्रो सुविधा, उपकरण, वा खेल अनुभव प्रत्यक्ष अनुभव गर्नुहोस्। आफ्नो एथलेटिक दर्शकलाई उत्साहित गर्ने र आफ्नो वास्तविक अनुभव देखाउने उच्च-ऊर्जा सामग्री बनाउनुहोस्।' },
  'Film & TV':     { title: 'इन्टरटेनमेन्ट क्रिएटर प्रिमियर – विशेष र इमर्सिभ', desc: 'हामी इन्टरटेनमेन्ट क्रिएटरहरूलाई विशेष प्रिमियर वा ब्याकस्टेज इभेन्टमा आमन्त्रण गर्दैछौं। सबैभन्दा पहिले पहुँच पाउनुहोस्, कलाकारहरूसँग अन्तरक्रिया गर्नुहोस्, र आफ्ना दर्शकहरूका लागि उत्साह र प्रतीक्षा बढाउने रोमाञ्चक सामग्री बनाउनुहोस्।' },
  'Mindfulness':   { title: 'माइन्डफुलनेस क्रिएटर अनुभव – शान्ति फेला पार्नुहोस्, सामग्री बनाउनुहोस्', desc: 'हाम्रो विशेष माइन्डफुलनेस क्रिएटर इभेन्टमा सामेल हुनुहोस्। हाम्रा सेसन, प्रोडक्ट, वा रिट्रिट सेटिङ अनुभव गर्नुहोस् र आफ्ना दर्शकहरूको स्वास्थ्य यात्रामा मद्दत गर्ने शान्त, प्रामाणिक सामग्री बनाउनुहोस्।' },
  'Food & Drink':  { title: 'फूड एन्ड ड्रिंक क्रिएटर नाइट – चाख्नुहोस्, अनुभव गर्नुहोस् र सामग्री बनाउनुहोस्', desc: 'हामी एउटा विशेष फूड एन्ड ड्रिंक क्रिएटर साँझ आयोजना गर्दैछौं। क्युरेटेड टेस्टिङको आनन्द लिनुहोस्, स्वादहरू पछाडिको टिमलाई भेट्नुहोस्, र आफ्ना दर्शकहरूलाई त्यो अनुभव चाख्न मन लाग्ने सुन्दर सामग्री बनाउनुहोस्।' },
  'Entertainment': { title: 'इन्टरटेनमेन्ट क्रिएटर इभेन्ट – लाइभ, विशेष र अविस्मरणीय', desc: 'हामीसँग एउटा विशेष इन्टरटेनमेन्ट क्रिएटर इभेन्टमा सामेल हुनुहोस्। शो अनुभव गर्नुहोस्, ब्याकस्टेज जानुहोस्, र आफ्ना दर्शकहरूका लागि ऊर्जा र उत्साह समेट्ने इमर्सिभ सामग्री बनाउनुहोस्।' },
};

const BENEFIT_LABELS_NE: Record<string, string> = {
  'Free food & drinks':      'नि:शुल्क खाना र पेय पदार्थ',
  'Event access':            'इभेन्ट पहुँच',
  'Free product / service':  'नि:शुल्क प्रोडक्ट / सेवा',
  'Gift hampers':            'गिफ्ट ह्याम्पर',
  'Networking opportunities':'नेटवर्किङ अवसर',
  'Future collaboration':    'भविष्यको सहकार्य',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  template: string;
  goals: string[];
  budget: string;
  creatorType: string[];
  platforms: string[];
  location: string;
  creatorsNeeded: number;
  deliverables: Record<string, number>;
  title: string;
  description: string;
  featureImageUrl: string | null;
  deadline: Date | null;
  isFeatured: boolean;
  // Open Event fields
  eventType:    'PAID_CAMPAIGN' | 'OPEN_EVENT';
  eventDate:    Date | null;
  venue:        string;
  capacity:     number;
  benefits:     string[];
  eventContent: string[];
  // AI-generated fields (PAID_CAMPAIGN only)
  objective: string;
  contentGuidelines: string[];
  targetAudience: string[];
  hashtags: string[];
  sampleCaption: string;
  approvalRequirements: string;
  aiGenerated: boolean;
  aiPrompt: string;
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  needsInput: string[];
  aiBudgetMin: number;
  aiBudgetMax: number;
};

type ReviewErrors = Partial<Record<'title' | 'deadline' | 'platform' | 'eventDate' | 'budget', string>>;
type EventErrors = Partial<Record<'template' | 'capacity' | 'venue', string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDate(d: Date) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

// ─── DropdownPicker ───────────────────────────────────────────────────────────

function DropdownPicker({
  value, onChange, options, placeholder, colors, error, imageFor,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { label: string; icon: string; color: string }[];
  placeholder: string;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
  imageFor?: (label: string) => string | undefined;
}) {
  const C = colors;
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.label === value);
  const selectedImg = selected && imageFor ? imageFor(selected.label) : undefined;

  return (
    <>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={[dp.trigger, { backgroundColor: C.background, borderColor: error ? ERROR_RED : value ? C.brinjal1 : C.border }]}
        onPress={() => setOpen(true)}>
        {selectedImg ? (
          <Image source={{ uri: selectedImg }} style={dp.triggerThumb} resizeMode="cover" />
        ) : selected ? (
          <FontAwesome5 name={selected.icon} size={16} color={selected.color} />
        ) : (
          <Ionicons name="grid-outline" size={16} color={C.textSecondary} />
        )}
        <Text style={[dp.triggerText, { color: value ? C.text : C.textSecondary }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
      </Pressable>
      {error && <Text style={dp.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={dp.modalWrap}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={dp.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{placeholder}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {options.map((opt) => {
                const sel = opt.label === value;
                const img = imageFor ? imageFor(opt.label) : undefined;
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={opt.label}
                    style={[dp.item, { backgroundColor: sel ? C.primaryLight : 'transparent' }]}
                    onPress={() => { onChange(opt.label); setOpen(false); }}>
                    <View style={[dp.itemThumbWrap, { backgroundColor: C.border, overflow: 'hidden' }]}>
                      {img ? (
                        <Image source={{ uri: img }} style={dp.itemThumb} resizeMode="cover" />
                      ) : (
                        <FontAwesome5 name={opt.icon} size={16} color={opt.color} />
                      )}
                    </View>
                    <Text style={[dp.itemLabel, { color: sel ? C.brinjal1 : C.text, fontFamily: sel ? F.semibold : F.regular }]}>{opt.label}</Text>
                    {sel && <Ionicons name="checkmark" size={18} color={C.brinjal1} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const dp = StyleSheet.create({
  trigger:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  triggerThumb: { width: 30, height: 30, borderRadius: RADIUS.sm },
  triggerText:  { flex: 1, fontSize: 14, fontFamily: F.medium },
  error:        { fontSize: 12, color: ERROR_RED, fontFamily: F.regular, marginTop: 4 },
  modalWrap:  { flex: 1, justifyContent: 'flex-end' },
  scrim:      { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  sheetTitle: { fontSize: 16, fontFamily: F.bold, marginBottom: 12 },
  item:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.md, marginBottom: 4, minHeight: 44 },
  itemThumbWrap:{ width: 44, height: 44, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  itemThumb:    { width: 44, height: 44 },
  itemLabel:    { flex: 1, fontSize: 14 },
});

// ─── MultiCheckboxDropdown ────────────────────────────────────────────────────

function MultiCheckboxDropdown({
  values, onChange, options, placeholder, colors, error,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  placeholder: string;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }

  const label = values.length === 0 ? placeholder : values.length === 1 ? values[0] : `${values[0]} +${values.length - 1} ${t('createEvent.multiMore')}`;

  return (
    <>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={[dp.trigger, { backgroundColor: C.background, borderColor: error ? ERROR_RED : values.length > 0 ? C.brinjal1 : C.border }]}
        onPress={() => setOpen(true)}>
        <Ionicons name="flag-outline" size={16} color={values.length > 0 ? C.brinjal1 : C.textSecondary} />
        <Text style={[dp.triggerText, { color: values.length > 0 ? C.text : C.textSecondary }]} numberOfLines={1}>{label}</Text>
        {values.length > 0 && (
          <View style={[mc.badge, { backgroundColor: C.brinjal1 }]}>
            <Text style={mc.badgeText}>{values.length}</Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
      </Pressable>
      {error && <Text style={dp.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={dp.modalWrap}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={mc.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{placeholder}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setOpen(false)}>
                <Text style={[mc.done, { color: C.brinjal1 }]}>{t('createEvent.multiSelectDone')}</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {options.map((opt) => {
                const checked = values.includes(opt);
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={opt}
                    style={[mc.row, { backgroundColor: checked ? C.primaryLight : 'transparent' }]}
                    onPress={() => toggle(opt)}>
                    <View style={[mc.checkbox, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.brinjal1 : 'transparent' }]}>
                      {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <Text style={[mc.rowLabel, { color: checked ? C.brinjal1 : C.text, fontFamily: checked ? F.semibold : F.regular }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const mc = StyleSheet.create({
  badge:      { width: 20, height: 20, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  badgeText:  { fontSize: 11, color: '#fff', fontFamily: F.bold },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  done:       { fontSize: 15, fontFamily: F.bold },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12, borderRadius: RADIUS.md, marginBottom: 4 },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  rowLabel:   { flex: 1, fontSize: 14 },
});

// ─── RadioGroup ───────────────────────────────────────────────────────────────

function RadioGroup({
  value, onChange, options, colors, error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  return (
    <View style={{ gap: 6 }}>
      {options.map((opt) => {
        const sel = value === opt;
        return (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            key={opt}
            style={[rg.row, { backgroundColor: sel ? C.primaryLight : C.background, borderColor: sel ? C.brinjal1 : C.border }]}
            onPress={() => onChange(opt)}>
            <View style={[rg.outer, { borderColor: sel ? C.brinjal1 : C.border }]}>
              {sel && <View style={[rg.inner, { backgroundColor: C.brinjal1 }]} />}
            </View>
            <Text style={[rg.label, { color: sel ? C.brinjal1 : C.text, fontFamily: sel ? F.semibold : F.regular }]}>{opt}</Text>
          </Pressable>
        );
      })}
      {error && <Text style={rg.error}>{error}</Text>}
    </View>
  );
}

const rg = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: RADIUS.md, borderWidth: 1.5 },
  outer: { width: 20, height: 20, borderRadius: RADIUS.full, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  inner: { width: 10, height: 10, borderRadius: RADIUS.full },
  label: { flex: 1, fontSize: 14 },
  error: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },
});

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

function CalendarGrid({ value, onChange, colors }: {
  value: Date | null;
  onChange: (d: Date) => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const today = dayStart(new Date());
  const [calYear, setCalYear] = useState(value ? value.getFullYear() : today.getFullYear());
  const [calMonth, setCalMonth] = useState(value ? value.getMonth() : today.getMonth());

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstWeekday = getFirstWeekday(calYear, calMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function isPast(day: number) { return dayStart(new Date(calYear, calMonth, day)) < today; }

  return (
    <View style={{ gap: 10 }}>
      <View style={cal.monthNav}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={cal.navBtn} onPress={() => {
          if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
          else setCalMonth((m) => m - 1);
        }}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[cal.monthTitle, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={cal.navBtn} onPress={() => {
          if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
          else setCalMonth((m) => m + 1);
        }}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>›</Text>
        </Pressable>
      </View>
      <View style={cal.dayRow}>
        {DAY_SHORT.map((d) => <Text key={d} style={[cal.dayHdr, { color: C.textSecondary }]}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={cal.cell} />;
          const past = isPast(day);
          const sel = value ? sameDay(value, dayStart(new Date(calYear, calMonth, day))) : false;
          const isToday = sameDay(dayStart(new Date(calYear, calMonth, day)), today);
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} key={`d${day}`} style={cal.cell} disabled={past}
              onPress={() => onChange(dayStart(new Date(calYear, calMonth, day)))}>
              <View style={[cal.dayCircle, sel && { backgroundColor: C.brinjal1 }, isToday && !sel && { borderWidth: 1.5, borderColor: C.brinjal1 }]}>
                <Text style={[cal.dayNum, { color: past ? C.border : sel ? '#fff' : isToday ? C.brinjal1 : C.text }, sel && { fontWeight: '700' }]}>
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const cal = StyleSheet.create({
  monthNav:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn:    { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navTxt:    { fontSize: 28, lineHeight: 32 },
  monthTitle:{ fontSize: 15, fontFamily: F.bold },
  dayRow:    { flexDirection: 'row' },
  dayHdr:    { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: F.semibold },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  cell:      { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  dayNum:    { fontSize: 13, fontFamily: F.medium },
});

// ─── DeadlinePicker ───────────────────────────────────────────────────────────

function DeadlinePicker({ value, onChange, error, colors, label }: {
  value: Date | null;
  onChange: (d: Date | null) => void;
  error?: string;
  colors: ReturnType<typeof useAppColors>;
  label?: string;
}) {
  const C = colors;
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={[dp.trigger, { flexDirection: 'row', alignItems: 'center', borderColor: error ? ERROR_RED : value ? C.brinjal1 : C.border, backgroundColor: C.background, height: 50 }]}
        onPress={() => setOpen(true)}>
        <Text style={[{ flex: 1, fontSize: 15, fontFamily: F.regular, color: value ? C.text : C.textSecondary }]}>
          {value ? fmtDate(value) : t('createEvent.deadlineTapToSelect')}
        </Text>
        {value ? (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} hitSlop={10} onPress={(e) => { e.stopPropagation(); onChange(null); }}>
            <Ionicons name="close-circle" size={18} color={C.textSecondary} />
          </Pressable>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={C.textSecondary} />
        )}
      </Pressable>
      {error && <Text style={dp.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={dp.modalWrap}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={mc.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{label ?? t('createEvent.deadlineDefaultLabel')}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setOpen(false)}>
                <Text style={[mc.done, { color: C.brinjal1 }]}>{t('createEvent.deadlineDone')}</Text>
              </Pressable>
            </View>
            {value && (
              <View style={[{ borderRadius: RADIUS.sm, padding: 10, marginTop: 12, backgroundColor: C.primaryLight }]}>
                <Text style={[{ fontSize: 13, fontFamily: F.bold, color: C.brinjal1 }]}>{t('createEvent.deadlineSelected', { date: fmtDate(value) })}</Text>
              </View>
            )}
            <View style={{ marginTop: 16 }}>
              <CalendarGrid value={value} onChange={(d) => { onChange(d); setOpen(false); }} colors={C} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── FeaturedToggle ───────────────────────────────────────────────────────────

function FeaturedToggle({ value, onChange, quota, colors }: {
  value: boolean;
  onChange: (v: boolean) => void;
  quota: { remaining: number; price: number } | null;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const { t } = useLanguage();
  const locked = quota !== null && quota.remaining <= 0;

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={[
        ft.toggle,
        { backgroundColor: value ? '#FFF8E8' : C.surface, borderColor: value ? '#F59E0B' : C.border },
        locked && ft.locked,
      ]}
      onPress={() => { if (!locked) onChange(!value); }}
      disabled={locked}>
      <View style={ft.left}>
        <FontAwesome5 name="star" size={18} color="#F59E0B" solid />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={ft.labelRow}>
            <Text style={[ft.label, { color: C.text }]}>{t('createEvent.featuredLabel')}</Text>
            {quota && (
              <View style={[ft.pill, { backgroundColor: locked ? C.border : '#FEF3C7' }]}>
                <Text style={[ft.pillText, { color: locked ? C.textSecondary : '#92400E' }]}>
                  {locked ? `Rs. ${quota.price}` : t('createEvent.featuredRemaining', { n: quota.remaining })}
                </Text>
              </View>
            )}
          </View>
          <Text style={[ft.sub, { color: C.textSecondary }]}>
            {locked ? t('createEvent.featuredLockedSub', { price: quota!.price }) : t('createEvent.featuredSub')}
          </Text>
        </View>
      </View>
      <View style={[ft.switch, { backgroundColor: value ? '#F59E0B' : C.border }]}>
        <View style={[ft.switchThumb, { left: value ? 20 : 2 }]} />
      </View>
    </Pressable>
  );
}

const ft = StyleSheet.create({
  toggle:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: RADIUS.lg, padding: 16, borderWidth: 1.5 },
  locked:      { opacity: 0.6 },
  left:        { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  labelRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label:       { fontSize: 14, fontFamily: F.bold },
  sub:         { fontSize: 12, lineHeight: 17, fontFamily: F.regular },
  pill:        { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  pillText:    { fontSize: 10, fontFamily: F.bold },
  switch:      { width: 44, height: 26, borderRadius: RADIUS.full, position: 'relative' },
  switchThumb: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: RADIUS.full, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },
});

// ─── ListingHeroCard (Airbnb-style confirm screen header) ──────────────────────

function ListingHeroCard({
  featureImageUrl, title, category, colors,
}: {
  featureImageUrl: string | null;
  title: string;
  category?: string;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const image = featureImageUrl ?? getTemplateImage(category, category);
  return (
    <View style={[lh.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {image && <Image source={{ uri: image }} style={lh.image} resizeMode="cover" />}
      <View style={lh.body}>
        {category && (
          <View style={[lh.categoryPill, { backgroundColor: C.primaryLight }]}>
            <Text style={[lh.categoryPillText, { color: C.brinjal1 }]}>{category}</Text>
          </View>
        )}
        <Text style={[lh.title, { color: C.text }]} numberOfLines={2}>{title}</Text>
      </View>
    </View>
  );
}

const lh = StyleSheet.create({
  card:            { borderRadius: RADIUS.lg, borderWidth: 1.5, overflow: 'hidden' },
  image:           { width: '100%', height: 160 },
  body:            { padding: 14, gap: 6 },
  categoryPill:    { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  categoryPillText:{ fontSize: 11, fontFamily: F.bold },
  title:           { fontSize: 18, fontFamily: F.bold },
});

// ─── AiGeneratingOverlay (full-screen loader while AI drafts the event) ────────

const AI_OVERLAY_STEP_KEYS = ['aiOverlayStep1', 'aiOverlayStep2', 'aiOverlayStep3', 'aiOverlayStep4'] as const;

// SMIL <animate>/<animateTransform> elements in the SVG only play in a real
// browser engine — react-native-svg doesn't execute them — so the artwork is
// rendered through a WebView instead, which uses the platform's own engine.
const EVENT_LOADING_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;height:100%;width:100%;}svg{width:100%;height:100%;display:block;}</style></head><body>${EVENT_LOADING_SVG}</body></html>`;

function AiGeneratingOverlay({ visible, t }: {
  visible: boolean;
  t: TFn;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const stepFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(stepFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(stepFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setStepIndex((i) => (i + 1) % AI_OVERLAY_STEP_KEYS.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={ov.backdrop}>
        <View style={ov.artWrap}>
          {visible && (
            <WebView
              style={ov.art}
              containerStyle={{ backgroundColor: 'transparent' }}
              source={{ html: EVENT_LOADING_HTML }}
              originWhitelist={['*']}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              pointerEvents="none"
            />
          )}
        </View>
        <Text style={ov.title}>{t('createEvent.aiOverlayTitle')}</Text>
        <Animated.Text style={[ov.step, { opacity: stepFade }]}>
          {t(`createEvent.${AI_OVERLAY_STEP_KEYS[stepIndex]}`)}
        </Animated.Text>
      </View>
    </Modal>
  );
}

const ov = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  artWrap:  { width: 260, height: 260 },
  art:      { flex: 1, backgroundColor: 'transparent' },
  title:    { fontSize: 17, fontFamily: F.bold, textAlign: 'center', color: '#fff', marginTop: 8 },
  step:     { fontSize: 13, fontFamily: F.regular, textAlign: 'center', color: 'rgba(255,255,255,0.75)', minHeight: 18, marginTop: 6 },
});

// ─── PreviewRow (read-only recap line, confirm screen) ─────────────────────────

function PreviewRow({
  icon, label, value, colors, last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useAppColors>;
  last?: boolean;
}) {
  const C = colors;
  return (
    <View style={[s.summaryRow, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 140 }}>
        <Ionicons name={icon} size={15} color={C.textSecondary} />
        <Text style={[s.summaryLabel, { width: undefined, color: C.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[s.summaryValue, { color: C.text }]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCampaignScreen() {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const notRequiredLabel = t('createEvent.notRequired');
  const [phase, setPhase] = useState<'setup' | 'review' | 'confirm'>('setup');
  const [loading, setLoading] = useState(false);
  const [publishWarnVisible, setPublishWarnVisible] = useState(false);
  const [publishedCampaign, setPublishedCampaign] = useState<{ id: string; category: string; lat: number | null; lng: number | null; budgetMin?: number; budgetMax?: number } | null>(null);

  function handleRecommendedDone() {
    setPublishedCampaign(null);
    router.replace('/(business)/');
  }
  const [reviewErrors, setReviewErrors] = useState<ReviewErrors>({});
  const [eventErrors, setEventErrors] = useState<EventErrors>({});
  const scrollRef = useRef<ScrollView>(null);
  const { categories: liveCategories } = useCategories('BUSINESS');
  const categoryOptions = liveCategories.map((c) => ({ label: c.name, icon: c.icon, color: c.color }));
  const { platforms: livePlatforms } = usePlatforms();
  const platformOptions = livePlatforms.map((p) => p.name);

  useEffect(() => {
    profileService.getBusinessProfile().then((profile) => {
      if (profile.location) {
        setForm((prev) => ({ ...prev, location: profile.location!, venue: profile.location! }));
      }
    }).catch(() => { /* location stays empty */ });
  }, []);

  // Fails open (stays null → toggle isn't locked) if this errors — the
  // backend still enforces the quota server-side on publish either way.
  const [featuredQuota, setFeaturedQuota] = useState<{ freeQuota: number; used: number; remaining: number; price: number } | null>(null);
  useEffect(() => {
    campaignService.getFeaturedQuota().then(setFeaturedQuota).catch(() => {});
  }, []);
  const featuredLocked = featuredQuota !== null && featuredQuota.remaining <= 0;

  const [form, setForm] = useState<FormData>({
    template: '',
    goals: [],
    budget: '',
    creatorType: [],
    platforms: ['Instagram'],
    location: '',
    creatorsNeeded: 1,
    deliverables: { ...DEFAULT_DELIVERABLES },
    title: '',
    description: '',
    featureImageUrl: null,
    deadline: dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    isFeatured: false,
    // Open Event fields
    eventType:    'PAID_CAMPAIGN',
    eventDate:    dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    venue:        '',
    capacity:     20,
    benefits:     [],
    eventContent: [],
    // AI-generated fields
    objective: '',
    contentGuidelines: [],
    targetAudience: [],
    hashtags: [],
    sampleCaption: '',
    approvalRequirements: '',
    aiGenerated: false,
    aiPrompt: '',
    aiSuggestedCategories: [],
    aiSuggestedPlatforms: [],
    needsInput: [],
    aiBudgetMin: 0,
    aiBudgetMax: 0,
  });

  const [aiPromptText, setAiPromptText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlaceholder] = useState(() => AI_PROMPT_EXAMPLES[Math.floor(Math.random() * AI_PROMPT_EXAMPLES.length)]);
  const [aiLocationError, setAiLocationError] = useState<string | undefined>();
  const [descSuggestLoading, setDescSuggestLoading] = useState(false);
  const [featureImageUploading, setFeatureImageUploading] = useState(false);

  async function handlePickFeatureImage() {
    if (featureImageUploading) return;
    setFeatureImageUploading(true);
    try {
      const result = await pickAndUpload('campaign-feature');
      if (result?.url) update('featureImageUrl', result.url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.featureImageUploadFailed'), 'error');
    } finally {
      setFeatureImageUploading(false);
    }
  }

  function handleClearFeatureImage() {
    update('featureImageUrl', null);
  }

  // Coordinates for the campaign's location/venue — resolved from the selected
  // Places suggestion so "Nearby Events" can compute distance from creators.
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);

  // Same tap-to-open search modal used by the business's "search creators"
  // location filter, instead of an inline autocomplete dropdown — one field
  // (eventType is mutually exclusive between paid/open-event forms) drives
  // whichever of `location`/`venue` is currently on screen.
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocationModalOpen(false);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    if (form.eventType === 'OPEN_EVENT') {
      update('venue', address);
      if (eventErrors.venue) setEventErrors((e) => ({ ...e, venue: undefined }));
    } else {
      update('location', address);
      if (aiLocationError) setAiLocationError(undefined);
    }
  }

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }

  useEffect(() => () => { toastOpacity.stopAnimation(); }, []);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetFormForType(newType: 'PAID_CAMPAIGN' | 'OPEN_EVENT') {
    const eventDate   = dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
    setForm((prev) => ({
      template:       '',
      goals:          [],
      budget:         '',
      creatorType:    [],
      platforms:      ['Instagram'],
      location:       prev.location,
      creatorsNeeded: 1,
      deliverables:   { ...DEFAULT_DELIVERABLES },
      title:          '',
      description:    '',
      featureImageUrl: null,
      deadline:       newType === 'OPEN_EVENT' ? regDeadline : dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      isFeatured:     false,
      eventType:      newType,
      eventDate,
      venue:          prev.venue,
      capacity:       20,
      benefits:       [],
      eventContent:   [],
      objective: '',
      contentGuidelines: [],
      targetAudience: [],
      hashtags: [],
      sampleCaption: '',
      approvalRequirements: '',
      aiGenerated: false,
      aiPrompt: '',
      aiSuggestedCategories: [],
      aiSuggestedPlatforms: [],
      needsInput: [],
      aiBudgetMin: 0,
      aiBudgetMax: 0,
    }));
    setReviewErrors({});
    setEventErrors({});
    setPhase('setup');
  }

  async function handleGenerateWithAi() {
    if (!aiPromptText.trim() || aiLoading) return;
    if (!form.location.trim()) {
      setAiLocationError(t('createEvent.errNoLocation'));
      return;
    }
    setAiLocationError(undefined);
    setAiLoading(true);
    try {
      const draft = await campaignService.generateWithAi(aiPromptText.trim());
      setForm((prev) => ({
        ...prev,
        template:    draft.category,
        platforms:   draft.platforms.slice(0, 3),
        title:       draft.title,
        description: draft.description,
        goals:       [draft.goal],
        budget:      '',
        creatorsNeeded: draft.creatorsNeeded,
        deadline:    dayStart(new Date(Date.now() + draft.suggestedDurationDays * 24 * 60 * 60 * 1000)),
        objective:            draft.objective,
        contentGuidelines:    draft.contentGuidelines,
        targetAudience:       draft.targetAudience,
        deliverables:         { ...DEFAULT_DELIVERABLES, ...draft.deliverables },
        hashtags:             draft.hashtags,
        sampleCaption:        draft.sampleCaption,
        approvalRequirements: draft.approvalRequirements,
        featureImageUrl:      prev.featureImageUrl ?? getTemplateImage(draft.category, draft.category) ?? null,
        aiGenerated:           true,
        aiPrompt:              aiPromptText.trim(),
        aiSuggestedCategories: draft.aiSuggestedCategories,
        aiSuggestedPlatforms:  draft.aiSuggestedPlatforms,
        needsInput:            draft.needsInput,
        aiBudgetMin: draft.budgetMin,
        aiBudgetMax: draft.budgetMax,
      }));
      setAiPromptText('');
      setPhase('review');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch {
      // The backend already falls back to a dummy draft for OpenAI-specific failures
      // (bad key, quota, malformed response) — reaching this catch means the request
      // itself never came back (network down, timeout, unrelated server error). Load a
      // generic template locally instead of leaving the user stuck with an empty form.
      const fallbackCategory = categoryOptions.find((c) => c.label === 'Lifestyle')?.label ?? categoryOptions[0]?.label ?? '';
      const fallbackPlatform = platformOptions.find((p) => p === 'Instagram') ?? platformOptions[0] ?? '';
      setForm((prev) => ({
        ...prev,
        template:    fallbackCategory,
        platforms:   fallbackPlatform ? [fallbackPlatform] : [],
        title:       GENERIC_AI_TEMPLATE.title,
        description: GENERIC_AI_TEMPLATE.description,
        goals:       [GOAL_OPTIONS[0]!],
        budget:      '',
        creatorsNeeded: GENERIC_AI_TEMPLATE.creatorsNeeded,
        deadline:    dayStart(new Date(Date.now() + GENERIC_AI_TEMPLATE.suggestedDurationDays * 24 * 60 * 60 * 1000)),
        objective:            GENERIC_AI_TEMPLATE.objective,
        contentGuidelines:    GENERIC_AI_TEMPLATE.contentGuidelines,
        targetAudience:       GENERIC_AI_TEMPLATE.targetAudience,
        deliverables:         { ...DEFAULT_DELIVERABLES, ...GENERIC_AI_TEMPLATE.deliverables },
        hashtags:             GENERIC_AI_TEMPLATE.hashtags,
        sampleCaption:        GENERIC_AI_TEMPLATE.sampleCaption,
        approvalRequirements: GENERIC_AI_TEMPLATE.approvalRequirements,
        featureImageUrl:      prev.featureImageUrl ?? getTemplateImage(fallbackCategory, fallbackCategory) ?? null,
        aiGenerated:           true,
        aiPrompt:              aiPromptText.trim(),
        aiSuggestedCategories: [],
        aiSuggestedPlatforms:  [],
        needsInput:            ['budgetMin', 'category'],
        aiBudgetMin: GENERIC_AI_TEMPLATE.budgetMin,
        aiBudgetMax: GENERIC_AI_TEMPLATE.budgetMax,
      }));
      setAiPromptText('');
      setPhase('review');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      showToast(t('createEvent.aiGenerateFallback'), 'error');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSuggestDescription() {
    if (descSuggestLoading) return;
    const deliverables = form.eventType === 'PAID_CAMPAIGN'
      ? summarizeDeliverables(form.deliverables, form.goals, t)
      : form.benefits.join(', ');
    if (!form.title.trim() && !form.template && !deliverables) {
      showToast(t('createEvent.descSuggestNeedsInfo'), 'error');
      return;
    }
    setDescSuggestLoading(true);
    try {
      const description = await campaignService.suggestDescription({
        title:        form.title.trim() || undefined,
        category:     form.template || undefined,
        platform:     form.platforms.length > 0 ? form.platforms.join(', ') : undefined,
        deliverables: deliverables || undefined,
      });
      update('description', description);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.descSuggestFailed'), 'error');
    } finally {
      setDescSuggestLoading(false);
    }
  }

  function handleContinueEvent() {
    const errs: EventErrors = {};
    if (!form.template)        errs.template = t('createEvent.errNoCategory');
    if (!form.venue.trim())    errs.venue    = t('createEvent.errNoVenue');
    if (form.capacity < 1)     errs.capacity = t('createEvent.errMinCapacity');

    if (Object.keys(errs).length > 0) { setEventErrors(errs); return; }
    setEventErrors({});

    const templates = language === 'ne' ? EVENT_TEMPLATE_CONTENT_NE : EVENT_TEMPLATE_CONTENT;
    const content  = templates[form.template] ?? { title: '', desc: '' };
    const autoDesc = content.desc
      ? content.desc + (form.venue ? `\n\n${t('createEvent.locationPrefix')}: ${form.venue}` : '')
      : '';
    const rawBenefits = CATEGORY_BENEFITS[form.template] ?? ['Event access'];
    const suggestedBenefits = language === 'ne'
      ? rawBenefits.map((b) => BENEFIT_LABELS_NE[b] ?? b)
      : rawBenefits;
    const defaultEventDate  = dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    setForm((prev) => {
      const eventDate = prev.eventDate ?? defaultEventDate;
      const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
      return {
        ...prev,
        title:       content.title,
        description: autoDesc,
        benefits:    suggestedBenefits,
        eventDate,
        deadline:    regDeadline,
      };
    });
    setPhase('review');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function buildPaidCampaignPayload() {
    const budget = { min: form.aiBudgetMin, max: form.aiBudgetMax, payment: 'Fixed Fee' };
    return {
      title:          form.title.trim() || t('createEvent.untitledEvent'),
      description:    form.description.trim(),
      template:       form.template,
      featureImageUrl: form.featureImageUrl ?? undefined,
      category:       form.template,
      goals:          form.goals,
      platforms:      form.platforms,
      location:       form.location.trim() || undefined,
      locationLat:    locationLat ?? undefined,
      locationLng:    locationLng ?? undefined,
      minFollowers:   0,
      contentType:    form.goals[0] ?? '',
      deliverables:   summarizeDeliverables(form.deliverables, form.goals, t),
      deadline:       form.deadline!.toISOString(),
      budgetMin:      budget.min,
      budgetMax:      budget.max,
      paymentType:    budget.payment,
      creatorsNeeded: form.creatorsNeeded,
      isFeatured:     form.isFeatured,
      campaignType:   'PAID_CAMPAIGN' as const,
      objective:            form.objective || undefined,
      contentGuidelines:    form.contentGuidelines,
      targetAudience:       form.targetAudience,
      hashtags:             form.hashtags,
      aiGenerated:           form.aiGenerated,
      aiPrompt:              form.aiGenerated ? form.aiPrompt : undefined,
      aiSuggestedCategories: form.aiGenerated ? form.aiSuggestedCategories : undefined,
      aiSuggestedPlatforms:  form.aiGenerated ? form.aiSuggestedPlatforms : undefined,
    };
  }

  async function handleSaveDraft() {
    if (form.eventType !== 'PAID_CAMPAIGN' || loading) return;
    setLoading(true);
    try {
      await campaignService.create({ ...buildPaidCampaignPayload(), status: 'DRAFT' });
      showToast(t('createEvent.toastDraftSaved'));
      setTimeout(() => router.replace('/(business)/'), 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.toastDraftFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  function validatePaidReview(): ReviewErrors {
    const errs: ReviewErrors = {};
    if (!form.title.trim())        errs.title    = t('createEvent.errNoTitle');
    if (form.platforms.length < 1) errs.platform = t('createEvent.errNoPlatform');
    else if (form.platforms.length > 3) errs.platform = t('createEvent.errMaxPlatform');
    if (!form.deadline)     errs.deadline = t('createEvent.errNoDeadline');
    if (form.aiBudgetMin < MIN_BUDGET_PER_CREATOR) errs.budget = t('createEvent.errBudgetMin');
    return errs;
  }

  function handleContinueToConfirm() {
    const errs = validatePaidReview();
    if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
    setReviewErrors({});
    setPhase('confirm');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function handlePublish() {
    if (form.eventType === 'PAID_CAMPAIGN') {
      const errs = validatePaidReview();
      if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
      setReviewErrors({});

      setLoading(true);
      try {
        const campaign = await campaignService.create({ ...buildPaidCampaignPayload(), status: 'ACTIVE' });
        showToast(t('createEvent.toastPublished'));
        setPublishedCampaign({ id: campaign.id, category: form.template, lat: locationLat, lng: locationLng, budgetMin: form.aiBudgetMin, budgetMax: form.aiBudgetMax });
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('createEvent.toastPublishFailed'), 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // Open Event publish
      const errs: ReviewErrors = {};
      if (!form.title.trim()) errs.title     = t('createEvent.errNoTitle');
      if (!form.eventDate)    errs.eventDate = t('createEvent.errNoEventDate');
      if (!form.deadline)     errs.deadline  = t('createEvent.errNoRegDeadline');
      else if (form.eventDate && form.deadline >= form.eventDate)
        errs.deadline = t('createEvent.errDeadlineOrder');
      if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
      setReviewErrors({});

      setLoading(true);
      try {
        const campaign = await campaignService.create({
          title:          form.title.trim(),
          description:    form.description.trim(),
          template:       form.template,
          featureImageUrl: form.featureImageUrl ?? undefined,
          category:       form.template,
          goals:          ['Event Promotion', 'Brand Awareness'],
          platforms:      form.platforms,
          location:       form.venue.trim() || undefined,
          locationLat:    locationLat ?? undefined,
          locationLng:    locationLng ?? undefined,
          minFollowers:   0,
          contentType:    form.eventContent.join(', ') || 'Event Coverage',
          deliverables:   form.benefits.join(', '),
          deadline:       form.deadline!.toISOString(),
          budgetMin:      0,
          budgetMax:      0,
          paymentType:    'Non-monetary',
          creatorsNeeded: form.capacity,
          isFeatured:     form.isFeatured,
          campaignType:   'OPEN_EVENT',
          capacity:       form.capacity,
          eventDate:      form.eventDate?.toISOString(),
          venue:          form.venue.trim() || undefined,
          benefits:       form.benefits,
        });
        showToast(t('createEvent.toastPublished'));
        setPublishedCampaign({ id: campaign.id, category: form.template, lat: locationLat, lng: locationLng });
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('createEvent.toastPublishFailed'), 'error');
      } finally {
        setLoading(false);
      }
    }
  }

  const selectedTemplate = categoryOptions.find((t) => t.label === form.template);

  const totalPhases = form.eventType === 'PAID_CAMPAIGN' ? 3 : 2;
  const currentPhaseNum = phase === 'setup' ? 1 : phase === 'review' ? 2 : 3;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          onPress={() => {
            if (phase === 'confirm') setPhase('review');
            else if (phase === 'review') setPhase('setup');
            else if (router.canGoBack()) router.back();
            else router.replace('/(business)/');
          }}
          style={[s.backBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
          <Ionicons name={phase === 'setup' ? 'close' : 'chevron-back'} size={22} color={C.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: C.text }]}>{t('createEvent.headerTitle')}</Text>
          <Text style={[s.headerSub, { color: C.textSecondary }]}>
            {phase === 'setup' ? t('createEvent.headerSubSetup') : phase === 'review' ? t('createEvent.headerSubReview') : t('createEvent.headerSubConfirm')}
          </Text>
        </View>
        <View style={[s.phasePill, { backgroundColor: C.primaryLight }]}>
          <Text style={[s.phasePillText, { color: C.brinjal1 }]}>{currentPhaseNum}/{totalPhases}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[s.progressTrack, { backgroundColor: C.border }]}>
        <View style={[s.progressFill, { width: `${(currentPhaseNum / totalPhases) * 100}%`, backgroundColor: C.brinjal1 }]} />
      </View>

      {/* No `behavior` prop — the ScrollView's `automaticallyAdjustKeyboardInsets` already
          handles iOS precisely on its own; stacking KeyboardAvoidingView's `padding` on top
          of that double-compensates for the same keyboard, pushing content up too far. */}
      <KeyboardAvoidingView style={s.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets>

          {/* ── Phase 1: Setup ── */}
          {phase === 'setup' && (
            <View style={s.content}>

              {/* Event Type Tab Slider */}
              <View style={{ gap: 12 }}>
                <Text style={[s.stepSectionHeading, { color: C.text }]}>{t('createEvent.eventTypeHeading')}</Text>

                {/* Tab bar */}
                <View style={[s.etTabBar, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {([
                    { type: 'PAID_CAMPAIGN' as const, icon: 'cash-outline' as const,     label: t('createEvent.tabPaidEvent') },
                    { type: 'OPEN_EVENT'    as const, icon: 'calendar-outline' as const, label: t('createEvent.tabOpenEvent') },
                  ]).map((tab) => {
                    const sel = form.eventType === tab.type;
                    return (
                      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                        key={tab.type}
                        style={[s.etTab, sel && { backgroundColor: C.brinjal1 }]}
                        onPress={() => { if (form.eventType !== tab.type) resetFormForType(tab.type); }}>
                        <Ionicons name={tab.icon} size={17} color={sel ? '#fff' : C.textSecondary} />
                        <Text style={[s.etTabText, { color: sel ? '#fff' : C.textSecondary }]}>{tab.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Info panel for selected type */}
                <View style={[s.etInfoPanel, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.etInfoSub, { color: C.brinjal1 }]}>
                    {form.eventType === 'PAID_CAMPAIGN' ? t('createEvent.paidEventSub') : t('createEvent.openEventSub')}
                  </Text>
                </View>
              </View>

              {/* Paid Campaign form */}
              {form.eventType === 'PAID_CAMPAIGN' && (
                <>
                  {/* Describe & generate */}
                  <SectionCard title={t('createEvent.aiPromptLabel')} sub={t('createEvent.aiPromptSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={aiPromptText}
                      onChangeText={(v) => setAiPromptText(v.slice(0, 500))}
                      placeholder={aiPlaceholder}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={4}
                      editable={!aiLoading}
                    />
                    <Text style={[ai.charCount, { color: C.textSecondary }]}>{aiPromptText.length}/500</Text>

                    <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiExamplesLabel')}</Text>
                    <View style={ai.chipWrap}>
                      {AI_PROMPT_EXAMPLES.map((ex) => (
                        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                          key={ex}
                          style={[ai.exampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                          onPress={() => setAiPromptText(ex)}
                          disabled={aiLoading}>
                          <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{ex}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </SectionCard>

                  {/* Location */}
                  <SectionCard title={t('createEvent.secLocationTitle')} sub={t('createEvent.secLocationSub')} colors={C}>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[s.locationBtn, { backgroundColor: C.background, borderColor: aiLocationError ? ERROR_RED : C.border }]}
                      onPress={() => setLocationModalOpen(true)}>
                      <Text style={[s.locationBtnTxt, { color: form.location ? C.text : C.textSecondary }]} numberOfLines={2}>
                        {form.location || t('createEvent.locationPlaceholder')}
                      </Text>
                      <Text style={s.locationArrow}>›</Text>
                    </Pressable>
                    {aiLocationError ? <Text style={s.errorText}>{aiLocationError}</Text> : null}
                  </SectionCard>

                  {/* Create Event */}
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    style={[s.generateBtn, { backgroundColor: (!aiPromptText.trim() || aiLoading) ? C.border : C.brinjal1 }]}
                    onPress={handleGenerateWithAi}
                    disabled={!aiPromptText.trim() || aiLoading}>
                    {aiLoading ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={s.generateBtnText}>{t('createEvent.aiModalGenerating')}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.generateBtnText}>{t('createEvent.createEventBtn')}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {/* Open Event form */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Category — same template picker as paid campaign */}
                  <SectionCard title={t('createEvent.secCategoryTitle')} sub={t('createEvent.secCategorySub')} colors={C}>
                    <DropdownPicker
                      value={form.template}
                      onChange={(v) => {
                        update('template', v);
                        if (eventErrors.template) setEventErrors((e) => ({ ...e, template: undefined }));
                      }}
                      options={categoryOptions}
                      placeholder={t('createEvent.selectCategoryPlaceholder')}
                      colors={C}
                      error={eventErrors.template}
                    />
                  </SectionCard>

                  {/* Venue / Location */}
                  <SectionCard title={t('createEvent.secVenueTitle')} sub={t('createEvent.secVenueSub')} colors={C}>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[s.locationBtn, { backgroundColor: C.background, borderColor: eventErrors.venue ? ERROR_RED : C.border }]}
                      onPress={() => setLocationModalOpen(true)}>
                      <Text style={[s.locationBtnTxt, { color: form.venue ? C.text : C.textSecondary }]} numberOfLines={2}>
                        {form.venue || t('createEvent.locationPlaceholder')}
                      </Text>
                      <Text style={s.locationArrow}>›</Text>
                    </Pressable>
                    {eventErrors.venue ? <Text style={s.errorText}>{eventErrors.venue}</Text> : null}
                  </SectionCard>

                  {/* Capacity */}
                  <SectionCard title={t('createEvent.secCapacityTitle')} sub={t('createEvent.secCapacitySub')} colors={C}>
                    <Stepper value={form.capacity} onChange={(v) => update('capacity', v)} min={1} max={500} colors={C} />
                    {eventErrors.capacity && <Text style={s.errorText}>{eventErrors.capacity}</Text>}
                  </SectionCard>

                  {/* Continue hint */}
                  <View style={[s.eventHintBox, { backgroundColor: C.primaryLight }]}>
                    <Ionicons name="information-circle-outline" size={16} color={C.brinjal1} />
                    <Text style={[s.eventHintText, { color: C.brinjal1 }]}>
                      {t('createEvent.eventHintText')}
                    </Text>
                  </View>

                  {/* Continue button */}
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    style={({ pressed }) => [s.generateBtn, { backgroundColor: C.brinjal1, opacity: pressed ? 0.88 : 1 }]}
                    onPress={handleContinueEvent}>
                    <Text style={s.generateBtnText}>{t('createEvent.generateContinueBtn')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* ── Phase 2: Review ── */}
          {phase === 'review' && (
            <View style={s.content}>

              {/* Paid Campaign review */}
              {form.eventType === 'PAID_CAMPAIGN' && (
                <>
                  {/* Step 2 review header */}
                  <View style={[s.reviewBanner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                    <Text style={[s.reviewBannerHeading, { color: C.text }]}>{t('createEvent.paidBannerSub')}</Text>
                  </View>

                  {/* Editable title */}
                  <SectionCard title={t('createEvent.secEventTitlePaid')} colors={C}>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: reviewErrors.title ? ERROR_RED : C.border, color: C.text }]}
                      value={form.title}
                      onChangeText={(v) => {
                        update('title', v);
                        if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined }));
                      }}
                      placeholder={t('createEvent.eventTitlePlaceholder')}
                      placeholderTextColor={C.textSecondary}
                    />
                    {reviewErrors.title && <Text style={s.errorText}>{reviewErrors.title}</Text>}
                  </SectionCard>

                  {/* Feature image */}
                  <SectionCard title={t('createEvent.secFeatureImageTitle')} sub={t('createEvent.secFeatureImageSub')} colors={C}>
                    <FeatureImagePicker
                      imageUrl={form.featureImageUrl}
                      category={form.template}
                      uploading={featureImageUploading}
                      onPick={handlePickFeatureImage}
                      onClear={handleClearFeatureImage}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Editable description */}
                  <SectionCard colors={C}>
                    <View style={s.descHeaderRow}>
                      <Text style={[sc.title, s.descHeaderText, { color: C.text }]}>{t('createEvent.secDescPaid')}</Text>
                      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                        style={[s.suggestBtn, { borderColor: C.brinjal1, opacity: descSuggestLoading ? 0.6 : 1 }]}
                        onPress={handleSuggestDescription}
                        disabled={descSuggestLoading}>
                        {descSuggestLoading
                          ? <ActivityIndicator size="small" color={C.brinjal1} />
                          : <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.suggestDescriptionBtn')}</Text>}
                      </Pressable>
                    </View>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder={t('createEvent.descriptionPlaceholder')}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Objective */}
                  <SectionCard title={t('createEvent.secObjectiveTitle')} sub={t('createEvent.secObjectiveSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text, minHeight: 70 }]}
                      value={form.objective}
                      onChangeText={(v) => update('objective', v)}
                      multiline
                      placeholderTextColor={C.textSecondary}
                    />
                  </SectionCard>

                  {/* Goal */}
                  <SectionCard title={t('createEvent.secGoalsTitle')} sub={t('createEvent.secGoalsSub')} colors={C}>
                    <ChipGroup
                      options={GOAL_OPTIONS}
                      value={form.goals[0] ?? GOAL_OPTIONS[0]!}
                      onChange={(v) => update('goals', [v])}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Target Audience */}
                  <SectionCard title={t('createEvent.secTargetAudienceTitle')} sub={t('createEvent.secTargetAudienceSub')} colors={C}>
                    <ChipMultiGroup
                      options={CREATOR_TYPES}
                      values={form.targetAudience}
                      onChange={(v) => update('targetAudience', v)}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Platform */}
                  <SectionCard title={t('createEvent.secPlatformTitle')} sub={t('createEvent.secPlatformSub')} colors={C}>
                    <PlatformChipGroup
                      options={platformOptions}
                      values={form.platforms}
                      onChange={(v) => {
                        update('platforms', v);
                        if (reviewErrors.platform) setReviewErrors((e) => ({ ...e, platform: undefined }));
                      }}
                      colors={C}
                      error={reviewErrors.platform}
                      max={3}
                    />
                  </SectionCard>

                  {/* Deliverables */}
                  <SectionCard title={t('createEvent.secDeliverablesTitle')} sub={t('createEvent.secDeliverablesSub')} colors={C}>
                    <DeliverablesCounterList
                      value={form.deliverables}
                      onChange={(v) => update('deliverables', v)}
                      colors={C}
                      t={t}
                    />
                  </SectionCard>

                  {/* Hashtags */}
                  <SectionCard title={t('createEvent.secHashtagsTitle')} colors={C}>
                    <HashtagEditor
                      hashtags={form.hashtags}
                      onChange={(v) => update('hashtags', v)}
                      colors={C}
                      t={t}
                    />
                  </SectionCard>

                  {/* Budget */}
                  <SectionCard title={t('createEvent.secBudgetTitle')} sub={t('createEvent.secBudgetSub')} colors={C}>
                    <BudgetTierPicker
                      budgetMin={form.aiBudgetMin}
                      budgetMax={form.aiBudgetMax}
                      onChange={(min, max) => {
                        update('aiBudgetMin', min);
                        update('aiBudgetMax', max);
                        if (reviewErrors.budget) setReviewErrors((e) => ({ ...e, budget: undefined }));
                      }}
                      colors={C}
                      error={reviewErrors.budget}
                    />
                  </SectionCard>

                  {/* Applications Close */}
                  <SectionCard title={t('createEvent.secDeadlineTitle')} sub={t('createEvent.secDeadlineSub')} colors={C}>
                    <DeadlinePicker
                      value={form.deadline}
                      onChange={(d) => {
                        update('deadline', d);
                        if (reviewErrors.deadline) setReviewErrors((e) => ({ ...e, deadline: undefined }));
                      }}
                      error={reviewErrors.deadline}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Creators Needed */}
                  <SectionCard title={t('createEvent.secCreatorsNeededTitle')} sub={t('createEvent.secCreatorsNeededSub')} colors={C}>
                    <Stepper value={form.creatorsNeeded} onChange={(v) => update('creatorsNeeded', v)} colors={C} />
                  </SectionCard>

                  {/* Featured toggle */}
                  <FeaturedToggle
                    value={form.isFeatured}
                    onChange={(v) => update('isFeatured', v)}
                    quota={featuredQuota}
                    colors={C}
                  />

                  {/* Save as Draft */}
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    style={[s.draftBtn, { borderColor: C.border, opacity: loading ? 0.6 : 1 }]}
                    onPress={handleSaveDraft}
                    disabled={loading}>
                    <Ionicons name="save-outline" size={16} color={C.textSecondary} />
                    <Text style={[s.draftBtnText, { color: C.textSecondary }]}>{t('createEvent.saveDraftBtn')}</Text>
                  </Pressable>

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[s.editBtn, { borderColor: C.brinjal1 }]}
                      onPress={() => setPhase('setup')}>
                      <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.editInputsBtn')}</Text>
                    </Pressable>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[s.publishBtn, { backgroundColor: C.brinjal1 }]}
                      onPress={handleContinueToConfirm}>
                      <Text style={s.publishBtnText}>{t('createEvent.continueToReviewBtn')}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </Pressable>
                  </View>
                </>
              )}

              {/* Open Event review */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Review header */}
                  <View style={[s.reviewBanner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                    <Ionicons name="eye-outline" size={20} color={C.brinjal1} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.reviewBannerTitle, { color: C.text }]}>{t('createEvent.openBannerTitle')}</Text>
                      <Text style={[s.reviewBannerSub, { color: C.textSecondary }]}>{t('createEvent.openBannerSub')}</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <SectionCard title={t('createEvent.secEventTitleOpen')} sub={t('createEvent.secEventTitleOpenSub')} colors={C}>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: reviewErrors.title ? ERROR_RED : C.border, color: C.text }]}
                      value={form.title}
                      onChangeText={(v) => { update('title', v); if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined })); }}
                      placeholder={t('createEvent.eventTitlePlaceholder')}
                      placeholderTextColor={C.textSecondary}
                    />
                    {reviewErrors.title && <Text style={s.errorText}>{reviewErrors.title}</Text>}
                  </SectionCard>

                  {/* Feature image */}
                  <SectionCard title={t('createEvent.secFeatureImageTitle')} sub={t('createEvent.secFeatureImageSub')} colors={C}>
                    <FeatureImagePicker
                      imageUrl={form.featureImageUrl}
                      category={form.template}
                      uploading={featureImageUploading}
                      onPick={handlePickFeatureImage}
                      onClear={handleClearFeatureImage}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Description */}
                  <SectionCard colors={C}>
                    <View style={s.descHeaderRow}>
                      <View style={s.descHeaderText}>
                        <Text style={[sc.title, { color: C.text }]}>{t('createEvent.secDescOpen')}</Text>
                        <Text style={[sc.sub, { color: C.textSecondary }]}>{t('createEvent.secDescOpenSub')}</Text>
                      </View>
                      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                        style={[s.suggestBtn, { borderColor: C.brinjal1, opacity: descSuggestLoading ? 0.6 : 1 }]}
                        onPress={handleSuggestDescription}
                        disabled={descSuggestLoading}>
                        {descSuggestLoading
                          ? <ActivityIndicator size="small" color={C.brinjal1} />
                          : <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.suggestDescriptionBtn')}</Text>}
                      </Pressable>
                    </View>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder={t('createEvent.eventDescPlaceholder')}
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Creator Benefits — auto-selected, editable */}
                  <SectionCard title={t('createEvent.secBenefitsTitle')} sub={t('createEvent.secBenefitsSub')} colors={C}>
                    <View style={cg.wrap}>
                      {BENEFITS.map((benefit) => {
                        const checked = form.benefits.includes(benefit);
                        return (
                          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                            key={benefit}
                            style={[cg.chip, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.primaryLight : C.surface }]}
                            onPress={() => {
                              const next = checked
                                ? form.benefits.filter((b) => b !== benefit)
                                : [...form.benefits, benefit];
                              update('benefits', next);
                            }}>
                            <Text style={[cg.chipText, { color: checked ? C.brinjal1 : C.textSecondary, fontWeight: checked ? '700' : '500' }]}>{benefit}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </SectionCard>

                  {/* Platform (optional) */}
                  <SectionCard title={t('createEvent.secPlatformOptTitle')} sub={t('createEvent.secPlatformOptSub')} colors={C}>
                    <ChipGroup
                      options={['Instagram', 'TikTok', 'YouTube', 'Facebook', notRequiredLabel]}
                      value={form.platforms[0] ?? notRequiredLabel}
                      onChange={(v) => update('platforms', v === notRequiredLabel ? [] : [v])}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Event Date */}
                  <SectionCard title={t('createEvent.secEventDateTitle')} sub={t('createEvent.secEventDateSub')} colors={C}>
                    <DeadlinePicker
                      value={form.eventDate}
                      onChange={(d) => {
                        const twoDaysBefore = d ? dayStart(new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000)) : null;
                        setForm((prev) => ({ ...prev, eventDate: d, deadline: twoDaysBefore }));
                        if (reviewErrors.eventDate) setReviewErrors((e) => ({ ...e, eventDate: undefined, deadline: undefined }));
                      }}
                      error={reviewErrors.eventDate}
                      colors={C}
                      label={t('createEvent.deadlineLabelEvent')}
                    />
                  </SectionCard>

                  {/* Registration Deadline — auto-set to eventDate - 2 days */}
                  <SectionCard title={t('createEvent.secRegDeadlineTitle')} sub={t('createEvent.secRegDeadlineSub')} colors={C}>
                    <DeadlinePicker
                      value={form.deadline}
                      onChange={(d) => {
                        update('deadline', d);
                        if (reviewErrors.deadline) setReviewErrors((e) => ({ ...e, deadline: undefined }));
                      }}
                      error={reviewErrors.deadline}
                      colors={C}
                      label={t('createEvent.deadlineLabelReg')}
                    />
                  </SectionCard>

                  {/* Event summary */}
                  <SectionCard title={t('createEvent.secEventSummaryTitle')} colors={C}>
                    {[
                      { label: t('createEvent.summaryCategory'), value: form.template || '—' },
                      { label: t('createEvent.summaryVenue'),    value: form.venue || t('createEvent.summaryTBD') },
                      { label: t('createEvent.summaryDate'),     value: form.eventDate ? fmtDate(form.eventDate) : '—' },
                      { label: t('createEvent.summaryCapacity'), value: t('createEvent.summaryNCreators', { n: form.capacity }) },
                    ].map(({ label, value }, i, arr) => (
                      <View key={label} style={[s.summaryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <Text style={[s.summaryLabel, { color: C.textSecondary }]}>{label}</Text>
                        <Text style={[s.summaryValue, { color: C.text }]} numberOfLines={2}>{value}</Text>
                      </View>
                    ))}
                  </SectionCard>

                  {/* Featured toggle */}
                  <FeaturedToggle
                    value={form.isFeatured}
                    onChange={(v) => update('isFeatured', v)}
                    quota={featuredQuota}
                    colors={C}
                  />

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.editBtn, { borderColor: C.brinjal1 }]} onPress={() => setPhase('setup')}>
                      <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.editEventBtn')}</Text>
                    </Pressable>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                      onPress={() => setPublishWarnVisible(true)}
                      disabled={loading}>
                      <Text style={s.publishBtnText}>{loading ? t('createEvent.publishingBtn') : t('createEvent.publishOpenBtn')}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── Phase 3: Confirm (PAID_CAMPAIGN only, Airbnb-style final review) ── */}
          {phase === 'confirm' && form.eventType === 'PAID_CAMPAIGN' && (
            <View style={s.content}>
              <ListingHeroCard
                featureImageUrl={form.featureImageUrl}
                title={form.title.trim() || t('createEvent.untitledEvent')}
                category={selectedTemplate ? form.template : undefined}
                colors={C}
              />

              <View style={{ gap: 2 }}>
                <PreviewRow icon="location-outline" label={t('createEvent.summaryLocation')} value={form.location || t('createEvent.summaryRemote')} colors={C} />
                <PreviewRow icon="people-outline" label={t('createEvent.confirmSectionWho')} value={form.targetAudience.join(', ') || '—'} colors={C} />
                <PreviewRow icon="share-social-outline" label={t('createEvent.confirmSectionPlatforms')} value={form.platforms.join(', ') || '—'} colors={C} />
                <PreviewRow icon="film-outline" label={t('createEvent.confirmSectionDeliverables')} value={summarizeDeliverables(form.deliverables, form.goals, t)} colors={C} />
                <PreviewRow icon="cash-outline" label={t('createEvent.confirmSectionBudget')} value={`Rs. ${form.aiBudgetMin.toLocaleString()} – ${form.aiBudgetMax.toLocaleString()}`} colors={C} />
                <PreviewRow icon="calendar-outline" label={t('createEvent.confirmSectionCloses')} value={form.deadline ? fmtDate(form.deadline) : '—'} colors={C} />
                <PreviewRow icon="star-outline" label={t('createEvent.confirmSectionFeatured')} value={form.isFeatured ? t('createEvent.yes') : t('createEvent.no')} colors={C} last />
              </View>

              {/* Actions */}
              <View style={s.reviewActions}>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[s.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => setPhase('review')}>
                  <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                  <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.backToEditBtn')}</Text>
                </Pressable>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                  onPress={handlePublish}
                  disabled={loading}>
                  <Text style={s.publishBtnText}>{loading ? t('createEvent.publishingBtn') : t('createEvent.publishPaidBtn')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pre-publish warning modal */}
      <Modal visible={publishWarnVisible} transparent animationType="fade" onRequestClose={() => setPublishWarnVisible(false)}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.warnScrim} onPress={() => setPublishWarnVisible(false)}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.warnSheet, { backgroundColor: C.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.warnIconWrap}>
              <Ionicons name="warning" size={32} color="#F59E0B" />
            </View>
            <Text style={[s.warnTitle, { color: C.text }]}>{t('createEvent.warnTitle')}</Text>
            <Text style={[s.warnBody, { color: C.textSecondary }]}>
              {t('createEvent.warnBodyPre')}<Text style={{ fontWeight: '700', color: C.text }}>{t('createEvent.warnBodyBold')}</Text>{t('createEvent.warnBodyPost')}
            </Text>
            <View style={s.warnActions}>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.warnCancelBtn, { borderColor: C.border }]} onPress={() => setPublishWarnVisible(false)}>
                <Text style={[s.warnCancelText, { color: C.textSecondary }]}>{t('createEvent.warnGoBack')}</Text>
              </Pressable>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[s.warnConfirmBtn, { backgroundColor: C.brinjal1 }]}
                onPress={() => { setPublishWarnVisible(false); handlePublish(); }}>
                <Text style={s.warnConfirmText}>{t('createEvent.warnPublishNow')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LocationSearchModal
        visible={locationModalOpen}
        initialValue={form.eventType === 'OPEN_EVENT' ? form.venue : form.location}
        onSelect={handleLocationSelect}
        onClose={() => setLocationModalOpen(false)}
      />

      <AiGeneratingOverlay visible={aiLoading} t={t} />

      {/* Recommended creators — shown right after publishing */}
      <RecommendedCreatorsModal
        visible={!!publishedCampaign}
        campaignId={publishedCampaign?.id ?? null}
        category={publishedCampaign?.category ?? ''}
        lat={publishedCampaign?.lat}
        lng={publishedCampaign?.lng}
        budgetMin={publishedCampaign?.budgetMin}
        budgetMax={publishedCampaign?.budgetMax}
        onDone={handleRecommendedDone}
      />

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[s.toast, { opacity: toastOpacity, backgroundColor: toast.type === 'success' ? '#22C55E' : '#EF4444' }]}
          pointerEvents="none">
          <Ionicons name={toast.type === 'success' ? 'checkmark-circle' : 'close-circle'} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  flex:      { flex: 1 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:      { width: 40, height: 40, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontFamily: F.bold },
  headerSub:    { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  phasePill:    { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  phasePillText:{ fontSize: 12, fontFamily: F.bold },

  progressTrack:{ height: 3 },
  progressFill: { height: 3 },

  scroll:   { padding: 18, paddingBottom: 48 },
  content:  { gap: 14 },

  input:     { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  textarea:  { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 120, textAlignVertical: 'top', fontFamily: F.regular },
  errorText: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },

  // Tap-to-open location field — same pattern as the profile location editor
  // and the "search creators" location filter, both backed by LocationSearchModal.
  locationBtn:    { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
  locationBtnTxt: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: F.regular },
  locationArrow:  { fontSize: 20, color: '#9CA3AF' },

  descHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  descHeaderText: { flex: 1 },
  suggestBtn:     { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  suggestBtnText: { fontSize: 12, fontFamily: F.bold },

  generateBtn:     { borderRadius: RADIUS.md, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, ...SHADOW.raised },
  generateBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },

  reviewBanner:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: RADIUS.md, borderLeftWidth: 3, paddingVertical: 14, paddingHorizontal: 14 },
  reviewBannerTitle: { fontSize: 14, fontFamily: F.bold },
  reviewBannerSub:   { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },
  reviewBannerHeading: { fontSize: 17, fontFamily: F.bold, lineHeight: 23 },

  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  summaryLabel: { fontSize: 13, fontFamily: F.regular, width: 72 },
  summaryValue: { flex: 1, fontSize: 13, fontFamily: F.semibold, textAlign: 'right' },

  draftBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: RADIUS.md, height: 50, borderWidth: 1.5, marginTop: 8 },
  draftBtnText:  { fontSize: 14, fontFamily: F.semibold },
  reviewActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: RADIUS.md, height: 54, borderWidth: 1.5 },
  editBtnText:   { fontSize: 14, fontFamily: F.bold },
  publishBtn:    { flex: 2, flexDirection: 'row', gap: 6, borderRadius: RADIUS.md, height: 54, justifyContent: 'center', alignItems: 'center', ...SHADOW.raised },
  publishBtnText:{ color: '#fff', fontSize: 15, fontFamily: F.bold },

  warnScrim:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  warnSheet:       { width: '100%', borderRadius: RADIUS.xl, padding: 24, alignItems: 'center', ...SHADOW.floating },
  warnIconWrap:    { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: '#FFF8E8', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  warnTitle:       { fontSize: 18, fontFamily: F.bold, marginBottom: 12, textAlign: 'center' },
  warnBody:        { fontSize: 14, fontFamily: F.regular, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  warnActions:     { flexDirection: 'row', gap: 10, width: '100%' },
  warnCancelBtn:   { flex: 1, borderRadius: RADIUS.md, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center' },
  warnCancelText:  { fontSize: 13, fontFamily: F.semibold },
  warnConfirmBtn:  { flex: 1, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  warnConfirmText: { color: '#fff', fontSize: 13, fontFamily: F.bold },

  toast:     { position: 'absolute', bottom: 40, left: 20, right: 20, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', ...SHADOW.floating },
  toastText: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.bold },

  stepSectionHeading: { fontSize: 15, fontFamily: F.bold },
  stepSectionSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18, marginBottom: 4 },

  // Event type tab slider
  etTabBar:  { flexDirection: 'row', borderRadius: RADIUS.md, borderWidth: 1.5, padding: 4, gap: 4 },
  etTab:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: RADIUS.sm },
  etTabText: { fontSize: 14, fontFamily: F.bold },

  // Event type info panel
  etInfoPanel: { borderRadius: RADIUS.md, padding: 12 },
  etInfoSub:   { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },

  eventHintBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: RADIUS.md, padding: 14 },
  eventHintText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: F.regular },

});

const ai = StyleSheet.create({
  charCount:    { fontSize: 11, fontFamily: F.regular, textAlign: 'right', marginTop: 4 },
  exampleLabel: { fontSize: 11, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  exampleChip:  { borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  exampleChipText: { fontSize: 12, fontFamily: F.regular },
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
