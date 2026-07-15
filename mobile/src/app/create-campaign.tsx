import { router } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { profileService } from '@/services/profile';
import { useCategories } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';
import { getTemplateImage, DEFAULT_TEMPLATE_IMAGE } from '@/features/creator/data/templateImages';
import { PlacesAutocompleteInput, type PlacePrediction } from '@/components/PlacesAutocompleteInput';
import { pickAndUpload } from '@/utilities/uploadImage';
import { RecommendedCreatorsModal } from '@/features/business/components/RecommendedCreatorsModal';
import { F, buildPlaceDetailsUrl } from '@/utilities/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const CREATOR_TYPES = [
  'Food Creator',
  'Travel Creator',
  'Lifestyle Creator',
  'Fashion Creator',
  'Tech Creator',
  'Fitness Creator',
  'Student Creator',
  'Any Creator',
];

const AI_PROMPT_EXAMPLES = [
  "I want to promote my cafe's new iced coffee.",
  "We're launching a new clothing collection for Dashain.",
  "Looking for travel creators to showcase our hotel in Pokhara.",
  "Need 5 food creators to review our momo restaurant.",
  'Promote our mobile app to university students.',
];

const DELIVERABLE_TYPES: { key: string; labelKey: string }[] = [
  { key: 'REEL',                  labelKey: 'createEvent.deliverableReel' },
  { key: 'STORY',                 labelKey: 'createEvent.deliverableStory' },
  { key: 'PHOTO_POST',            labelKey: 'createEvent.deliverablePhotoPost' },
  { key: 'CAROUSEL_POST',         labelKey: 'createEvent.deliverableCarouselPost' },
  { key: 'VISIT_STORE',           labelKey: 'createEvent.deliverableVisitStore' },
  { key: 'PRODUCT_REVIEW_VIDEO',  labelKey: 'createEvent.deliverableProductReviewVideo' },
  { key: 'EVENT_COVERAGE_VIDEO',  labelKey: 'createEvent.deliverableEventCoverageVideo' },
  { key: 'MENTION_IN_CAPTION',    labelKey: 'createEvent.deliverableMentionInCaption' },
  { key: 'TAG_BUSINESS',          labelKey: 'createEvent.deliverableTagBusiness' },
  { key: 'GOOGLE_REVIEW',         labelKey: 'createEvent.deliverableGoogleReview' },
];

const DEFAULT_DELIVERABLES: Record<string, number> = Object.fromEntries(
  DELIVERABLE_TYPES.map((d) => [d.key, 0])
);

function summarizeDeliverables(deliverables: Record<string, number>, fallback: string[], t: TFn): string {
  const parts = DELIVERABLE_TYPES
    .filter((d) => (deliverables[d.key] ?? 0) > 0)
    .map((d) => `${deliverables[d.key]} ${t(d.labelKey)}`);
  return parts.length > 0 ? parts.join(', ') : fallback.join(', ');
}

const ERROR_RED = '#EF4444';

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
  callToAction: string;
  approvalRequirements: string;
  aiGenerated: boolean;
  aiPrompt: string;
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  needsInput: string[];
  aiBudgetMin: number;
  aiBudgetMax: number;
  aiDeliverables: string;
};

type ReviewErrors = Partial<Record<'title' | 'deadline' | 'platform' | 'eventDate', string>>;
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
  trigger:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  triggerThumb: { width: 30, height: 30, borderRadius: 8 },
  triggerText:  { flex: 1, fontSize: 14, fontFamily: F.medium },
  error:        { fontSize: 12, color: ERROR_RED, fontFamily: F.regular, marginTop: 4 },
  modalWrap:  { flex: 1, justifyContent: 'flex-end' },
  scrim:      { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  sheetTitle: { fontSize: 16, fontFamily: F.bold, marginBottom: 12 },
  item:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  itemThumbWrap:{ width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
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
  badge:      { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  badgeText:  { fontSize: 11, color: '#fff', fontFamily: F.bold },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  done:       { fontSize: 15, fontFamily: F.bold },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
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
  row:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  outer: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  inner: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontSize: 14 },
  error: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },
});

// ─── ChipMultiGroup ───────────────────────────────────────────────────────────

function ChipMultiGroup({
  values, onChange, options, colors, error,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  function toggle(opt: string) {
    if (opt === 'Any Creator') { onChange(['Any Creator']); return; }
    const next = values.filter((v) => v !== 'Any Creator');
    if (next.includes(opt)) onChange(next.filter((v) => v !== opt));
    else onChange([...next, opt]);
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = values.includes(opt);
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={opt}
              style={[cg.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.surface }]}
              onPress={() => toggle(opt)}>
              <Text style={[cg.chipText, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={cg.error}>{error}</Text>}
    </View>
  );
}

const cg = StyleSheet.create({
  wrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: F.medium },
  error:    { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },
});

// ─── ChipGroup (single select) ────────────────────────────────────────────────

function ChipGroup({
  options, value, onChange, colors, error,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = value === opt;
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={opt}
              style={[cg.chip, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.primaryLight : C.surface }]}
              onPress={() => onChange(opt)}>
              <Text style={[cg.chipText, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={cg.error}>{error}</Text>}
    </View>
  );
}

// ─── PlatformChipGroup (multi-select, capped) ──────────────────────────────────

function PlatformChipGroup({
  options, values, onChange, colors, error, max,
}: {
  options: readonly string[];
  values: string[];
  onChange: (v: string[]) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
  max: number;
}) {
  const C = colors;
  function toggle(opt: string) {
    if (values.includes(opt)) { onChange(values.filter((v) => v !== opt)); return; }
    if (values.length >= max) return;
    onChange([...values, opt]);
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={cg.wrap}>
        {options.map((opt) => {
          const sel = values.includes(opt);
          const disabled = !sel && values.length >= max;
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={opt}
              disabled={disabled}
              style={[cg.chip, {
                borderColor: sel ? C.brinjal1 : C.border,
                backgroundColor: sel ? C.primaryLight : C.surface,
                opacity: disabled ? 0.4 : 1,
              }]}
              onPress={() => toggle(opt)}>
              <Text style={[cg.chipText, { color: sel ? C.brinjal1 : C.textSecondary, fontWeight: sel ? '700' : '500' }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text style={cg.error}>{error}</Text>}
    </View>
  );
}

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
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
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
              <View style={[{ borderRadius: 10, padding: 10, marginTop: 12, backgroundColor: C.primaryLight }]}>
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

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 1, max = 50, colors }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const { t } = useLanguage();
  return (
    <View style={[st.wrap, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[st.btn, { backgroundColor: value <= min ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Text style={[st.btnTxt, { color: value <= min ? C.border : C.brinjal1 }]}>−</Text>
      </Pressable>
      <View style={st.center}>
        <Text style={[st.value, { color: C.brinjal1 }]}>{value}</Text>
        <Text style={[st.unit, { color: C.textSecondary }]}>{value !== 1 ? t('createEvent.stepperCreators') : t('createEvent.stepperCreator')}</Text>
      </View>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[st.btn, { backgroundColor: value >= max ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Text style={[st.btnTxt, { color: value >= max ? C.border : C.brinjal1 }]}>+</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  btn:    { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { fontSize: 24, lineHeight: 28, fontFamily: F.regular },
  center: { flex: 1, alignItems: 'center' },
  value:  { fontSize: 24, fontFamily: F.bold },
  unit:   { fontSize: 11, marginTop: 1, fontFamily: F.medium },
});

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, sub, children, colors }: {
  title?: string; sub?: string; children: React.ReactNode; colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  return (
    <View style={[sc.card, { backgroundColor: C.surface }]}>
      {title && <Text style={[sc.title, { color: C.text }]}>{title}</Text>}
      {sub && <Text style={[sc.sub, { color: C.textSecondary }]}>{sub}</Text>}
      {children}
    </View>
  );
}

// ─── FeatureImagePicker ───────────────────────────────────────────────────────

function FeatureImagePicker({ imageUrl, category, uploading, onPick, onClear, colors }: {
  imageUrl: string | null; category: string; uploading: boolean; onPick: () => void; onClear: () => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const previewImage = imageUrl ?? getTemplateImage(category, category) ?? DEFAULT_TEMPLATE_IMAGE;

  return (
    <View style={fi.wrap}>
      <View style={fi.preview}>
        <Image source={{ uri: previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {imageUrl && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[fi.clearBtn, { opacity: uploading ? 0.5 : 1 }]} onPress={onClear} disabled={uploading}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        )}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[fi.cameraBtn, { backgroundColor: C.brinjal1, opacity: uploading ? 0.7 : 1 }]}
          onPress={onPick}
          disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color="#fff" />
            : <FontAwesome5 name="camera" size={14} color="#fff" solid />}
        </Pressable>
      </View>
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:    { alignItems: 'center' },
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  cameraBtn: {
    position: 'absolute', bottom: 10, right: 10,
    width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  clearBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.65)',
  },
});

const sc = StyleSheet.create({
  card:  { borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  title: { fontSize: 14, fontFamily: F.bold },
  sub:   { fontSize: 12, lineHeight: 18, fontFamily: F.regular },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCampaignScreen() {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const notRequiredLabel = t('createEvent.notRequired');
  const [phase, setPhase] = useState<'setup' | 'review'>('setup');
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
    callToAction: '',
    approvalRequirements: '',
    aiGenerated: false,
    aiPrompt: '',
    aiSuggestedCategories: [],
    aiSuggestedPlatforms: [],
    needsInput: [],
    aiBudgetMin: 0,
    aiBudgetMax: 0,
    aiDeliverables: '',
  });

  const [aiPromptText, setAiPromptText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlaceholder] = useState(() => AI_PROMPT_EXAMPLES[Math.floor(Math.random() * AI_PROMPT_EXAMPLES.length)]);
  const [aiLocationError, setAiLocationError] = useState<string | undefined>();
  const [newHashtag, setNewHashtag] = useState('');
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

  async function handleLocationSelect(place: PlacePrediction) {
    try {
      const res = await fetch(buildPlaceDetailsUrl(place.place_id));
      const json = await res.json();
      if (json.status === 'OK') {
        setLocationLat(json.result.geometry.location.lat);
        setLocationLng(json.result.geometry.location.lng);
      }
    } catch { /* lat/lng just won't be captured — location text still saves fine */ }
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
      callToAction: '',
      approvalRequirements: '',
      aiGenerated: false,
      aiPrompt: '',
      aiSuggestedCategories: [],
      aiSuggestedPlatforms: [],
      needsInput: [],
      aiBudgetMin: 0,
      aiBudgetMax: 0,
      aiDeliverables: '',
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
        goals:       prev.goals.length > 0 ? prev.goals : ['Brand Awareness'],
        budget:      '',
        creatorsNeeded: draft.creatorsNeeded,
        deadline:    dayStart(new Date(Date.now() + draft.suggestedDurationDays * 24 * 60 * 60 * 1000)),
        objective:            draft.objective,
        contentGuidelines:    draft.contentGuidelines,
        targetAudience:       draft.targetAudience,
        hashtags:             draft.hashtags,
        sampleCaption:        draft.sampleCaption,
        callToAction:         draft.callToAction,
        approvalRequirements: draft.approvalRequirements,
        aiDeliverables:       draft.deliverables,
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
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.aiGenerateFailed'), 'error');
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
      deliverables:   form.aiGenerated ? form.aiDeliverables : summarizeDeliverables(form.deliverables, form.goals, t),
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
      callToAction:         form.callToAction || undefined,
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

  async function handlePublish() {
    if (form.eventType === 'PAID_CAMPAIGN') {
      const errs: ReviewErrors = {};
      if (!form.title.trim())        errs.title    = t('createEvent.errNoTitle');
      if (form.platforms.length < 1) errs.platform = t('createEvent.errNoPlatform');
      else if (form.platforms.length > 3) errs.platform = t('createEvent.errMaxPlatform');
      if (!form.deadline)     errs.deadline = t('createEvent.errNoDeadline');
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

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          onPress={() => phase === 'review' ? setPhase('setup') : (router.canGoBack() ? router.back() : router.replace('/(business)/'))}
          style={[s.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name={phase === 'review' ? 'chevron-back' : 'close'} size={22} color="#fff" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('createEvent.headerTitle')}</Text>
          <Text style={s.headerSub}>{phase === 'setup' ? t('createEvent.headerSubSetup') : t('createEvent.headerSubReview')}</Text>
        </View>
        <View style={[s.phasePill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={s.phasePillText}>{phase === 'setup' ? '1/2' : '2/2'}</Text>
        </View>
      </LinearGradient>

      {/* Progress */}
      <View style={[s.progressTrack, { backgroundColor: C.border }]}>
        <View style={[s.progressFill, { width: phase === 'setup' ? '50%' : '100%', backgroundColor: C.brinjal1 }]} />
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                    <PlacesAutocompleteInput
                      value={form.location}
                      onChangeText={(v) => { update('location', v); setLocationLat(null); setLocationLng(null); if (aiLocationError) setAiLocationError(undefined); }}
                      onSelectPlace={handleLocationSelect}
                      placeholder={t('createEvent.locationPlaceholder')}
                      types="geocode"
                      error={aiLocationError}
                    />
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
                    <PlacesAutocompleteInput
                      value={form.venue}
                      onChangeText={(v) => { update('venue', v); setLocationLat(null); setLocationLng(null); if (eventErrors.venue) setEventErrors((e) => ({ ...e, venue: undefined })); }}
                      onSelectPlace={handleLocationSelect}
                      placeholder={t('createEvent.locationPlaceholder')}
                      types="geocode"
                      error={eventErrors.venue}
                    />
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

                  {/* Target Audience */}
                  <SectionCard title={t('createEvent.secTargetAudienceTitle')} sub={t('createEvent.secTargetAudienceSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text, minHeight: 70 }]}
                      value={form.targetAudience.join(', ')}
                      onChangeText={(v) => update('targetAudience', v.split(',').map((x) => x.trim()).filter(Boolean))}
                      multiline
                      placeholderTextColor={C.textSecondary}
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
                  {form.aiGenerated ? (
                    <SectionCard title={t('createEvent.secDeliverablesTitle')} sub={t('createEvent.secDeliverablesSub')} colors={C}>
                      <TextInput
                        style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text, minHeight: 70 }]}
                        value={form.aiDeliverables}
                        onChangeText={(v) => update('aiDeliverables', v)}
                        multiline
                        placeholderTextColor={C.textSecondary}
                      />
                    </SectionCard>
                  ) : (
                    <SectionCard title={t('createEvent.secDeliverablesTitle')} sub={t('createEvent.secDeliverablesSub')} colors={C}>
                      <View style={{ gap: 2 }}>
                        {DELIVERABLE_TYPES.map((item, i) => {
                          const count = form.deliverables[item.key] ?? 0;
                          const active = count > 0;
                          return (
                            <View
                              key={item.key}
                              style={[
                                dlv.row,
                                { borderBottomColor: C.border },
                                i === DELIVERABLE_TYPES.length - 1 && { borderBottomWidth: 0 },
                              ]}>
                              <View style={[dlv.bullet, { backgroundColor: active ? C.brinjal1 : C.border }]} />
                              <Text style={[dlv.label, { color: active ? C.text : C.textSecondary, fontFamily: active ? F.semibold : F.regular }]}>
                                {t(item.labelKey)}
                              </Text>
                              <View style={[dlv.counter, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: C.background }]}>
                                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                  style={dlv.counterBtn}
                                  onPress={() => update('deliverables', { ...form.deliverables, [item.key]: Math.max(0, count - 1) })}>
                                  <Text style={[dlv.counterBtnTxt, { color: count <= 0 ? C.border : C.brinjal1 }]}>−</Text>
                                </Pressable>
                                <Text style={[dlv.counterVal, { color: active ? C.brinjal1 : C.textSecondary }]}>{count}</Text>
                                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                  style={dlv.counterBtn}
                                  onPress={() => update('deliverables', { ...form.deliverables, [item.key]: Math.min(10, count + 1) })}>
                                  <Text style={[dlv.counterBtnTxt, { color: C.brinjal1 }]}>+</Text>
                                </Pressable>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </SectionCard>
                  )}

                  {/* Content Guidelines */}
                  <SectionCard title={t('createEvent.secContentGuidelinesTitle')} sub={t('createEvent.secContentGuidelinesSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text, minHeight: 90 }]}
                      value={form.contentGuidelines.join('\n')}
                      onChangeText={(v) => update('contentGuidelines', v.split('\n').map((x) => x.trim()).filter(Boolean))}
                      multiline
                      placeholderTextColor={C.textSecondary}
                    />
                  </SectionCard>

                  {/* Hashtags */}
                  <SectionCard title={t('createEvent.secHashtagsTitle')} colors={C}>
                    <View style={ai.chipWrap}>
                      {form.hashtags.map((tag) => (
                        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                          key={tag}
                          style={[ai.hashtagChip, { borderColor: C.brinjal1, backgroundColor: C.primaryLight }]}
                          onPress={() => update('hashtags', form.hashtags.filter((h) => h !== tag))}>
                          <Text style={[ai.hashtagChipText, { color: C.brinjal1 }]}>#{tag.replace(/^#/, '')}</Text>
                          <Ionicons name="close" size={13} color={C.brinjal1} />
                        </Pressable>
                      ))}
                    </View>
                    <View style={ai.addChip}>
                      <TextInput
                        style={[ai.addChipInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                        value={newHashtag}
                        onChangeText={setNewHashtag}
                        placeholder={t('createEvent.addHashtagPlaceholder')}
                        placeholderTextColor={C.textSecondary}
                        autoCapitalize="none"
                        onSubmitEditing={() => {
                          const v = newHashtag.trim().replace(/^#/, '');
                          if (v && !form.hashtags.includes(v)) update('hashtags', [...form.hashtags, v]);
                          setNewHashtag('');
                        }}
                      />
                      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                        style={[ai.addChipBtn, { backgroundColor: C.brinjal1 }]}
                        onPress={() => {
                          const v = newHashtag.trim().replace(/^#/, '');
                          if (v && !form.hashtags.includes(v)) update('hashtags', [...form.hashtags, v]);
                          setNewHashtag('');
                        }}>
                        <Ionicons name="add" size={20} color="#fff" />
                      </Pressable>
                    </View>
                  </SectionCard>

                  {/* Call to Action */}
                  <SectionCard title={t('createEvent.secCallToActionTitle')} sub={t('createEvent.secCallToActionSub')} colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text, minHeight: 70 }]}
                      value={form.callToAction}
                      onChangeText={(v) => update('callToAction', v)}
                      multiline
                      placeholderTextColor={C.textSecondary}
                    />
                  </SectionCard>

                  {/* AI-only: Budget (raw editable range, replaces preset chips) */}
                  {form.aiGenerated && (
                    <SectionCard title={t('createEvent.secAiBudgetTitle')} sub={t('createEvent.secAiBudgetSub')} colors={C}>
                      <View style={ai.budgetRow}>
                        <View style={ai.budgetInputWrap}>
                          <Text style={[ai.budgetLabel, { color: C.textSecondary }]}>{t('createEvent.aiBudgetMinLabel')}</Text>
                          <TextInput
                            style={[s.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                            value={String(form.aiBudgetMin)}
                            onChangeText={(v) => update('aiBudgetMin', parseInt(v.replace(/[^0-9]/g, ''), 10) || 0)}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={ai.budgetInputWrap}>
                          <Text style={[ai.budgetLabel, { color: C.textSecondary }]}>{t('createEvent.aiBudgetMaxLabel')}</Text>
                          <TextInput
                            style={[s.input, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                            value={String(form.aiBudgetMax)}
                            onChangeText={(v) => update('aiBudgetMax', parseInt(v.replace(/[^0-9]/g, ''), 10) || 0)}
                            keyboardType="number-pad"
                          />
                        </View>
                      </View>
                    </SectionCard>
                  )}

                  {/* Deadline */}
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

                  {/* Summary */}
                  <SectionCard title={t('createEvent.secSummaryTitle')} colors={C}>
                    {[
                      { label: t('createEvent.summaryCategory'), value: selectedTemplate ? form.template : '—' },
                      { label: t('createEvent.summaryGoals'),    value: form.goals.join(', ') || '—' },
                      { label: t('createEvent.summaryBudget'),   value: `Rs. ${form.aiBudgetMin.toLocaleString()} – ${form.aiBudgetMax.toLocaleString()}` },
                      { label: t('createEvent.summaryLocation'), value: form.location || t('createEvent.summaryRemote') },
                    ].map(({ label, value }, i, arr) => (
                      <View key={label} style={[s.summaryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <Text style={[s.summaryLabel, { color: C.textSecondary }]}>{label}</Text>
                        <Text style={[s.summaryValue, { color: C.text }]} numberOfLines={2}>{value}</Text>
                      </View>
                    ))}
                  </SectionCard>

                  {/* Featured toggle */}
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    style={[s.featuredToggle, { backgroundColor: form.isFeatured ? '#FFF8E8' : C.surface, borderColor: form.isFeatured ? '#F59E0B' : C.border }]}
                    onPress={() => update('isFeatured', !form.isFeatured)}>
                    <View style={s.featuredLeft}>
                      <FontAwesome5 name="star" size={18} color="#F59E0B" solid />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[s.featuredLabel, { color: C.text }]}>{t('createEvent.featuredLabel')}</Text>
                        <Text style={[s.featuredSub, { color: C.textSecondary }]}>{t('createEvent.featuredSub')}</Text>
                      </View>
                    </View>
                    <View style={[s.toggle, { backgroundColor: form.isFeatured ? '#F59E0B' : C.border }]}>
                      <View style={[s.toggleThumb, { left: form.isFeatured ? 20 : 2 }]} />
                    </View>
                  </Pressable>

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
                      style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                      onPress={() => setPublishWarnVisible(true)}
                      disabled={loading}>
                      <Text style={s.publishBtnText}>{loading ? t('createEvent.publishingBtn') : t('createEvent.publishPaidBtn')}</Text>
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
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    style={[s.featuredToggle, { backgroundColor: form.isFeatured ? '#FFF8E8' : C.surface, borderColor: form.isFeatured ? '#F59E0B' : C.border }]}
                    onPress={() => update('isFeatured', !form.isFeatured)}>
                    <View style={s.featuredLeft}>
                      <FontAwesome5 name="star" size={18} color="#F59E0B" solid />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[s.featuredLabel, { color: C.text }]}>{t('createEvent.featuredLabel')}</Text>
                        <Text style={[s.featuredSub, { color: C.textSecondary }]}>{t('createEvent.featuredSub')}</Text>
                      </View>
                    </View>
                    <View style={[s.toggle, { backgroundColor: form.isFeatured ? '#F59E0B' : C.border }]}>
                      <View style={[s.toggleThumb, { left: form.isFeatured ? 20 : 2 }]} />
                    </View>
                  </Pressable>

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

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn:      { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontFamily: F.bold, color: '#fff' },
  headerSub:    { fontSize: 11, marginTop: 1, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)' },
  phasePill:    { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  phasePillText:{ fontSize: 12, fontFamily: F.bold, color: '#fff' },

  progressTrack:{ height: 3 },
  progressFill: { height: 3 },

  scroll:   { padding: 18, paddingBottom: 48 },
  content:  { gap: 14 },

  input:     { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  textarea:  { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 120, textAlignVertical: 'top', fontFamily: F.regular },
  errorText: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },

  descHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  descHeaderText: { flex: 1 },
  suggestBtn:     { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  suggestBtnText: { fontSize: 12, fontFamily: F.bold },

  generateBtn:     { borderRadius: 14, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  generateBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },

  reviewBanner:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, borderLeftWidth: 3, paddingVertical: 14, paddingHorizontal: 14 },
  reviewBannerTitle: { fontSize: 14, fontFamily: F.bold },
  reviewBannerSub:   { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },
  reviewBannerHeading: { fontSize: 17, fontFamily: F.bold, lineHeight: 23 },

  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  summaryLabel: { fontSize: 13, fontFamily: F.regular, width: 72 },
  summaryValue: { flex: 1, fontSize: 13, fontFamily: F.semibold, textAlign: 'right' },

  featuredToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, borderWidth: 1.5 },
  featuredLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  featuredLabel:  { fontSize: 14, fontFamily: F.bold },
  featuredSub:    { fontSize: 12, lineHeight: 17, fontFamily: F.regular },
  toggle:         { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb:    { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },

  draftBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, height: 48, borderWidth: 1.5, marginTop: 8 },
  draftBtnText:  { fontSize: 14, fontFamily: F.semibold },
  reviewActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, height: 52, borderWidth: 1.5 },
  editBtnText:   { fontSize: 14, fontFamily: F.bold },
  publishBtn:    { flex: 2, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  publishBtnText:{ color: '#fff', fontSize: 15, fontFamily: F.bold },

  warnScrim:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  warnSheet:       { width: '100%', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  warnIconWrap:    { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF8E8', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  warnTitle:       { fontSize: 18, fontFamily: F.bold, marginBottom: 12, textAlign: 'center' },
  warnBody:        { fontSize: 14, fontFamily: F.regular, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  warnActions:     { flexDirection: 'row', gap: 10, width: '100%' },
  warnCancelBtn:   { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 13, alignItems: 'center' },
  warnCancelText:  { fontSize: 13, fontFamily: F.semibold },
  warnConfirmBtn:  { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  warnConfirmText: { color: '#fff', fontSize: 13, fontFamily: F.bold },

  toast:     { position: 'absolute', bottom: 40, left: 20, right: 20, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  toastText: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.bold },

  stepSectionHeading: { fontSize: 15, fontFamily: F.bold },
  stepSectionSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18, marginBottom: 4 },

  // Event type tab slider
  etTabBar:  { flexDirection: 'row', borderRadius: 14, borderWidth: 1.5, padding: 4, gap: 4 },
  etTab:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10 },
  etTabText: { fontSize: 14, fontFamily: F.bold },

  // Event type info panel
  etInfoPanel: { borderRadius: 12, padding: 12 },
  etInfoSub:   { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },

  // Goal chips (inline multi-select)
  goalChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5 },
  goalChipText: { fontSize: 13, fontFamily: F.medium },

  // Budget grid
  budgetGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  budgetCard:         { width: '48%', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  budgetCardText:     { fontSize: 12, fontFamily: F.bold, textAlign: 'center' },
  budgetCardFull:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 13 },
  budgetCardFullText: { flex: 1, fontSize: 13, fontFamily: F.semibold },

  eventHintBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14 },
  eventHintText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: F.regular },

});

const dlv = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  bullet:     { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  label:      { flex: 1, fontSize: 14 },
  counter:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, overflow: 'hidden' },
  counterBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  counterBtnTxt: { fontSize: 20, lineHeight: 24, fontWeight: '300' },
  counterVal: { width: 28, textAlign: 'center', fontSize: 14, fontFamily: F.bold },
});

const ai = StyleSheet.create({
  charCount:    { fontSize: 11, fontFamily: F.regular, textAlign: 'right', marginTop: 4 },
  exampleLabel: { fontSize: 11, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  exampleChip:  { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  exampleChipText: { fontSize: 12, fontFamily: F.regular },
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hashtagChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5 },
  hashtagChipText: { fontSize: 13, fontFamily: F.medium },
  addChip:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addChipInput: { flex: 1, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, height: 40, fontSize: 13, fontFamily: F.regular },
  addChipBtn:   { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  budgetRow:    { flexDirection: 'row', gap: 10 },
  budgetInputWrap: { flex: 1, gap: 4 },
  budgetLabel:  { fontSize: 11, fontFamily: F.medium },
});
