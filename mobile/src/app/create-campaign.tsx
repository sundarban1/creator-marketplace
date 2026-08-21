import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { ApiError, warmUpBackend } from '@/lib/api';
import { profileService } from '@/services/profile';
import { useCategories } from '@/hooks/useCategories';
import { usePlatforms } from '@/hooks/usePlatforms';
import { FeatureImagePicker } from '@/features/creator/components/FeatureImagePicker';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { BottomSheet } from '@/components/BottomSheet';
import { BackButton } from '@/components/BackButton';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { pickAndUpload } from '@/utilities/uploadImage';
import { RecommendedCreatorsModal } from '@/features/business/components/RecommendedCreatorsModal';
import { VoicePromptInput } from '@/features/business/components/VoicePromptInput';
import { transcribeAudio } from '@/services/audioTranscribe';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabSlider } from '@/components/TabSlider';
import { TabColors } from '@/utilities/tabColors';
import {
  GOAL_OPTIONS, DELIVERABLE_TYPES, DEFAULT_DELIVERABLES, summarizeDeliverables, completionLabel,
} from '@/features/business/constants/campaignForm';
import {
  SectionCard, ChipGroup, ChipMultiGroup, BudgetTierPicker, Stepper,
  DeliverablesCounterList, HashtagEditor, FeaturedToggle, CompletionTypePicker, sc,
} from '@/features/business/components/CampaignFormControls';
import type { FormData, RequirementFormItem } from '@/features/business/types/campaignForm.types';
import {
  dayStart, sameDay, fmtDate, getDaysInMonth, getFirstWeekday,
  mapAiCampaignDraftToForm, mapAiEventDraftToForm,
} from '@/features/business/utils/campaignFormMappers';
import { ListingHeroCard, PreviewRow, AiGeneratingOverlay } from '@/features/business/components/CampaignSummary';

// ─── Constants ────────────────────────────────────────────────────────────────

// Quick Templates / Quick Audio Samples shown under the AI prompt box —
// exactly 2 English + 2 Nepali examples shown together, tailored to the
// business's own onboarding-selected category (see `businessCategories`
// below) rather than one universal list.
//
// Each example spells out the same concrete asks the AI prompt placeholder
// itself models (how many creators, what deliverables, what budget) instead
// of generic marketing copy — tapping one should read like a filled-in
// version of "what you need in Kolab", not a vague brand blurb.
const PROMPT_EXAMPLES_BY_CATEGORY: Record<string, { en: [string, string]; ne: [string, string] }> = {
  'Restaurants': {
    en: ['Need 3 food creators for a menu review — 2 reels + 5 photos each. Budget Rs. 15,000 total, shoot next week.', 'Need 3 content creators and 1 photographer for our restaurant opening. Rs. 20,000 total budget.'],
    ne: ['मेनु रिभ्युका लागि ३ जना फूड क्रिएटर चाहियो — प्रत्येकबाट २ रिल + ५ फोटो। कुल बजेट रु. १५,०००, अर्को हप्ता सुटिङ।', 'हाम्रो रेस्टुरेन्ट उद्घाटनका लागि ३ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. २०,०००।'],
  },
  'Cafés': {
    en: ['Need 2 creators to try our new coffee blend and post 1 reel each. Budget Rs. 3,000 per creator.', 'Need 2 content creators and 1 photographer for our seasonal drinks menu shoot. Rs. 12,000 total.'],
    ne: ['हाम्रो नयाँ कफी ब्लेन्ड चाखी प्रत्येकले १ रिल पोस्ट गर्न २ जना क्रिएटर चाहियो। प्रति क्रिएटर बजेट रु. ३,०००।', 'सिजनल ड्रिंक्स मेनु सुटका लागि २ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. १२,०००।'],
  },
  'Hotels': {
    en: ['Need 1 travel creator for a hotel tour video — 1 reel + 10 photos. Budget Rs. 20,000, 2-night stay included.', 'Need 2 content creators and 1 photographer to showcase our weekend getaway package. Rs. 30,000 total + free stay.'],
    ne: ['होटल टुर भिडियोका लागि १ जना ट्राभल क्रिएटर चाहियो — १ रिल + १० फोटो। बजेट रु. २०,०००, २ रात बसाइ सहित।', 'हाम्रो वीकेन्ड गेटअवे प्याकेज देखाउन २ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. ३०,००० + निःशुल्क बसाइ।'],
  },
  'Resorts': {
    en: ['Need 2 travel vloggers for a resort review — 1 video + 8 photos each. Rs. 15,000 per creator, stay included.', 'Need 1 videographer and 2 content creators for a honeymoon package shoot. Rs. 35,000 total, 3-day shoot.'],
    ne: ['रिसोर्ट समीक्षाका लागि २ जना ट्राभल भ्लगर चाहियो — प्रत्येकबाट १ भिडियो + ८ फोटो। प्रति क्रिएटर रु. १५,०००, बसाइ सहित।', 'हनिमुन प्याकेज सुटका लागि १ जना भिडियोग्राफर र २ जना कन्टेन्ट क्रिएटर चाहियो। कुल बजेट रु. ३५,०००, ३ दिनको सुटिङ।'],
  },
  'Travel & Tourism': {
    en: ['Need 2 travel creators to try our new holiday package — 1 reel + 1 blog each. Rs. 18,000 per creator.', 'Need 3 content creators and 1 photographer to document a group tour. Budget Rs. 40,000 total, 4-day trip.'],
    ne: ['हाम्रो नयाँ हलिडे प्याकेज प्रयास गर्न २ जना ट्राभल क्रिएटर चाहियो — प्रत्येकबाट १ रिल + १ ब्लग। प्रति क्रिएटर रु. १८,०००।', 'ग्रुप टुर रेकर्ड गर्न ३ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. ४०,०००, ४ दिनको यात्रा।'],
  },
  'Trekking & Adventure': {
    en: ['Need 2 adventure creators for a guided trek video — 1 vlog + 15 photos each. Rs. 20,000 per creator, 5-day trek.', 'Need 1 videographer and 1 photographer for our new trekking package. Budget Rs. 25,000 total, gear provided.'],
    ne: ['गाइडेड ट्रेक भिडियोका लागि २ जना एडभेन्चर क्रिएटर चाहियो — प्रत्येकबाट १ भ्लग + १५ फोटो। प्रति क्रिएटर रु. २०,०००, ५ दिनको ट्रेक।', 'हाम्रो नयाँ ट्रेकिङ प्याकेज प्रवर्द्धनका लागि १ जना भिडियोग्राफर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. २५,०००, गियर उपलब्ध गराइनेछ।'],
  },
  'Fashion & Clothing': {
    en: ['Need 3 fashion creators for our collection launch — 1 reel + 5 photos each. Rs. 5,000 per creator.', 'Need 2 models and 1 photographer for an outfit styling shoot with our latest arrivals. Rs. 15,000 total.'],
    ne: ['हाम्रो कलेक्सन लन्चका लागि ३ जना फेसन क्रिएटर चाहियो — प्रत्येकबाट १ रिल + ५ फोटो। प्रति क्रिएटर रु. ५,०००।', 'पछिल्ला वस्तुहरू समावेश गरी आउटफिट स्टाइलिङ सुटका लागि २ जना मोडेल र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. १५,०००।'],
  },
  'Footwear': {
    en: ['Need 2 creators to style and showcase our new footwear collection — 1 reel each. Rs. 6,000 per creator.', 'Need 1 model and 1 photographer for our new footwear collection shoot. Rs. 10,000 total.'],
    ne: ['हाम्रो नयाँ जुत्ता कलेक्सन स्टाइल गरी देखाउन २ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ६,०००।', 'हाम्रो नयाँ जुत्ता कलेक्सन सुटका लागि १ जना मोडेल र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. १०,०००।'],
  },
  'Beauty & Cosmetics': {
    en: ['Need 2 makeup artists for a get-ready-with-me collab — 1 reel each. Rs. 7,000 per creator.', 'Need 1 makeup artist and 2 content creators to review our new cosmetics line. Budget Rs. 18,000 total, products provided.'],
    ne: ['गेट-रेडी-विथ-मी सहकार्यका लागि २ जना मेकअप आर्टिस्ट चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ७,०००।', 'हाम्रो नयाँ कस्मेटिक्स लाइन समीक्षाका लागि १ जना मेकअप आर्टिस्ट र २ जना कन्टेन्ट क्रिएटर चाहियो। कुल बजेट रु. १८,०००, प्रोडक्ट उपलब्ध गराइनेछ।'],
  },
  'Skincare & Personal Care': {
    en: ['Need 2 skincare creators to try and review our new product line — 1 reel + 3 photos each. Rs. 6,000 per creator.', 'Need 2 content creators and 1 photographer for an honest 7-day skincare routine series. Budget Rs. 20,000 total.'],
    ne: ['हाम्रो नयाँ प्रोडक्ट लाइन प्रयास गरी समीक्षा गर्न २ जना स्किनकेयर क्रिएटर चाहियो — प्रत्येकबाट १ रिल + ३ फोटो। प्रति क्रिएटर रु. ६,०००।', 'साँचो ७-दिने स्किनकेयर रुटिन सिरिजका लागि २ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. २०,०००।'],
  },
  'Jewellery & Accessories': {
    en: ['Need 2 creators to showcase our new jewellery collection — 5 photos + 1 reel each. Rs. 6,000 per creator.', 'Need 1 model and 1 photographer for a festive jewellery styling shoot. Rs. 12,000 total.'],
    ne: ['हाम्रो नयाँ गहना कलेक्सन देखाउन २ जना क्रिएटर चाहियो — प्रत्येकबाट ५ फोटो + १ रिल। प्रति क्रिएटर रु. ६,०००।', 'चाडपर्व गहना स्टाइलिङ सुटका लागि १ जना मोडेल र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. १२,०००।'],
  },
  'Retail & Shopping': {
    en: ['Need 2 creators for a store haul video featuring new arrivals — 1 reel each. Rs. 6,000 per creator.', 'Need 2 content creators and 1 photographer to feature our seasonal sale. Budget Rs. 15,000 total.'],
    ne: ['नयाँ सामानहरू समावेश गरी स्टोर हल भिडियोका लागि २ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ६,०००।', 'हाम्रो सिजनल सेल फिचरका लागि २ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. १५,०००।'],
  },
  'E-commerce': {
    en: ['Need 3 creators to promote our app and drive downloads — 1 reel each. Rs. 5,000 per creator.', 'Need 2 content creators and 1 videographer for an unboxing video of our bestselling products. Budget Rs. 14,000 total, products provided.'],
    ne: ['हाम्रो एप प्रवर्द्धन गरी डाउनलोड बढाउन ३ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ५,०००।', 'हाम्रा बेस्टसेलिङ प्रोडक्टहरू समावेश गरी अनबक्सिङ भिडियोका लागि २ जना कन्टेन्ट क्रिएटर र १ जना भिडियोग्राफर चाहियो। कुल बजेट रु. १४,०००, प्रोडक्ट उपलब्ध गराइनेछ।'],
  },
  'Food & Beverage Brands': {
    en: ['Need 2 creators for a recipe collaboration using our product — 1 reel each. Rs. 5,000 per creator.', 'Need 2 content creators and 1 photographer to sample and review our new product launch. Budget Rs. 14,000 total.'],
    ne: ['हाम्रो प्रोडक्ट प्रयोग गरी रेसिपी सहकार्यका लागि २ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ५,०००।', 'हाम्रो नयाँ प्रोडक्ट लन्च चाखी समीक्षाका लागि २ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. १४,०००।'],
  },
  'Events & Entertainment': {
    en: ['Need 2 creators to cover our upcoming event live — stories + 1 recap reel each. Rs. 8,000 per creator.', 'Need 5 content creators, 2 photographers and 1 DJ for our event. Rs. 50,000 total budget.'],
    ne: ['हाम्रो आगामी कार्यक्रम लाइभ कभर गर्न २ जना क्रिएटर चाहियो — प्रत्येकबाट स्टोरी + १ रिकयाप रिल। प्रति क्रिएटर रु. ८,०००।', 'हाम्रो कार्यक्रमका लागि ५ जना कन्टेन्ट क्रिएटर, २ जना फोटोग्राफर र १ जना डीजे चाहियो। कुल बजेट रु. ५०,०००।'],
  },
  'Fitness & Wellness': {
    en: ['Need 2 fitness creators to promote our center — 1 reel + 1 story series each. Rs. 6,000 per creator.', 'Need 3 content creators and 1 photographer for a 7-day workout challenge collab. Budget Rs. 20,000 total, membership included.'],
    ne: ['हाम्रो सेन्टर प्रवर्द्धन गर्न २ जना फिटनेस क्रिएटर चाहियो — प्रत्येकबाट १ रिल + १ स्टोरी सिरिज। प्रति क्रिएटर रु. ६,०००।', '७-दिने वर्कआउट च्यालेन्ज सहकार्यका लागि ३ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. २०,०००, मेम्बरसिप सहित।'],
  },
  'Education & Training': {
    en: ['Need 3 creators to review our new course or app — 1 reel each. Rs. 5,000 per creator.', 'Need 2 content creators and 1 videographer to promote our new course launch. Budget Rs. 12,000 total.'],
    ne: ['हाम्रो नयाँ कोर्स वा एप रिभ्यु गर्न ३ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ५,०००।', 'हाम्रो नयाँ कोर्स लन्च प्रवर्द्धनका लागि २ जना कन्टेन्ट क्रिएटर र १ जना भिडियोग्राफर चाहियो। कुल बजेट रु. १२,०००।'],
  },
  'Electronics & Mobile': {
    en: ['Need 2 tech creators for an unboxing and review video. Rs. 8,000 per creator, device provided.', 'Need 2 content creators and 1 photographer to showcase our latest gadget launch. Budget Rs. 22,000 total.'],
    ne: ['अनबक्सिङ र समीक्षा भिडियोका लागि २ जना टेक क्रिएटर चाहियो। प्रति क्रिएटर रु. ८,०००, डिभाइस उपलब्ध गराइनेछ।', 'हाम्रो पछिल्लो ग्याजेट लन्च देखाउनका लागि २ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. २२,०००।'],
  },
  'Technology & Software': {
    en: ['Need 2 creators to demo our app and share an honest review — 1 reel each. Rs. 6,000 per creator.', 'Need 2 content creators and 1 videographer to try our new feature and give feedback. Budget Rs. 15,000 total.'],
    ne: ['हाम्रो एप डेमो गरी साँचो समीक्षा साझा गर्न २ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ६,०००।', 'हाम्रो नयाँ फिचर प्रयास गरी प्रतिक्रियाका लागि २ जना कन्टेन्ट क्रिएटर र १ जना भिडियोग्राफर चाहियो। कुल बजेट रु. १५,०००।'],
  },
  'Automotive': {
    en: ['Need 2 bike/car riders for a workshop and servicing video. Rs. 10,000 per creator.', 'Need 1 videographer and 1 content creator for a test drive review of our new model. Rs. 20,000 total.'],
    ne: ['अटोमोबाइल वर्कशप र गाडी सर्भिसिङको भिडियोका लागि २ जना बाइक/कार राइडर क्रिएटर चाहियो। प्रति क्रिएटर रु. १०,०००।', 'हाम्रो नयाँ मोडलको टेस्ट ड्राइभ समीक्षाका लागि १ जना भिडियोग्राफर र १ जना कन्टेन्ट क्रिएटर चाहियो। कुल बजेट रु. २०,०००।'],
  },
  'Real Estate & Property': {
    en: ['Need 1 creator for a site visit and property walkthrough video. Budget Rs. 12,000.', 'Need 1 photographer and 1 videographer for our new project launch. Rs. 25,000 total.'],
    ne: ['साइट भिजिट र प्रोपर्टी वाकथ्रु भिडियोका लागि १ जना क्रिएटर चाहियो। बजेट रु. १२,०००।', 'हाम्रो नयाँ प्रोजेक्ट लन्चका लागि १ जना फोटोग्राफर र १ जना भिडियोग्राफर चाहियो। कुल बजेट रु. २५,०००।'],
  },
  'Banking & FinTech': {
    en: ['Need 3 creators to explain our new savings offer to their audience — 1 reel each. Rs. 6,000 per creator.', 'Need 2 content creators and 1 videographer to promote our app and its cashback rewards. Budget Rs. 16,000 total.'],
    ne: ['हाम्रो नयाँ बचत अफर आफ्नो दर्शकलाई बुझाउन ३ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ६,०००।', 'हाम्रो एप र यसको क्यासब्याक रिवार्ड प्रवर्द्धनका लागि २ जना कन्टेन्ट क्रिएटर र १ जना भिडियोग्राफर चाहियो। कुल बजेट रु. १६,०००।'],
  },
  'Internet & Telecom': {
    en: ['Need 2 creators to promote our new data plan launch — 1 reel each. Rs. 5,000 per creator.', 'Need 2 content creators and 1 photographer to test our network speed and share their experience. Budget Rs. 13,000 total.'],
    ne: ['हाम्रो नयाँ डाटा प्लान लन्च प्रवर्द्धन गर्न २ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ५,०००।', 'हाम्रो नेटवर्क स्पीड परीक्षण र अनुभव साझा गर्नका लागि २ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. १३,०००।'],
  },
  'Healthcare & Medical': {
    en: ['Need 2 creators to promote our free health checkup camp — 1 reel each. Rs. 5,000 per creator.', 'Need 1 content creator and 1 photographer to raise awareness about our new service. Budget Rs. 11,000 total.'],
    ne: ['हाम्रो निःशुल्क स्वास्थ्य जाँच शिविर प्रवर्द्धन गर्न २ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल। प्रति क्रिएटर रु. ५,०००।', 'हाम्रो नयाँ सेवाको बारेमा सचेतना फैलाउनका लागि १ जना कन्टेन्ट क्रिएटर र १ जना फोटोग्राफर चाहियो। कुल बजेट रु. ११,०००।'],
  },
  'Home & Furniture': {
    en: ['Need 2 creators for a home styling and interior showcase video. Rs. 8,000 per creator.', 'Need 1 photographer and 2 content creators to feature our new furniture collection. Budget Rs. 18,000 total.'],
    ne: ['होम स्टाइलिङ र इन्टिरियर देखाउने भिडियोका लागि २ जना क्रिएटर चाहियो। प्रति क्रिएटर रु. ८,०००।', 'हाम्रो नयाँ फर्निचर कलेक्सन फिचरका लागि १ जना फोटोग्राफर र २ जना कन्टेन्ट क्रिएटर चाहियो। कुल बजेट रु. १८,०००।'],
  },
};

// Falls back to this when the business hasn't selected a category yet, or
// selected one not covered above (e.g. an admin just added it).
const GENERIC_PROMPT_EXAMPLES: { en: [string, string]; ne: [string, string] } = {
  en: ['Need 2 creators to promote our brand — 1 reel + 3 photos each. Budget Rs. 6,000 per creator.', 'Need 3 content creators, 1 photographer and 1 DJ for our event. Rs. 40,000 total budget.'],
  ne: ['हाम्रो ब्रान्ड प्रवर्द्धन गर्न २ जना क्रिएटर चाहियो — प्रत्येकबाट १ रिल + ३ फोटो। प्रति क्रिएटर बजेट रु. ६,०००।', 'हाम्रो कार्यक्रमका लागि ३ जना कन्टेन्ट क्रिएटर, १ जना फोटोग्राफर र १ जना डीजे चाहियो। कुल बजेट रु. ४०,०००।'],
};

// Free Invitation flow's own examples — deliberately never mention money
// (Rs./budget), unlike PROMPT_EXAMPLES_BY_CATEGORY above, which is Paid
// Campaign-only. Same 2 EN + 2 NE shape, smaller category coverage (the
// categories most likely to host a free/perks-based invitation).
const INVITE_PROMPT_EXAMPLES_BY_CATEGORY: Record<string, { en: [string, string]; ne: [string, string] }> = {
  'Restaurants': {
    en: ['Launching our new restaurant in Kathmandu — inviting 15 food creators for a free dinner and drinks. Want them to share a Reel and a Story on Instagram or TikTok.', 'Hosting a menu tasting evening for 10 food creators — free food, in exchange for an honest review post.'],
    ne: ['काठमाडौंमा हाम्रो नयाँ रेस्टुरेन्ट खोल्दैछौं — १५ जना फूड क्रिएटरलाई निःशुल्क डिनर र पेय पदार्थका लागि आमन्त्रित गर्दैछौं। इन्स्टाग्राम वा टिकटकमा रिल र स्टोरी साझा गरून् भन्ने चाहन्छौं।', '१० जना फूड क्रिएटरका लागि मेनु टेस्टिङ साँझ आयोजना गर्दैछौं — निःशुल्क खाना, बदलामा इमानदार रिभ्यु पोस्ट।'],
  },
  'Cafés': {
    en: ['Inviting 8 café creators to try our new seasonal drinks menu — free drinks and snacks, looking for a Story mention.', 'Hosting a coffee tasting morning for 5 creators — free coffee, just come and share organically.'],
    ne: ['हाम्रो नयाँ सिजनल ड्रिंक्स मेनु चाख्न ८ जना क्याफे क्रिएटरलाई आमन्त्रित गर्दैछौं — निःशुल्क पेय र खाजा, स्टोरी मेन्सन चाहन्छौं।', '५ जना क्रिएटरका लागि कफी टेस्टिङ बिहान आयोजना गर्दैछौं — निःशुल्क कफी, केवल आउनुहोस् र स्वाभाविक रूपमा साझा गर्नुहोस्।'],
  },
  'Hotels': {
    en: ['Inviting 3 travel creators for a 2-night complimentary stay to experience our new rooms — looking for a Reel + photos.', 'Hosting a weekend getaway for 4 creators with free stay and meals, in exchange for a hotel tour video.'],
    ne: ['हाम्रो नयाँ कोठाहरू अनुभव गर्न ३ जना ट्राभल क्रिएटरलाई २ रात निःशुल्क बसाइका लागि आमन्त्रित गर्दैछौं — रिल + फोटोहरू चाहन्छौं।', '४ जना क्रिएटरका लागि निःशुल्क बसाइ र खानासहित वीकेन्ड गेटअवे आयोजना गर्दैछौं, बदलामा होटल टुर भिडियो।'],
  },
  'Beauty & Cosmetics': {
    en: ['Inviting 6 beauty creators for a free spa treatment and product hamper — looking for an honest review and Reel.', 'Hosting a get-ready-with-me event with free makeup services, in exchange for a Story mention tagging us.'],
    ne: ['निःशुल्क स्पा उपचार र प्रोडक्ट ह्यामपरका लागि ६ जना ब्युटी क्रिएटरलाई आमन्त्रित गर्दैछौं — इमानदार रिभ्यु र रिल चाहन्छौं।', 'निःशुल्क मेकअप सेवासहित गेट-रेडी-विथ-मी कार्यक्रम आयोजना गर्दैछौं, बदलामा हामीलाई ट्याग गर्दै स्टोरी मेन्सन।'],
  },
  'Fitness & Wellness': {
    en: ['Inviting 5 fitness creators to a free trial week at our gym — looking for a workout Reel and Story series.', 'Hosting a wellness retreat day with free entry and refreshments, just attend and share organically.'],
    ne: ['हाम्रो जिममा निःशुल्क ट्रायल हप्ताका लागि ५ जना फिटनेस क्रिएटरलाई आमन्त्रित गर्दैछौं — वर्कआउट रिल र स्टोरी सिरिज चाहन्छौं।', 'निःशुल्क प्रवेश र खाजासहित वेलनेस रिट्रिट दिन आयोजना गर्दैछौं, केवल उपस्थित हुनुहोस् र स्वाभाविक रूपमा साझा गर्नुहोस्।'],
  },
  'Events & Entertainment': {
    en: ['Inviting 10 creators to our show\'s opening night — free tickets and backstage access, looking for event promotion posts.', 'Hosting a free preview screening for 8 creators, in exchange for a Reel and Story mention.'],
    ne: ['हाम्रो शोको उद्घाटन रातका लागि १० जना क्रिएटरलाई आमन्त्रित गर्दैछौं — निःशुल्क टिकट र ब्याकस्टेज पहुँच, इभेन्ट प्रवर्द्धन पोस्ट चाहन्छौं।', '८ जना क्रिएटरका लागि निःशुल्क पूर्वावलोकन स्क्रिनिङ आयोजना गर्दैछौं, बदलामा रिल र स्टोरी मेन्सन।'],
  },
};

const GENERIC_INVITE_PROMPT_EXAMPLES: { en: [string, string]; ne: [string, string] } = {
  en: ['Inviting 10 creators to experience our new launch for free — looking for a Reel and a Story mention in return.', 'Hosting a free event with perks and goodie bags for attendees — just come and share organically, no formal content required.'],
  ne: ['हाम्रो नयाँ सुरुवात निःशुल्क अनुभव गर्न १० जना क्रिएटरलाई आमन्त्रित गर्दैछौं — बदलामा रिल र स्टोरी मेन्सन चाहन्छौं।', 'उपस्थितहरूका लागि सुविधा र गुडी ब्यागसहित निःशुल्क कार्यक्रम आयोजना गर्दैछौं — केवल आउनुहोस् र स्वाभाविक रूपमा साझा गर्नुहोस्, औपचारिक कन्टेन्ट आवश्यक छैन।'],
};

function getInviteExamples(category: string | undefined): string[] {
  const entry = (category && INVITE_PROMPT_EXAMPLES_BY_CATEGORY[category]) || GENERIC_INVITE_PROMPT_EXAMPLES;
  return [...entry.en, ...entry.ne];
}

function getInviteSamples(category: string | undefined): { text: string; lang: 'en' | 'ne' }[] {
  const entry = (category && INVITE_PROMPT_EXAMPLES_BY_CATEGORY[category]) || GENERIC_INVITE_PROMPT_EXAMPLES;
  return [
    { text: entry.en[0], lang: 'en' },
    { text: entry.en[1], lang: 'en' },
    { text: entry.ne[0], lang: 'ne' },
    { text: entry.ne[1], lang: 'ne' },
  ];
}

function getPromptExamples(category: string | undefined, language: 'en' | 'ne'): string[] {
  const entry = (category && PROMPT_EXAMPLES_BY_CATEGORY[category]) || GENERIC_PROMPT_EXAMPLES;
  return entry[language];
}

// Quick Template chips always show both languages together (2 English + 2
// Nepali) regardless of the app's current language, so a business can tap
// whichever one reads naturally to them.
function getAllPromptExamples(category: string | undefined): string[] {
  const entry = (category && PROMPT_EXAMPLES_BY_CATEGORY[category]) || GENERIC_PROMPT_EXAMPLES;
  return [...entry.en, ...entry.ne];
}

// Same 2 English + 2 Nepali examples as above, but tagged with which
// language each is written in — Quick Audio Samples reads them aloud via
// on-device text-to-speech (see VoicePromptInput's sibling render below),
// and the TTS voice/language must match the sample's actual text.
function getPromptSamples(category: string | undefined): { text: string; lang: 'en' | 'ne' }[] {
  const entry = (category && PROMPT_EXAMPLES_BY_CATEGORY[category]) || GENERIC_PROMPT_EXAMPLES;
  return [
    { text: entry.en[0], lang: 'en' },
    { text: entry.en[1], lang: 'en' },
    { text: entry.ne[0], lang: 'ne' },
    { text: entry.ne[1], lang: 'ne' },
  ];
}

const ERROR_RED = '#EF4444';
const MIN_BUDGET_PER_CREATOR = 500;

// "Need Help?" walkthrough scripts, read aloud via on-device TTS from the
// help modal below. Nepali is read with a Hindi voice (see handlePlayHelp) —
// Nepali TTS voices are rarely installed on-device, Hindi voices read the
// shared Devanagari script far more reliably (see Quick Audio Samples above).
const NEED_HELP_SCRIPT_EN = `Welcome to Kolab!
Create your event easily and connect with the right creators.

Choose the type of event you want to create.

Paid Event
Work with creators by paying them to create content that promotes your business.

Open Event
Invite creators to your event and let them experience your brand. You can offer free entry, gifts, food, drinks, or other benefits.

Create your event using text or voice.

Write
Describe your idea, and Kolab AI will create an event for you.

Voice
Tell your idea by speaking, and Kolab AI will turn it into an event.

You can add details like:

Budget
Location
Number of creators
Social media platforms
Event requirements

Your event will be saved as a draft.
Review the details, make any changes, and publish when ready.

You can also choose Featured Event to make your event more visible to creators.

Publish your event and start collaborating with creators.

Thank you for using Kolab.
Let's create great collaborations together!`;

const NEED_HELP_SCRIPT_NE = `कोल्याबमा स्वागत छ!
आफ्नो इभेन्ट सजिलै बनाउनुहोस् र सही क्रिएटरहरूसँग सहकार्य गर्नुहोस्।

सबैभन्दा पहिले आफूलाई चाहिएको इभेन्टको प्रकार छान्नुहोस्।

पेड इभेन्ट
क्रिएटरहरूलाई भुक्तानी गरेर आफ्नो बिजनेसको प्रचारका लागि कन्टेन्ट बनाउन लगाउनुहोस्।

ओपन इभेन्ट
क्रिएटरहरूलाई आफ्नो इभेन्टमा बोलाउनुहोस् र आफ्नो ब्रान्डको अनुभव साझा गर्न दिनुहोस्। तपाईं फ्री इन्ट्री, गिफ्ट, खाना, ड्रिंक्स वा अन्य सुविधा दिन सक्नुहुन्छ।

टेक्स्ट वा आवाज प्रयोग गरेर इभेन्ट बनाउनुहोस्।

लेखेर
आफ्नो आइडिया लेख्नुहोस्, कोल्याब एआईले तपाईंको लागि इभेन्ट तयार गर्छ।

आवाजबाट
आफ्नो आइडिया बोलेर भन्नुहोस्, कोल्याब एआईले त्यसलाई इभेन्टमा बदल्छ।

तपाईंले यी विवरणहरू थप्न सक्नुहुन्छ:

बजेट
स्थान
चाहिने क्रिएटरको संख्या
सामाजिक सञ्जाल प्लेटफर्म
इभेन्टको आवश्यकता

तपाईंको इभेन्ट मस्यौदाको रूपमा सुरक्षित हुनेछ।
विवरण हेर्नुहोस्, आवश्यक परिवर्तन गर्नुहोस् र तयार भएपछि प्रकाशित गर्नुहोस्।

थप क्रिएटरहरूको ध्यान आकर्षित गर्न विशेष इभेन्ट विकल्प पनि छान्न सक्नुहुन्छ।

इभेन्ट प्रकाशित गर्नुहोस् र क्रिएटरहरूसँग सहकार्य सुरु गर्नुहोस्।

कोल्याब प्रयोग गर्नुभएकोमा धन्यवाद।
आउनुहोस्, सँगै उत्कृष्ट सहकार्यहरू सिर्जना गरौं!`;

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

// Used when generateEventWithAi() throws outright (network down, request timeout,
// backend error unrelated to the AI call itself) — the backend's own dummy-template
// fallback already covers OpenAI-specific failures. Mirrors GENERIC_AI_TEMPLATE above,
// but for OPEN_EVENT drafts (no budget/deliverables, has benefits/capacity instead).
const GENERIC_FREE_EVENT_TEMPLATE = {
  title: 'Exclusive Creator Event',
  description: "We're inviting creators to an exclusive event to experience our brand firsthand and create authentic content. Enjoy complimentary access, connect with our team, and share your genuine experience with your audience.",
  benefits: ['Free Event Access', 'Free Products / Gifts'],
  capacity: 20,
  exchangeType: ['Just attend & share organically'],
  expectedContent: '',
};

// "What are you offering?" — kept in sync with BENEFIT_OPTIONS in
// backend/campaign-ai.schema.ts — the AI-generated event draft's `benefits`
// field only ever returns these exact labels. Also used by the legacy Open
// Event editor's "Creator Benefits" section, so there's one vocabulary
// everywhere, not a mobile/backend or new-flow/legacy-editor fork.
const OFFERING_OPTIONS = [
  'Free Event Access',
  'Food & Drinks',
  'Free Products / Gifts',
  'Free Service / Experience',
  'Product Launch / Preview',
  'Other',
];

// Kept in sync with EXCHANGE_OPTIONS in backend/campaign-ai.schema.ts — the
// AI-generated event draft's `exchangeType` field only ever returns these.
const EXCHANGE_OPTIONS = [
  'Social media post',
  'Reel / short video',
  'Video content',
  'Photos',
  'Story mention',
  'Honest review',
  'Event promotion (pre-event post)',
  'Mention / tag the business',
  'Just attend & share organically',
  'Other',
];

const ROLE_TYPE_OPTIONS = [
  'Content Creators',
  'Influencers',
  'Photographers',
  'Bloggers',
  'Actors',
  'Musicians',
  'Other',
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewErrors = Partial<Record<'title' | 'deadline' | 'eventDate' | 'budget' | 'requirements', string>>;

// 'chooseType' — top-level Paid vs Free picker, the new default boot phase.
// 'describe' | 'publish' — AI-first "Create Opportunity" (Paid
// Campaign), single prompt straight to a directly-editable Publish screen.
// 'inviteOffer' | 'inviteDescribe' | 'inviteDraft' | 'invitePublish'
// — AI-first "Create Free Invitation" (Open Event). 'setup' | 'roles' |
// 'review' | 'confirm' is the legacy multi-step editor, kept as the "Edit
// details" fallback for both new flows (reachable from 'publish' and
// from 'inviteDraft'/'invitePublish').
type Phase =
  | 'setup' | 'roles' | 'review' | 'confirm'
  | 'chooseType'
  | 'describe' | 'publish'
  | 'inviteOffer' | 'inviteDescribe' | 'inviteDraft' | 'invitePublish';

// Shared dropdown-trigger/bottom-sheet styles, used by MultiCheckboxDropdown below.
const dp = StyleSheet.create({
  trigger:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 50 },
  triggerText:  { flex: 1, fontSize: 14, fontFamily: F.medium },
  error:        { fontSize: 12, color: ERROR_RED, fontFamily: F.regular, marginTop: 4 },
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
      <Pressable
        style={[dp.trigger, { backgroundColor: C.background, borderColor: error ? ERROR_RED : values.length > 0 ? C.brinjal1 : C.border }]}
        onPress={() => setOpen(true)}>
        <FontAwesome5 name="flag" size={16} color={values.length > 0 ? C.brinjal1 : C.textSecondary} />
        <Text style={[dp.triggerText, { color: values.length > 0 ? C.text : C.textSecondary }]} numberOfLines={1}>{label}</Text>
        {values.length > 0 && (
          <View style={[mc.badge, { backgroundColor: C.brinjal1 }]}>
            <Text style={mc.badgeText}>{values.length}</Text>
          </View>
        )}
        <FontAwesome5 name="chevron-down" solid size={16} color={C.textSecondary} />
      </Pressable>
      {error && <Text style={dp.error}>{error}</Text>}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={placeholder} maxHeightPct={0.7}>
        {options.map((opt) => {
          const checked = values.includes(opt);
          return (
            <Pressable
              key={opt}
              style={[mc.row, { backgroundColor: checked ? C.primaryLight : 'transparent' }]}
              onPress={() => toggle(opt)}>
              <View style={[mc.checkbox, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.brinjal1 : 'transparent' }]}>
                {checked && <FontAwesome5 name="check" solid size={13} color="#fff" />}
              </View>
              <Text style={[mc.rowLabel, { color: checked ? C.brinjal1 : C.text, fontFamily: checked ? F.semibold : F.regular }]}>{opt}</Text>
            </Pressable>
          );
        })}
      </BottomSheet>
    </>
  );
}

const mc = StyleSheet.create({
  badge:      { width: 20, height: 20, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  badgeText:  { fontSize: 11, color: '#fff', fontFamily: F.bold },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12, borderRadius: RADIUS.md, marginBottom: 4 },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  rowLabel:   { flex: 1, fontSize: 14 },
});

// ─── RequirementsRepeater (§ CampaignRequirement — multi-role campaigns) ───────

const BUDGET_TYPE_OPTIONS = ['FIXED', 'RANGE', 'NEGOTIABLE'] as const;

function RequirementCard({
  item, index, providerCategoryOptions, onChange, onRemove, colors, t,
}: {
  item: RequirementFormItem;
  index: number;
  providerCategoryOptions: { id: string; label: string; icon: string; color: string }[];
  onChange: (next: RequirementFormItem) => void;
  onRemove: () => void;
  colors: ReturnType<typeof useAppColors>;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const C = colors;
  const budgetTypeLabels: Record<(typeof BUDGET_TYPE_OPTIONS)[number], string> = {
    FIXED: t('createEvent.reqBudgetFixed'),
    RANGE: t('createEvent.reqBudgetRange'),
    NEGOTIABLE: t('createEvent.reqBudgetNegotiable'),
  };

  // Once a category's picked, show the actual role ("Photographer ×2")
  // instead of the generic placeholder, so a stack of blocks reads at a
  // glance instead of everyone showing "Role 1", "Role 2"...
  const cardTitle = item.categoryName
    ? `${item.categoryName} ×${item.quantity}`
    : t('createEvent.reqRoleLabel', { n: index + 1 });

  return (
    <View style={[rq.card, { backgroundColor: C.background, borderColor: C.border }]}>
      <View style={rq.cardHeader}>
        <Text style={[rq.cardTitle, { color: C.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>{cardTitle}</Text>
        <Pressable hitSlop={8} onPress={onRemove}>
          <FontAwesome5 name="trash-alt" size={14} color={C.textSecondary} />
        </Pressable>
      </View>

      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqCategoryLabel')}</Text>
      <ChipGroup
        options={providerCategoryOptions.map((c) => c.label)}
        value={item.categoryName}
        onChange={(label) => {
          const cat = providerCategoryOptions.find((c) => c.label === label);
          if (!cat) return;
          onChange({ ...item, categoryId: cat.id, categoryName: cat.label, categoryIcon: cat.icon, categoryColor: cat.color });
        }}
        colors={C}
      />

      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqQuantityLabel')}</Text>
      <Stepper value={item.quantity} onChange={(v) => onChange({ ...item, quantity: v })} min={1} max={20} colors={C} />

      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqBudgetTypeLabel')}</Text>
      <ChipGroup
        options={BUDGET_TYPE_OPTIONS.map((k) => budgetTypeLabels[k])}
        value={budgetTypeLabels[item.budgetType]}
        onChange={(label) => {
          const key = BUDGET_TYPE_OPTIONS.find((k) => budgetTypeLabels[k] === label) ?? 'FIXED';
          onChange({ ...item, budgetType: key });
        }}
        colors={C}
      />

      {item.budgetType === 'FIXED' && (
        <TextInputWithLabel
          label={t('createEvent.reqBudgetFixedPlaceholder')}
          leftIcon="dollar-sign"
          value={item.budgetFixed != null ? String(item.budgetFixed) : ''}
          onChangeText={(v) => onChange({ ...item, budgetFixed: parseInt(v.replace(/[^0-9]/g, ''), 10) || null })}
          keyboardType="number-pad"
        />
      )}
      {item.budgetType === 'RANGE' && (
        <View style={rq.budgetRangeRow}>
          <View style={{ flex: 1 }}>
            <TextInputWithLabel
              label={t('createEvent.aiBudgetMinLabel')}
              leftIcon="dollar-sign"
              value={item.budgetMin != null ? String(item.budgetMin) : ''}
              onChangeText={(v) => onChange({ ...item, budgetMin: parseInt(v.replace(/[^0-9]/g, ''), 10) || null })}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInputWithLabel
              label={t('createEvent.aiBudgetMaxLabel')}
              leftIcon="dollar-sign"
              value={item.budgetMax != null ? String(item.budgetMax) : ''}
              onChangeText={(v) => onChange({ ...item, budgetMax: parseInt(v.replace(/[^0-9]/g, ''), 10) || null })}
              keyboardType="number-pad"
            />
          </View>
        </View>
      )}

      {/* Per-role completion type — a "1 DJ + 1 photographer" campaign mixes
          SERVICE and DELIVERABLE roles, and the AI's per-role guess is exactly
          what a brand needs to be able to correct: a DJ wrongly marked
          DELIVERABLE would be asked to upload files that don't exist. */}
      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createOpportunity.completionLabel')}</Text>
      <CompletionTypePicker
        value={item.completionType}
        reason={item.completionReason}
        onChange={(v) => onChange({ ...item, completionType: v, completionReason: v === item.completionType ? item.completionReason : '' })}
        colors={C}
        t={t}
      />

      {/* Only a "Content Creator" role gets the content-piece counter — every
          other role (Model, Photographer, DJ, ...) gets a free-text brief of
          what they should actually do instead. See RequirementRoleEditor for
          the same conditional applied to the Publish step's per-role sheet. */}
      {item.categoryName === 'Content Creator' ? (
        <>
          <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqDeliverablesLabel')}</Text>
          <DeliverablesCounterList
            value={item.deliverables}
            onChange={(v) => onChange({ ...item, deliverables: v })}
            colors={C}
            t={t}
          />
        </>
      ) : (
        <>
          <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqDescriptionLabel')}</Text>
          <TextInputWithLabel
            label={t('createEvent.reqDescriptionPlaceholder')}
            value={item.description}
            onChangeText={(v) => onChange({ ...item, description: v })}
            multiline
            numberOfLines={3}
          />
        </>
      )}

      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqFormatLabel')}</Text>
      <ChipMultiGroup
        options={FORMAT_OPTIONS}
        values={item.format}
        onChange={(v) => onChange({ ...item, format: v })}
        colors={C}
      />
    </View>
  );
}

// The Publish step's per-role edit sheet, opened from a "People Needed"
// row's pencil icon — covers everything about one role (category, quantity,
// budget, content ask) in one place, since there's no separate Draft step to
// own category/quantity anymore.
function RequirementRoleEditor({
  item, providerCategoryOptions, onChange, colors, t,
}: {
  item: RequirementFormItem;
  providerCategoryOptions: { id: string; label: string; icon: string; color: string }[];
  onChange: (next: RequirementFormItem) => void;
  colors: ReturnType<typeof useAppColors>;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const C = colors;
  const budgetTypeLabels: Record<(typeof BUDGET_TYPE_OPTIONS)[number], string> = {
    FIXED: t('createEvent.reqBudgetFixed'),
    RANGE: t('createEvent.reqBudgetRange'),
    NEGOTIABLE: t('createEvent.reqBudgetNegotiable'),
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={[rq.fieldLabel, { color: C.textSecondary, marginTop: 0 }]}>{t('createEvent.reqCategoryLabel')}</Text>
      <ChipGroup
        options={providerCategoryOptions.map((c) => c.label)}
        value={item.categoryName}
        onChange={(label) => {
          const cat = providerCategoryOptions.find((c) => c.label === label);
          if (!cat) return;
          onChange({ ...item, categoryId: cat.id, categoryName: cat.label, categoryIcon: cat.icon, categoryColor: cat.color });
        }}
        colors={C}
      />

      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqQuantityLabel')}</Text>
      <Stepper value={item.quantity} onChange={(v) => onChange({ ...item, quantity: v })} min={1} max={20} colors={C} />

      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqBudgetTypeLabel')}</Text>
      <ChipGroup
        options={BUDGET_TYPE_OPTIONS.map((k) => budgetTypeLabels[k])}
        value={budgetTypeLabels[item.budgetType]}
        onChange={(label) => {
          const key = BUDGET_TYPE_OPTIONS.find((k) => budgetTypeLabels[k] === label) ?? 'FIXED';
          onChange({ ...item, budgetType: key });
        }}
        colors={C}
      />

      {item.budgetType === 'FIXED' && (
        <TextInputWithLabel
          label={t('createEvent.reqBudgetFixedPlaceholder')}
          leftIcon="dollar-sign"
          value={item.budgetFixed != null ? String(item.budgetFixed) : ''}
          onChangeText={(v) => onChange({ ...item, budgetFixed: parseInt(v.replace(/[^0-9]/g, ''), 10) || null })}
          keyboardType="number-pad"
        />
      )}
      {item.budgetType === 'RANGE' && (
        <View style={rq.budgetRangeRow}>
          <View style={{ flex: 1 }}>
            <TextInputWithLabel
              label={t('createEvent.aiBudgetMinLabel')}
              leftIcon="dollar-sign"
              value={item.budgetMin != null ? String(item.budgetMin) : ''}
              onChangeText={(v) => onChange({ ...item, budgetMin: parseInt(v.replace(/[^0-9]/g, ''), 10) || null })}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextInputWithLabel
              label={t('createEvent.aiBudgetMaxLabel')}
              leftIcon="dollar-sign"
              value={item.budgetMax != null ? String(item.budgetMax) : ''}
              onChangeText={(v) => onChange({ ...item, budgetMax: parseInt(v.replace(/[^0-9]/g, ''), 10) || null })}
              keyboardType="number-pad"
            />
          </View>
        </View>
      )}

      {/* Per-role completion type — a "1 DJ + 1 photographer" campaign mixes
          SERVICE and DELIVERABLE roles, and the AI's per-role guess is exactly
          what a brand needs to be able to correct: a DJ wrongly marked
          DELIVERABLE would be asked to upload files that don't exist. */}
      <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createOpportunity.completionLabel')}</Text>
      <CompletionTypePicker
        value={item.completionType}
        reason={item.completionReason}
        onChange={(v) => onChange({ ...item, completionType: v, completionReason: v === item.completionType ? item.completionReason : '' })}
        colors={C}
        t={t}
      />

      {item.categoryName === 'Content Creator' ? (
        <>
          <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqDeliverablesLabel')}</Text>
          <DeliverablesCounterList
            value={item.deliverables}
            onChange={(v) => onChange({ ...item, deliverables: v })}
            colors={C}
            t={t}
          />
        </>
      ) : (
        <>
          <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqDescriptionLabel')}</Text>
          <TextInputWithLabel
            label={t('createEvent.reqDescriptionPlaceholder')}
            value={item.description}
            onChangeText={(v) => onChange({ ...item, description: v })}
            multiline
            numberOfLines={3}
          />
        </>
      )}
    </View>
  );
}

const FORMAT_OPTIONS = ['JPG', 'PNG', 'MP4', 'PDF', 'Other'];

const rq = StyleSheet.create({
  card:       { borderRadius: RADIUS.md, borderWidth: 1, padding: 12, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle:  { fontSize: 13, fontFamily: F.bold },
  fieldLabel: { fontSize: 12, fontFamily: F.medium, marginTop: 4 },
  input:      { borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, height: 46, fontSize: 14, fontFamily: F.regular },
  budgetRangeRow: { flexDirection: 'row', gap: 10 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 12 },
  addBtnText: { fontSize: 14, fontFamily: F.semibold },
  // Solid confirm button that commits a drafted role from the add sheet.
  commitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, height: 48, marginTop: 6 },
  commitBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },
  errorText:  { fontSize: 12, color: '#EF4444', fontFamily: F.regular },
});

// ─── PeopleNeededRow (Publish-step recap — one row per role, tap to edit) ──────

function PeopleNeededRow({
  label, budget, work, completion, onEdit, onRemove, colors, last,
}: {
  label: string;
  budget: string;
  // Short preview of what this role should actually do — the free-text
  // description for non-Content-Creator roles, or a deliverables summary for
  // Content Creator roles. Omitted when there's nothing to show yet.
  work?: string;
  // "Service" / "Submits deliverables" — see completionLabel. Undefined until
  // the AI (or the business) has classified this role.
  completion?: { label: string; isService: boolean };
  onEdit: () => void;
  onRemove?: () => void;
  colors: ReturnType<typeof useAppColors>;
  last?: boolean;
}) {
  const C = colors;
  return (
    <View style={[pn.row, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <Pressable onPress={onEdit} style={{ flex: 1, gap: 3 }}>
        <Text style={[pn.roleLabel, { color: C.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[pn.metaLabel, { color: C.textSecondary }]} numberOfLines={1}>{budget}</Text>
        {work ? <Text style={[pn.workLabel, { color: C.textSecondary }]} numberOfLines={2}>{work}</Text> : null}
        {completion ? (
          <View style={[pn.completionChip, { backgroundColor: completion.isService ? '#EEF2FF' : '#F0FDF4' }]}>
            <FontAwesome5 name={completion.isService ? 'handshake' : 'cloud-upload-alt'} solid size={10} color={completion.isService ? '#4F46E5' : '#059669'} />
            <Text style={[pn.completionChipTxt, { color: completion.isService ? '#4F46E5' : '#059669' }]}>{completion.label}</Text>
          </View>
        ) : null}
      </Pressable>
      {onRemove && (
        <Pressable hitSlop={8} onPress={onRemove} style={[pn.editBtn, { backgroundColor: `${C.textSecondary}1A` }]}>
          <FontAwesome5 name="trash-alt" size={12} color={C.textSecondary} />
        </Pressable>
      )}
      <Pressable onPress={onEdit} style={[pn.editBtn, { backgroundColor: `${C.brinjal1}1A` }]}>
        <FontAwesome5 name="pen" solid size={12} color={C.brinjal1} />
      </Pressable>
    </View>
  );
}

const pn = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  roleLabel: { fontSize: 14, fontFamily: F.semibold },
  metaLabel: { fontSize: 12, fontFamily: F.regular },
  workLabel: { fontSize: 12, fontFamily: F.regular, lineHeight: 18, marginTop: 1 },
  completionChip:   { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: 3 },
  completionChipTxt:{ fontSize: 11, fontFamily: F.semibold },
  editBtn:  { width: 28, height: 28, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
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
          <Pressable
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
        <Pressable style={cal.navBtn} onPress={() => {
          if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
          else setCalMonth((m) => m - 1);
        }}>
          <Text style={[cal.navTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[cal.monthTitle, { color: C.text }]}>{MONTHS[calMonth]} {calYear}</Text>
        <Pressable style={cal.navBtn} onPress={() => {
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
            <Pressable key={`d${day}`} style={cal.cell} disabled={past}
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
  navTxt:    { fontSize: 28, lineHeight: 42 },
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
      <Pressable
        style={[dp.trigger, { flexDirection: 'row', alignItems: 'center', borderColor: error ? ERROR_RED : value ? C.brinjal1 : C.border, backgroundColor: C.background, height: 50 }]}
        onPress={() => setOpen(true)}>
        <Text style={[{ flex: 1, fontSize: 15, fontFamily: F.regular, color: value ? C.text : C.textSecondary }]}>
          {value ? fmtDate(value) : t('createEvent.deadlineTapToSelect')}
        </Text>
        {value ? (
          <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onChange(null); }}>
            <FontAwesome5 name="times-circle" solid size={18} color={C.textSecondary} />
          </Pressable>
        ) : (
          <FontAwesome5 name="calendar-alt" size={18} color={C.textSecondary} />
        )}
      </Pressable>
      {error && <Text style={dp.error}>{error}</Text>}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label ?? t('createEvent.deadlineDefaultLabel')} maxHeightPct={0.7}>
        {value && (
          <View style={[{ borderRadius: RADIUS.sm, padding: 10, backgroundColor: C.primaryLight }]}>
            <Text style={[{ fontSize: 13, fontFamily: F.bold, color: C.brinjal1 }]}>{t('createEvent.deadlineSelected', { date: fmtDate(value) })}</Text>
          </View>
        )}
        <View style={{ marginTop: 16 }}>
          <CalendarGrid value={value} onChange={(d) => { onChange(d); setOpen(false); }} colors={C} />
        </View>
      </BottomSheet>
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCampaignScreen() {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const notRequiredLabel = t('createEvent.notRequired');
  const [phase, setPhase] = useState<Phase>('chooseType');
  const [loading, setLoading] = useState(false);
  const [publishWarnVisible, setPublishWarnVisible] = useState(false);
  const [publishedCampaign, setPublishedCampaign] = useState<{ id: string; category: string; lat: number | null; lng: number | null; budgetMin?: number; budgetMax?: number } | null>(null);

  function handleRecommendedDone() {
    setPublishedCampaign(null);
    router.replace('/(business)/');
  }
  const [reviewErrors, setReviewErrors] = useState<ReviewErrors>({});
  const scrollRef = useRef<ScrollView>(null);
  // Set when "Edit details" drops from a new-flow draft/publish screen into
  // the legacy review/roles/confirm editor, so back-navigation out of review
  // returns to the right draft screen instead of the legacy 'setup' screen.
  // Read by the header back-button and the review phase's own back link.
  const cameFromNewFlowRef = useRef<'publish' | 'inviteDraft' | null>(null);
  const { categories: liveCategories } = useCategories('BUSINESS');
  const categoryOptions = liveCategories.map((c) => ({ label: c.name, icon: c.icon, color: c.color }));
  const { platforms: livePlatforms } = usePlatforms();
  const platformOptions = livePlatforms.map((p) => p.name);

  const [form, setForm] = useState<FormData>({
    template: '',
    goals: [GOAL_OPTIONS[0]!],
    budget: '',
    creatorType: [],
    platforms: ['Instagram'],
    location: '',
    locationType: 'ONSITE',
    creatorsNeeded: 1,
    deliverables: { ...DEFAULT_DELIVERABLES },
    title: '',
    description: '',
    featureImageUrl: null,
    deadline: dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    isFeatured: false,
    // Open Event / Free Invitation fields
    eventType:    'PAID_CAMPAIGN',
    eventDate:    dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    venue:        '',
    capacity:     20,
    benefits:     [],
    exchangeType: [],
    expectedContent: '',
    roleTypes:    ['Content Creators'],
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
    completionType: null,
    completionReason: '',
    requirements: [],
  });

  // The business's own onboarding-selected categories — used only to pick
  // which category's Quick Templates to show below (their primary/first
  // selected industry), not to prefill the category field itself (that's
  // still decided by AI generation or edited in the review phase).
  const [businessCategories, setBusinessCategories] = useState<string[]>([]);
  useEffect(() => {
    profileService.getBusinessProfile().then((profile) => {
      if (profile.location) {
        setForm((prev) => ({ ...prev, location: profile.location!, venue: profile.location! }));
      }
      setBusinessCategories(profile.categories ?? []);
    }).catch(() => { /* location/categories stay empty */ });
  }, []);

  // The AI generate call below has a 50s ceiling, but a Render free-plan
  // backend that has spun down needs 30-60s just to boot — which is why the
  // first Generate press after an idle period used to land on the fallback
  // template. Waking it here, while the brand is still writing their prompt,
  // means the request usually meets a warm instance. Fire-and-forget by design.
  useEffect(() => { warmUpBackend(); }, []);

  // Fails open (stays null → toggle isn't locked) if this errors — the
  // backend still enforces the quota server-side on publish either way.
  const [featuredQuota, setFeaturedQuota] = useState<{ freeQuota: number; used: number; remaining: number; price: number; unlimited: boolean } | null>(null);
  useEffect(() => {
    campaignService.getFeaturedQuota().then(setFeaturedQuota).catch(() => {});
  }, []);
  const featuredLocked = featuredQuota !== null && !featuredQuota.unlimited && featuredQuota.remaining <= 0;

  // 'single' (default, every existing campaign) vs 'multiple' distinct
  // provider roles (§ CampaignRequirement) — an opt-in toggle so the
  // single-role flow above is completely untouched when off. Auto-set to
  // 'multiple' when the AI detects a multi-role brief, but always
  // user-editable in the review step (AI drafts are never silently trusted).
  const [requirementMode, setRequirementMode] = useState<'single' | 'multiple'>('single');
  const { categories: providerCategories } = useCategories('CREATOR');
  const providerCategoryOptions = providerCategories.map((c) => ({ id: c.id, label: c.name, icon: c.icon, color: c.color }));

  // How the business describes their event to the AI — typed text (default)
  // or a held-mic voice recording. A recording is only transcribed once the
  // page's own "Create Event" button is pressed — VoicePromptInput just
  // records/replays and hands back the uri via onRecorded.
  const [promptMode, setPromptMode] = useState<'text' | 'audio'>('text');
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  // Which Quick Audio Sample (if any) is currently being read aloud via TTS —
  // null when nothing is playing.
  const [playingSampleIdx, setPlayingSampleIdx] = useState<number | null>(null);
  // "Need Help?" walkthrough modal — center card, not the bottom sheets used
  // elsewhere on this screen. helpPlayingLang tracks which script (if any)
  // is currently being read aloud.
  const [needHelpVisible, setNeedHelpVisible] = useState(false);
  const [helpPlayingLang, setHelpPlayingLang] = useState<'en' | 'ne' | null>(null);
  const [aiPromptText, setAiPromptText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlaceholder] = useState(() => getPromptExamples(businessCategories[0], language)[0]);
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
  // Publish screen's "Applications close" row opens this directly, same
  // pattern as locationModalOpen above — deadline used to live in its own
  // standalone card (DeadlinePicker manages its own sheet internally), but
  // that's redundant now that the summary row itself is tappable.
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  // Free Invitation publish screen's "Event date"/"Capacity" rows open these
  // directly, same pattern as deadlinePickerOpen above.
  const [eventDatePickerOpen, setEventDatePickerOpen] = useState(false);
  const [capacityPickerOpen, setCapacityPickerOpen] = useState(false);

  // Which field's small BottomSheet editor is open on the Publish/Invite Draft
  // screens — null means none. Location uses the LocationSearchModal above
  // instead (already built, no need for a second picker); Paid's per-role
  // editing uses its own sheet instead (see editingRequirementKey below).
  const [editingField, setEditingField] = useState<'title' | 'description' | 'category' | 'budget' | 'roles' | 'deliverables' | 'image' | 'hashtags' | 'offerings' | 'exchangeType' | 'expectedContent' | 'roleTypes' | 'completionType' | null>(null);
  // Publish step's "People Needed" card — tap a role's pencil icon to edit
  // just its budget + content in a sheet, without leaving the summary.
  // '__single__' edits the single-role form.aiBudgetMin/Max + form.deliverables
  // instead of a specific requirements[] entry.
  const [editingRequirementKey, setEditingRequirementKey] = useState<string | '__single__' | null>(null);
  // A role being composed by "Add another role" — it lives here, NOT in
  // form.requirements, until the sheet's "Add role" button commits it. Adding
  // it up-front meant dismissing the sheet (swipe-down/backdrop) left a blank
  // default role like "Actor/Actress ×1" stuck in the campaign.
  const [draftRequirement, setDraftRequirement] = useState<RequirementFormItem | null>(null);

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setLocationModalOpen(false);
    setLocationLat(lat || null);
    setLocationLng(lng || null);
    if (form.eventType === 'OPEN_EVENT') {
      update('venue', address);
    } else {
      update('location', address);
    }
    if (aiLocationError) setAiLocationError(undefined);
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

  function resetFormForType(newType: 'PAID_CAMPAIGN' | 'OPEN_EVENT', targetPhase: Phase = 'setup') {
    const eventDate   = dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
    setForm((prev) => ({
      template:       '',
      goals:          [GOAL_OPTIONS[0]!],
      budget:         '',
      creatorType:    [],
      platforms:      ['Instagram'],
      location:       prev.location,
      locationType:   prev.locationType,
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
      exchangeType:   [],
      expectedContent: '',
      roleTypes:      ['Content Creators'],
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
      completionType: null,
      completionReason: '',
      requirements: [],
    }));
    setRequirementMode('single');
    setReviewErrors({});
    setAiPromptText('');
    setAiLocationError(undefined);
    setPhase(targetPhase);
  }

  // `promptOverride` lets the Audio prompt mode (a transcribed recording) feed
  // straight into the exact same generate flow as the Text mode's button —
  // used instead of `aiPromptText` state so the call doesn't race the
  // setAiPromptText() update that would otherwise still be pending when this
  // fires immediately after a successful transcription.
  async function handleGenerateWithAi(promptOverride?: string, targetPhase: Phase = 'review') {
    const prompt = (promptOverride ?? aiPromptText).trim();
    if (!prompt || aiLoading) return;
    // The new Describe screen (targetPhase 'publish') has no location field —
    // AI extracts location from the prompt itself, and a miss is caught by
    // the Publish screen's "double-check" callout instead of blocking here.
    if (targetPhase !== 'publish' && form.locationType === 'ONSITE' && !form.location.trim()) {
      setAiLocationError(t('createEvent.errNoLocation'));
      return;
    }
    setAiLocationError(undefined);
    setAiLoading(true);
    // promptOverride is only ever passed with a Whisper transcription (see
    // handleCreateEventPress) — that's the one signal the backend needs to
    // trust the transcription's detected language over the app's UI language.
    const inputSource = promptOverride !== undefined ? 'voice' : 'text';
    try {
      const draft = await campaignService.generateWithAi(prompt, inputSource);
      setForm((prev) => ({ ...prev, ...mapAiCampaignDraftToForm(draft, prompt, prev, providerCategoryOptions) }));
      // Never silently invent a breakdown — only switch modes when the AI
      // itself populated requirements; the business can still toggle either
      // way manually once in the roles step.
      setRequirementMode(draft.requirements.length > 0 ? 'multiple' : 'single');
      setAiPromptText('');
      setPhase(targetPhase);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      // The request succeeded but the backend couldn't reach OpenAI and served
      // a canned draft — say so, otherwise it's indistinguishable from a real
      // AI result and the brand publishes boilerplate thinking it was written
      // for them. Deliberately different wording from the catch below so the
      // two failure modes are tellable apart from a screenshot alone.
      if (draft.aiFallback) showToast(t('createEvent.aiServiceFallback'), 'error');
    } catch (err) {
      // The AI understood the prompt fine but decided it isn't a campaign at all
      // (small talk, unrelated question, near-silent audio) — a content rejection,
      // not an infra failure, so it gets the AI's own clarifying message instead
      // of a fabricated draft. Stays on the setup screen so the brand can retype
      // or re-record.
      if (err instanceof ApiError && err.code === 'NO_CAMPAIGN_INTENT') {
        showToast(err.message, 'error');
        return;
      }
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
        aiPrompt:              prompt,
        aiSuggestedCategories: [],
        aiSuggestedPlatforms:  [],
        needsInput:            ['budgetMin', 'category'],
        aiBudgetMin: GENERIC_AI_TEMPLATE.budgetMin,
        aiBudgetMax: GENERIC_AI_TEMPLATE.budgetMax,
        requirements: [],
      }));
      setRequirementMode('single');
      setAiPromptText('');
      setPhase(targetPhase);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      showToast(t('createEvent.aiNetworkFallback'), 'error');
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

  async function handleGenerateEventWithAi(promptOverride?: string, targetPhase: Phase = 'review') {
    const prompt = (promptOverride ?? aiPromptText).trim();
    if (!prompt || aiLoading) return;
    // The inviteDescribe screen has no venue field — AI extracts location
    // from the prompt itself, and any missing venue is filled in afterwards
    // on whichever screen the flow lands on (inviteDraft's own location
    // picker, or invitePublish's when step 3 is skipped), same reasoning as
    // handleGenerateWithAi's targetPhase 'publish' bypass.
    if (targetPhase !== 'inviteDraft' && targetPhase !== 'invitePublish' && form.locationType === 'ONSITE' && !form.venue.trim()) {
      setAiLocationError(t('createEvent.errNoVenue'));
      return;
    }
    setAiLocationError(undefined);
    setAiLoading(true);
    const defaultEventDate = dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    // See handleGenerateWithAi — promptOverride only ever comes from a
    // Whisper transcription.
    const inputSource = promptOverride !== undefined ? 'voice' : 'text';
    // Free Invitation flow only: fold in the offerings already picked on
    // 'inviteOffer' as context, so the AI's title/description reflect them
    // without a dedicated request field on the backend.
    const requestPrompt = form.eventType === 'OPEN_EVENT' && form.benefits.length > 0
      ? `${prompt}\n\n(We're offering: ${form.benefits.join(', ')}.)`
      : prompt;
    try {
      const draft = await campaignService.generateEventWithAi(requestPrompt, inputSource);
      setForm((prev) => ({ ...prev, ...mapAiEventDraftToForm(draft, prompt, prev) }));
      setAiPromptText('');
      setPhase(targetPhase);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      // Same reasoning as handleGenerateWithAi's success path above.
      if (draft.aiFallback) showToast(t('createEvent.aiServiceFallback'), 'error');
    } catch (err) {
      // Same reasoning as handleGenerateWithAi's catch above: a content
      // rejection (no event intent detected) gets the AI's own clarifying
      // message and stays on the setup screen, not a fabricated draft.
      if (err instanceof ApiError && err.code === 'NO_CAMPAIGN_INTENT') {
        showToast(err.message, 'error');
        return;
      }
      // Same reasoning as handleGenerateWithAi's catch above: the backend already
      // falls back to a dummy draft for OpenAI-specific failures, so reaching this
      // catch means the request itself never came back.
      const fallbackCategory = categoryOptions.find((c) => c.label === 'Lifestyle')?.label ?? categoryOptions[0]?.label ?? '';
      const fallbackPlatform = platformOptions.find((p) => p === 'Instagram') ?? platformOptions[0] ?? '';
      setForm((prev) => {
        const eventDate = prev.eventDate ?? defaultEventDate;
        const regDeadline = dayStart(new Date(eventDate.getTime() - 2 * 24 * 60 * 60 * 1000));
        return {
          ...prev,
          template:    fallbackCategory,
          platforms:   fallbackPlatform ? [fallbackPlatform] : [],
          title:       GENERIC_FREE_EVENT_TEMPLATE.title,
          description: GENERIC_FREE_EVENT_TEMPLATE.description,
          benefits:    GENERIC_FREE_EVENT_TEMPLATE.benefits,
          capacity:    GENERIC_FREE_EVENT_TEMPLATE.capacity,
          exchangeType:    GENERIC_FREE_EVENT_TEMPLATE.exchangeType,
          expectedContent: GENERIC_FREE_EVENT_TEMPLATE.expectedContent,
          eventDate,
          deadline:    regDeadline,
          featureImageUrl:       prev.featureImageUrl ?? getTemplateImage(fallbackCategory, fallbackCategory) ?? null,
          aiGenerated:           true,
          aiPrompt:              prompt,
          aiSuggestedCategories: [],
          aiSuggestedPlatforms:  [],
          needsInput:            [],
        };
      });
      setAiPromptText('');
      setPhase(targetPhase);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      showToast(t('createEvent.aiNetworkFallback'), 'error');
    } finally {
      setAiLoading(false);
    }
  }

  // VoicePromptInput hands back a uri once a recording passes basic
  // validation — remembered here until the page's own Create Event button
  // (below) is pressed, which is what actually transcribes + generates.
  function handleAudioRecorded(uri: string) {
    setRecordedAudioUri(uri);
  }

  function handleAudioDiscard() {
    setRecordedAudioUri(null);
  }

  function handleAudioError(message: string) {
    showToast(message, 'error');
  }

  // Shared by both the Paid and Open Event "Create Event" buttons. In Text
  // mode this is just handleGenerateWithAi/handleGenerateEventWithAi, same as
  // before. In Audio mode, the recording sitting in `recordedAudioUri` is
  // transcribed first, then fed into that exact same generate flow — so
  // audio and text ultimately produce a draft the identical way.
  async function handleCreateEventPress(targetPhase: Phase = 'review') {
    if (promptMode === 'audio') {
      if (!recordedAudioUri || aiLoading || transcribingAudio) return;
      setTranscribingAudio(true);
      try {
        const text = await transcribeAudio(recordedAudioUri);
        if (!text.trim()) {
          showToast(t('createEvent.audioTryAgain'), 'error');
          return;
        }
        setRecordedAudioUri(null);
        if (form.eventType === 'PAID_CAMPAIGN') await handleGenerateWithAi(text, targetPhase);
        else await handleGenerateEventWithAi(text, targetPhase);
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('createEvent.audioTryAgain'), 'error');
      } finally {
        setTranscribingAudio(false);
      }
      return;
    }
    if (form.eventType === 'PAID_CAMPAIGN') void handleGenerateWithAi(undefined, targetPhase);
    else void handleGenerateEventWithAi(undefined, targetPhase);
  }

  // Quick Audio Samples — tap to hear an example via on-device TTS (no real
  // recorded audio assets are used), tap the same one again to stop.
  // Nepali (ne-NP) voices are rarely installed on-device and TTS falls back
  // to mispronouncing the Devanagari text — Hindi voices are near-universally
  // available and read the same script far more reliably, so Nepali samples
  // are read with a Hindi voice instead.
  function handlePlaySample(idx: number, text: string, lang: 'en' | 'ne') {
    Speech.stop();
    if (playingSampleIdx === idx) {
      setPlayingSampleIdx(null);
      return;
    }
    setPlayingSampleIdx(idx);
    Speech.speak(text, {
      language: lang === 'ne' ? 'hi-IN' : 'en-US',
      onDone:    () => setPlayingSampleIdx(null),
      onStopped: () => setPlayingSampleIdx(null),
      onError:   () => setPlayingSampleIdx(null),
    });
  }

  // "Need Help?" walkthrough — same tap-to-play/tap-to-stop TTS pattern as
  // Quick Audio Samples above (Nepali read with a Hindi voice). While one
  // script is playing the other card is disabled rather than allowed to
  // interrupt it, since the two scripts would otherwise talk over each other.
  function handlePlayHelp(lang: 'en' | 'ne') {
    Speech.stop();
    if (helpPlayingLang === lang) {
      setHelpPlayingLang(null);
      return;
    }
    setHelpPlayingLang(lang);
    Speech.speak(lang === 'ne' ? NEED_HELP_SCRIPT_NE : NEED_HELP_SCRIPT_EN, {
      language: lang === 'ne' ? 'hi-IN' : 'en-US',
      onDone:    () => setHelpPlayingLang(null),
      onStopped: () => setHelpPlayingLang(null),
      onError:   () => setHelpPlayingLang(null),
    });
  }

  function closeNeedHelp() {
    Speech.stop();
    setHelpPlayingLang(null);
    setNeedHelpVisible(false);
  }

  function buildPaidCampaignPayload() {
    // Multi-role mode: category/budgetMin/budgetMax/creatorsNeeded below are
    // saved as an informational summary only — requirements[] is what
    // applicants actually apply against (see createCampaignSchema's comment
    // on the backend). Derive the summary from the roles instead of asking
    // the business to fill it in twice.
    const isMultiRole = requirementMode === 'multiple' && form.requirements.length > 0;
    const reqBudgetBounds = form.requirements.map((r) => (
      r.budgetType === 'FIXED' ? [r.budgetFixed ?? 0, r.budgetFixed ?? 0]
      : r.budgetType === 'RANGE' ? [r.budgetMin ?? 0, r.budgetMax ?? 0]
      : [0, 0]
    ));
    const budget = isMultiRole
      ? {
          min: Math.min(...reqBudgetBounds.map(([min]) => min)),
          max: Math.max(...reqBudgetBounds.map(([, max]) => max)),
          payment: 'Fixed Fee',
        }
      : { min: form.aiBudgetMin, max: form.aiBudgetMax, payment: 'Fixed Fee' };
    return {
      title:          form.title.trim() || t('createEvent.untitledEvent'),
      description:    form.description.trim(),
      template:       form.template,
      featureImageUrl: form.featureImageUrl ?? undefined,
      category:       isMultiRole ? form.requirements[0]!.categoryName : form.template,
      goals:          form.goals,
      platforms:      form.platforms,
      location:       form.locationType === 'REMOTE' ? undefined : (form.location.trim() || undefined),
      locationLat:    form.locationType === 'REMOTE' ? undefined : (locationLat ?? undefined),
      locationLng:    form.locationType === 'REMOTE' ? undefined : (locationLng ?? undefined),
      locationType:   form.locationType,
      minFollowers:   0,
      contentType:    form.goals[0] ?? '',
      // Multi-role: the flat top-level field becomes an informational summary
      // (see comment above) — join each role's own content spec instead of
      // the untouched campaign-wide default, so old clients reading this
      // field still see something that matches what was actually asked for.
      deliverables:   isMultiRole
        ? form.requirements.map((r) => `${r.categoryName}: ${summarizeDeliverables(r.deliverables, [], t)}`).join('; ')
        : summarizeDeliverables(form.deliverables, form.goals, t),
      deadline:       form.deadline!.toISOString(),
      budgetMin:      budget.min,
      budgetMax:      budget.max,
      paymentType:    budget.payment,
      creatorsNeeded: isMultiRole ? form.requirements.reduce((sum, r) => sum + r.quantity, 0) : form.creatorsNeeded,
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
      completionType:   form.completionType ?? undefined,
      completionReason: form.completionType ? (form.completionReason || undefined) : undefined,
      requirements: isMultiRole
        ? form.requirements.map((r) => ({
            categoryId:  r.categoryId,
            quantity:    r.quantity,
            budgetType:  r.budgetType,
            budgetFixed: r.budgetType === 'FIXED' ? (r.budgetFixed ?? undefined) : undefined,
            budgetMin:   r.budgetType === 'RANGE' ? (r.budgetMin ?? undefined) : undefined,
            budgetMax:   r.budgetType === 'RANGE' ? (r.budgetMax ?? undefined) : undefined,
            format:      r.format,
            deliverables: summarizeDeliverables(r.deliverables, [], t),
            description: r.description || undefined,
            completionType:   r.completionType ?? undefined,
            completionReason: r.completionType ? (r.completionReason || undefined) : undefined,
          }))
        : undefined,
    };
  }

  function buildOpenEventPayload() {
    return {
      title:          form.title.trim(),
      description:    form.description.trim(),
      template:       form.template,
      featureImageUrl: form.featureImageUrl ?? undefined,
      category:       form.template,
      goals:          ['Event Promotion', 'Brand Awareness'],
      platforms:      form.platforms,
      location:       form.locationType === 'REMOTE' ? undefined : (form.venue.trim() || undefined),
      locationLat:    form.locationType === 'REMOTE' ? undefined : (locationLat ?? undefined),
      locationLng:    form.locationType === 'REMOTE' ? undefined : (locationLng ?? undefined),
      locationType:   form.locationType,
      minFollowers:   0,
      // contentType/deliverables now carry the actual exchange ask (what we
      // want back), matching their role for PAID_CAMPAIGN — benefits (what
      // we're offering) has its own dedicated field below.
      contentType:    form.exchangeType.join(', ') || 'Just attend & share organically',
      deliverables:   [...form.exchangeType, form.expectedContent].filter(Boolean).join(' — '),
      deadline:       form.deadline!.toISOString(),
      budgetMin:      0,
      budgetMax:      0,
      paymentType:    'Non-monetary',
      creatorsNeeded: form.capacity,
      isFeatured:     form.isFeatured,
      campaignType:   'OPEN_EVENT' as const,
      capacity:       form.capacity,
      eventDate:      form.eventDate?.toISOString(),
      venue:          form.locationType === 'REMOTE' ? undefined : (form.venue.trim() || undefined),
      benefits:       form.benefits,
      targetAudience: form.roleTypes,
      completionType:   form.completionType ?? undefined,
      completionReason: form.completionType ? (form.completionReason || undefined) : undefined,
    };
  }

  async function handleSaveDraft() {
    if (loading) return;
    setLoading(true);
    try {
      const payload = form.eventType === 'PAID_CAMPAIGN' ? buildPaidCampaignPayload() : buildOpenEventPayload();
      await campaignService.create({ ...payload, status: 'DRAFT' });
      showToast(t('createEvent.toastDraftSaved'));
      setTimeout(() => router.replace('/(business)/'), 500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('createEvent.toastDraftFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  // "Who do you need?" + roles — validated at the roles → confirm transition
  // (see handleContinueToConfirm), since that's the step that now owns this data.
  function validateRoles(): ReviewErrors {
    const errs: ReviewErrors = {};
    if (requirementMode === 'multiple') {
      if (form.requirements.length === 0) {
        errs.requirements = t('createEvent.errNoRequirements');
      } else if (form.requirements.some((r) => !r.categoryId)) {
        errs.requirements = t('createEvent.errRequirementCategory');
      } else if (form.requirements.some((r) =>
        (r.budgetType === 'FIXED' && !(r.budgetFixed && r.budgetFixed > 0))
        || (r.budgetType === 'RANGE' && !(r.budgetMin != null && r.budgetMax != null && r.budgetMax >= r.budgetMin)))) {
        errs.requirements = t('createEvent.errRequirementBudget');
      }
    }
    return errs;
  }

  function validatePaidReview(): ReviewErrors {
    const errs: ReviewErrors = {};
    if (!form.title.trim())        errs.title    = t('createEvent.errNoTitle');
    if (!form.deadline)     errs.deadline = t('createEvent.errNoDeadline');
    if (requirementMode === 'single') {
      if (form.aiBudgetMin < MIN_BUDGET_PER_CREATOR) errs.budget = t('createEvent.errBudgetMin');
      // The Publish screen's Budget row opens BudgetTierPicker's custom
      // inputs, where the two numbers are typed independently — nothing else
      // stops a max below the min, which would publish an inverted range.
      else if (form.aiBudgetMax < form.aiBudgetMin) errs.budget = t('createEvent.errBudgetMinMax');
    }
    return errs;
  }

  function handleContinueToRoles() {
    const errs = validatePaidReview();
    if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
    setReviewErrors({});
    setPhase('roles');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleContinueToConfirm() {
    const errs = validateRoles();
    if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
    setReviewErrors({});
    setPhase('confirm');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function handlePublish() {
    if (form.eventType === 'PAID_CAMPAIGN') {
      const errs = { ...validateRoles(), ...validatePaidReview() };
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
        const campaign = await campaignService.create({ ...buildOpenEventPayload(), status: 'ACTIVE' });
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

  // Same min/max derivation buildPaidCampaignPayload() uses for a multi-role
  // budget — kept in sync here so the Confirm summary's Budget row shows the
  // range that will actually be submitted, not the (unused, hidden) single-role picker.
  const confirmBudgetRange = requirementMode === 'multiple' && form.requirements.length > 0
    ? form.requirements.reduce((acc, r) => {
        const [min, max] = r.budgetType === 'FIXED' ? [r.budgetFixed ?? 0, r.budgetFixed ?? 0]
          : r.budgetType === 'RANGE' ? [r.budgetMin ?? 0, r.budgetMax ?? 0]
          : [0, 0];
        return { min: Math.min(acc.min, min), max: Math.max(acc.max, max) };
      }, { min: Infinity, max: 0 })
    : { min: form.aiBudgetMin, max: form.aiBudgetMax };

  // One row per role for the Publish step's "People Needed" card — single-role
  // campaigns get one synthetic row from the top-level form fields instead of
  // a requirements[] entry, so the same card/row UI covers both modes.
  function formatRequirementBudget(r: RequirementFormItem): string {
    if (r.budgetType === 'FIXED') return `Rs. ${(r.budgetFixed ?? 0).toLocaleString()}`;
    if (r.budgetType === 'RANGE') return `Rs. ${(r.budgetMin ?? 0).toLocaleString()} – ${(r.budgetMax ?? 0).toLocaleString()}`;
    return t('createEvent.reqBudgetNegotiable');
  }
  const peopleRows = requirementMode === 'multiple' && form.requirements.length > 0
    ? form.requirements.map((r) => ({
        key: r.key,
        label: r.categoryName ? `${r.categoryName} ×${r.quantity}` : t('createEvent.reqRoleLabel', { n: 1 }),
        budget: formatRequirementBudget(r),
        // Content Creator roles show what content they'll produce; every
        // other role shows the free-text brief of what they should do.
        work: r.categoryName === 'Content Creator'
          ? summarizeDeliverables(r.deliverables, [], t)
          : (r.description || undefined),
        // Which roles hand over files vs. just show up and perform — the
        // single most consequential per-role setting, since it decides
        // whether that provider is ever asked to upload anything.
        completion: completionLabel(r.completionType, t),
        onEdit: () => setEditingRequirementKey(r.key),
        onRemove: () => update('requirements', form.requirements.filter((req) => req.key !== r.key)),
      }))
    : [{
        key: '__single__',
        label: form.template ? `${form.template} ×${form.creatorsNeeded}` : String(form.creatorsNeeded),
        budget: `Rs. ${form.aiBudgetMin.toLocaleString()} – ${form.aiBudgetMax.toLocaleString()}`,
        work: summarizeDeliverables(form.deliverables, form.goals, t) || undefined,
        completion: completionLabel(form.completionType, t),
        onEdit: () => setEditingRequirementKey('__single__'),
        onRemove: undefined as (() => void) | undefined,
      }];
  const editingRequirement = editingRequirementKey && editingRequirementKey !== '__single__'
    ? form.requirements.find((r) => r.key === editingRequirementKey) ?? null
    : null;

  // Drives the Draft screen's "double-check this" callout. Backend flags up
  // to 2 low-confidence fields via `needsInput`; only the "what/when/where"
  // tier blocks the flow with a callout (budget/creatorsNeeded/platform are
  // secondary — silently accepted). Location also gets a defensive local
  // check, since the Describe screen has no location field for the AI to
  // anchor a confident guess against.
  const draftNeedsAttention = form.needsInput.some((f) => f === 'category' || f === 'deadline' || f === 'location' || f === 'completionType')
    || (form.locationType === 'ONSITE' && !form.location.trim());

  // Open Event's needsInput vocabulary is narrower (no 'deadline' — see
  // EVENT_NEEDS_INPUT_FIELDS on the backend) — category/location are the
  // "what/where" required tier here; venue is the defensive local check
  // (inviteDescribe has no venue field, mirroring the Paid flow's location check).
  // 'completionType' is deliberately absent: a free event always completes the
  // same way (attend + share), so the flow never asks the business for it even
  // when the AI flags it as uncertain.
  const inviteDraftNeedsAttention = form.needsInput.some((f) => f === 'category' || f === 'location')
    || (form.locationType === 'ONSITE' && !form.venue.trim());

  // Three independent "tracks" now share this one screen: the new 3-step
  // "Create Opportunity" flow (describe → draft → publish, Paid Campaign),
  // the new 4-step "Create Free Invitation" flow (inviteOffer → inviteDescribe
  // → inviteDraft → invitePublish, Open Event), and the legacy 4-step editor
  // (setup → review → roles → confirm, reached as the "Edit details" fallback
  // from either new flow). 'chooseType' precedes all three and has no
  // progress pill of its own (see `showProgress` below). Each track computes
  // its own phase count/position.
  const isNewFlow = phase === 'describe' || phase === 'publish';
  const isInviteFlow = phase === 'inviteOffer' || phase === 'inviteDescribe' || phase === 'inviteDraft' || phase === 'invitePublish';
  const showProgress = phase !== 'chooseType';
  const totalPhases = isNewFlow ? 2 : isInviteFlow ? 4 : (form.eventType === 'PAID_CAMPAIGN' ? 4 : 2);
  const currentPhaseNum = phase === 'describe' ? 1
    : phase === 'publish' ? 2
    : phase === 'inviteOffer' ? 1
    : phase === 'inviteDescribe' ? 2
    : phase === 'inviteDraft' ? 3
    : phase === 'invitePublish' ? 4
    : phase === 'setup' ? 1
    : phase === 'review' ? 2
    : phase === 'roles' ? 3
    : 4; // confirm

  // Create Event button: in Text mode there must be something typed; in
  // Audio mode a recording must be sitting ready (see handleAudioRecorded).
  const canSubmitEvent = promptMode === 'text' ? aiPromptText.trim().length > 0 : !!recordedAudioUri;
  const aiBusy = aiLoading || transcribingAudio;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>

      {/* Header — borderless/floating, matching the home tab's header (an
          inset divider below separates it from content, not a hard border). */}
      <View style={[s.header, { backgroundColor: C.background }]}>
        <BackButton
          icon="chevron-left"
          onPress={() => {
            if (phase === 'publish') setPhase('describe');
            else if (phase === 'describe') setPhase('chooseType');
            else if (phase === 'invitePublish') setPhase('inviteDescribe');
            else if (phase === 'inviteDraft') setPhase('inviteDescribe');
            else if (phase === 'inviteDescribe') setPhase('inviteOffer');
            else if (phase === 'inviteOffer') setPhase('chooseType');
            else if (phase === 'confirm') setPhase('roles');
            else if (phase === 'roles') setPhase('review');
            else if (phase === 'review') setPhase(cameFromNewFlowRef.current ?? 'setup');
            else if (router.canGoBack()) router.back();
            else router.replace('/(business)/');
          }}
        />
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: C.text }]}>
            {phase === 'chooseType' ? t('createInvitation.headerTitleChoose')
              : isNewFlow ? t('createOpportunity.headerTitle')
              : isInviteFlow ? t('createInvitation.headerTitle')
              : t('createEvent.headerTitle')}
          </Text>
          {phase !== 'setup' && phase !== 'describe' && phase !== 'chooseType' && phase !== 'inviteOffer' && (
            <Text style={[s.headerSub, { color: C.textSecondary }]}>
              {phase === 'publish' ? t('createOpportunity.headerSubPublish')
                : phase === 'inviteDescribe' ? t('createInvitation.headerSubDescribe')
                : phase === 'inviteDraft' ? t('createInvitation.headerSubDraft')
                : phase === 'invitePublish' ? t('createInvitation.headerSubPublish')
                : phase === 'roles' ? t('createEvent.headerSubRoles')
                : phase === 'review' ? t('createEvent.headerSubReview')
                : t('createEvent.headerSubConfirm')}
            </Text>
          )}
        </View>
        {showProgress && (
          <View style={[s.phasePill, { backgroundColor: C.primaryLight }]}>
            <Text style={[s.phasePillText, { color: C.brinjal1 }]}>{currentPhaseNum}/{totalPhases}</Text>
          </View>
        )}
      </View>
      <View style={[s.headerDivider, { backgroundColor: C.border }]} />

      {/* Progress */}
      {showProgress && (
        <View style={[s.progressTrack, { backgroundColor: C.border }]}>
          <View style={[s.progressFill, { width: `${(currentPhaseNum / totalPhases) * 100}%`, backgroundColor: C.brinjal1 }]} />
        </View>
      )}

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

          {/* ── Top-level chooser — the new default boot phase. Tapping a card
              immediately routes into the matching AI-first flow; this is a
              deliberate one-time choice, not a toggle (unlike the legacy
              'setup' phase's own event-type cards below, which stay in place
              since that screen already commits to the legacy editor). ── */}
          {phase === 'chooseType' && (
            <View style={s.content}>
              <View style={{ gap: 6 }}>
                <Text style={[s.stepSectionHeading, { color: C.text, fontSize: 22 }]}>{t('createInvitation.chooseTypeHeadline')}</Text>
              </View>
              <View style={{ gap: 10 }}>
                {(
                  [
                    { key: 'PAID_CAMPAIGN' as const, icon: 'money-bill-alt' as const, title: t('createInvitation.chooseTypePaidTitle'), desc: t('createInvitation.chooseTypePaidSub'), example: t('createInvitation.chooseTypePaidExample'), tone: TabColors.brand },
                    { key: 'OPEN_EVENT'    as const, icon: 'gift' as const,            title: t('createInvitation.chooseTypeFreeTitle'), desc: t('createInvitation.chooseTypeFreeSub'), example: t('createInvitation.chooseTypeFreeExample'), tone: TabColors.info },
                  ]
                ).map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => resetFormForType(opt.key, opt.key === 'PAID_CAMPAIGN' ? 'describe' : 'inviteOffer')}
                    style={({ pressed }) => [
                      s.typeCard,
                      { backgroundColor: C.surface, borderColor: pressed ? opt.tone.color : C.border },
                      { transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}>
                    <View style={s.typeCardHeader}>
                      <View style={[s.typeCardIconWrap, { backgroundColor: opt.tone.bg, shadowColor: opt.tone.color }]}>
                        <FontAwesome5 name={opt.icon} size={22} color={opt.tone.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.typeCardTitle, { color: C.text }]}>{opt.title}</Text>
                        <Text style={[s.typeCardDesc, { color: C.textSecondary }]}>{opt.desc}</Text>
                      </View>
                    </View>

                    <View style={[s.typeCardExample, { backgroundColor: C.background, borderLeftColor: opt.tone.color }]}>
                      <FontAwesome5 name="lightbulb" solid size={12} color={opt.tone.color} />
                      <Text style={[s.typeCardExampleText, { color: C.textSecondary }]}>{opt.example}</Text>
                    </View>

                    <View style={s.typeCardFooter}>
                      <Text style={[s.typeCardCta, { color: opt.tone.color }]}>{t('createInvitation.chooseTypeCta')}</Text>
                      <FontAwesome5 name="arrow-right" solid size={12} color={opt.tone.color} />
                    </View>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => setNeedHelpVisible(true)}
                hitSlop={8}
                style={({ pressed }) => [s.needHelpPill, { borderColor: C.brinjal1, opacity: pressed ? 0.7 : 1 }]}>
                <FontAwesome5 name="question-circle" solid size={15} color={C.brinjal1} />
                <Text style={[s.needHelpLinkText, { color: C.brinjal1 }]}>{t('createEvent.needHelpLink')}</Text>
              </Pressable>
            </View>
          )}

          {/* ── Paid "Create Opportunity" flow, Phase 1: Describe — single AI
              prompt in, straight to the Publish screen below (no separate
              "here's what we understood" step). Reached only via
              'chooseType' picking Paid Opportunity. ── */}
          {phase === 'describe' && (
            <View style={s.content}>
              <View style={{ gap: 6 }}>
                <Text style={[s.stepSectionHeading, { color: C.text, fontSize: 22 }]}>{t('createOpportunity.describeHeadline')}</Text>
                <Text style={[s.optionDesc, { color: C.textSecondary }]}>{t('createOpportunity.describeSub')}</Text>
              </View>

              <SectionCard colors={C}>
                <View style={{ gap: 8 }}>
                  {(
                    [
                      { key: 'text' as const,  icon: 'edit' as const, title: t('createEvent.promptModeText'),  desc: t('createEvent.promptModeTextDesc'),  tone: TabColors.neutral },
                      { key: 'audio' as const, icon: 'microphone' as const,    title: t('createEvent.promptModeAudio'), desc: t('createEvent.promptModeAudioDesc'), tone: TabColors.positive },
                    ]
                  ).map((opt) => {
                    const selected = promptMode === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setPromptMode(opt.key)}
                        style={({ pressed }) => [
                          s.optionCard,
                          { backgroundColor: C.background, borderColor: selected ? opt.tone.color : C.border, padding: 12 },
                          selected && { backgroundColor: `${opt.tone.color}0D` },
                          { transform: [{ scale: pressed ? 0.97 : 1 }] },
                        ]}>
                        <View style={[s.optionIconWrap, { width: 34, height: 34, backgroundColor: opt.tone.bg, shadowColor: opt.tone.color }]}>
                          <FontAwesome5 name={opt.icon} size={16} color={opt.tone.color} />
                        </View>
                        <View style={s.optionTextWrap}>
                          <Text style={[s.optionTitle, { color: C.text }]}>{opt.title}</Text>
                          <Text style={[s.optionDesc, { color: C.textSecondary }]}>{opt.desc}</Text>
                        </View>
                        {selected && <FontAwesome5 name="check-circle" solid size={18} color={opt.tone.color} />}
                      </Pressable>
                    );
                  })}
                </View>

                {promptMode === 'text' ? (
                  <>
                    <TextInputWithLabel
                      label={t('createOpportunity.describeHeadline')}
                      value={aiPromptText}
                      onChangeText={(v) => setAiPromptText(v.slice(0, 500))}
                      placeholder={t('createOpportunity.promptPlaceholder')}
                      multiline
                      numberOfLines={5}
                      editable={!aiLoading}
                    />
                    <Text style={[ai.charCount, { color: C.textSecondary }]}>{aiPromptText.length}/500</Text>

                    <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createOpportunity.examplesLabel')}</Text>
                    <View style={ai.chipWrap}>
                      {getAllPromptExamples(businessCategories[0]).map((ex) => (
                        <Pressable
                          key={ex}
                          style={[ai.exampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                          onPress={() => setAiPromptText(ex)}
                          disabled={aiLoading}>
                          <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{ex}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <VoicePromptInput
                      onRecorded={handleAudioRecorded}
                      onDiscard={handleAudioDiscard}
                      onError={handleAudioError}
                      disabled={aiLoading || transcribingAudio}
                    />

                    <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiAudioSamplesLabel')}</Text>
                    <View style={ai.chipWrap}>
                      {getPromptSamples(businessCategories[0]).map(({ text, lang }, idx) => (
                        <Pressable
                          key={`${idx}-${text}`}
                          style={[ai.exampleChip, ai.sampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                          onPress={() => handlePlaySample(idx, text, lang)}
                          disabled={aiLoading}>
                          <FontAwesome5
                            name={playingSampleIdx === idx ? 'stop-circle' : 'play-circle'}
                            size={15}
                            color={playingSampleIdx === idx ? C.brinjal1 : C.textSecondary}
                          />
                          <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{text}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
              </SectionCard>

              {/* Create Opportunity */}
              <Pressable
                style={[s.generateBtn, { backgroundColor: (!canSubmitEvent || aiBusy) ? C.border : C.brinjal1 }]}
                onPress={() => void handleCreateEventPress('publish')}
                disabled={!canSubmitEvent || aiBusy}>
                {aiBusy ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={s.generateBtnText}>{t('createEvent.aiModalGenerating')}</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.generateBtnText}>{t('createOpportunity.createBtn')}</Text>
                    <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* ── New flow, Phase 2: Publish — the AI's draft goes straight here
              (no separate "here's what we understood" step); every field is
              directly editable in place, and the summary card's "Edit
              details" link is the fallback into the full legacy editor. ── */}
          {phase === 'publish' && form.eventType === 'PAID_CAMPAIGN' && (
            <View style={s.content}>
              <ListingHeroCard
                featureImageUrl={form.featureImageUrl}
                title={form.title.trim() || t('createEvent.untitledEvent')}
                category={selectedTemplate ? form.template : undefined}
                colors={C}
                onEditPress={() => setEditingField('title')}
                onImagePress={() => setEditingField('image')}
              />

              <Pressable
                style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 6 }]}
                onPress={() => setEditingField('description')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[sc.title, { color: C.text }]}>{t('createOpportunity.purposeLabel')}</Text>
                  <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
                </View>
                <Text style={[s.optionDesc, { color: C.textSecondary }]}>{form.description || '—'}</Text>
              </Pressable>

              {draftNeedsAttention && (
                <Pressable
                  style={[s.remoteCard, { backgroundColor: '#FFF8E8', borderColor: '#F59E0B' }]}
                  onPress={() => { cameFromNewFlowRef.current = 'publish'; setPhase('review'); }}>
                  <FontAwesome5 name="exclamation-circle" solid size={18} color="#F59E0B" />
                  <View style={s.remoteTextWrap}>
                    <Text style={[s.remoteBody, { color: C.text }]}>{t('createOpportunity.needsInputCallout')}</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" solid size={14} color="#F59E0B" />
                </Pressable>
              )}

              <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 2 }]}>
                <Text style={[sc.title, { color: C.text, marginBottom: 2 }]}>{t('createOpportunity.publishHeading')}</Text>
                <PreviewRow
                  icon="th-large"
                  label={t('createEvent.summaryCategory')}
                  value={form.template || '—'}
                  colors={C}
                  onPress={() => setEditingField('category')}
                />
                <PreviewRow
                  icon={form.locationType === 'REMOTE' ? 'globe' : 'map-marker-alt'}
                  label={t('createEvent.summaryLocation')}
                  value={form.locationType === 'REMOTE' ? t('createEvent.summaryRemote') : (form.location || '—')}
                  colors={C}
                  onPress={form.locationType === 'REMOTE' ? undefined : () => setLocationModalOpen(true)}
                />
                <PreviewRow
                  icon="money-bill-alt"
                  label={t('createEvent.confirmSectionBudget')}
                  value={`Rs. ${confirmBudgetRange.min.toLocaleString()} – ${confirmBudgetRange.max.toLocaleString()}`}
                  colors={C}
                  // Multi-role campaigns show an aggregate spanning every
                  // role's budget (see confirmBudgetRange) — there's no single
                  // number to edit here, so those edit each role's own budget
                  // from the People Needed card below instead.
                  onPress={requirementMode === 'multiple' && form.requirements.length > 0
                    ? undefined
                    : () => setEditingField('budget')}
                />
                <PreviewRow
                  icon="calendar-alt"
                  label={t('createEvent.confirmSectionCloses')}
                  value={form.deadline ? fmtDate(form.deadline) : '—'}
                  colors={C}
                  onPress={() => setDeadlinePickerOpen(true)}
                />
                <PreviewRow
                  icon={form.completionType === 'SERVICE' ? 'handshake' : 'cloud-upload-alt'}
                  label={t('createOpportunity.completionLabel')}
                  value={form.completionType === 'SERVICE' ? t('createOpportunity.completionServiceTitle')
                    : form.completionType === 'DELIVERABLE' ? t('createOpportunity.completionDeliverableTitle')
                    : '—'}
                  colors={C}
                  onPress={() => setEditingField('completionType')}
                  last
                />
                {/* Publish silently refuses on a below-minimum budget
                    otherwise — the sheet that sets it is already closed by
                    then, so the reason has to surface on the row itself. */}
                {reviewErrors.budget ? <Text style={[s.errorText, { marginTop: 6 }]}>{reviewErrors.budget}</Text> : null}
              </View>

              {/* People Needed — one row per role: role × qty, budget, edit
                  + delete. Tap the pencil to edit category/quantity/budget/
                  content for just that role without leaving this screen. */}
              <SectionCard title={t('createOpportunity.peopleNeededTitle')} icon="user-plus" colors={C}>
                <View style={{ gap: 10 }}>
                  <View>
                    {peopleRows.map((row, i) => (
                      <PeopleNeededRow
                        key={row.key}
                        label={row.label}
                        budget={row.budget}
                        work={row.work}
                        completion={row.completion}
                        onEdit={row.onEdit}
                        onRemove={row.onRemove}
                        colors={C}
                        last={i === peopleRows.length - 1}
                      />
                    ))}
                  </View>
                  {requirementMode === 'multiple' && (
                    <>
                      {reviewErrors.requirements && <Text style={rq.errorText}>{reviewErrors.requirements}</Text>}
                      {form.requirements.length < 10 && (
                        <Pressable
                          style={[rq.addBtn, { borderColor: C.brinjal1 }]}
                          onPress={() => {
                            const first = providerCategoryOptions[0];
                            const next: RequirementFormItem = {
                              key: `local-${Date.now()}-${form.requirements.length}`,
                              categoryId:    first?.id ?? '',
                              categoryName:  first?.label ?? '',
                              categoryIcon:  first?.icon ?? 'user',
                              categoryColor: first?.color ?? '#7c3aed',
                              quantity: 1,
                              budgetType: 'FIXED',
                              budgetFixed: null,
                              budgetMin: null,
                              budgetMax: null,
                              format: [],
                              deliverables: { ...DEFAULT_DELIVERABLES },
                              description: '',
                              completionType: null,
                              completionReason: '',
                            };
                            // Held as a draft until the sheet's "Add role"
                            // button commits it — dismissing the sheet
                            // discards it instead of leaving a blank role.
                            setDraftRequirement(next);
                          }}>
                          <FontAwesome5 name="plus" size={13} color={C.brinjal1} />
                          <Text style={[rq.addBtnText, { color: C.brinjal1 }]}>{t('createEvent.reqAddRole')}</Text>
                        </Pressable>
                      )}
                    </>
                  )}
                </View>
              </SectionCard>

              {/* Hashtags — standalone pill display, tap anywhere to add/edit. */}
              <Pressable
                style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 8 }]}
                onPress={() => setEditingField('hashtags')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[sc.title, { color: C.text }]}>{t('createEvent.confirmSectionHashtags')}</Text>
                  <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
                </View>
                {form.hashtags.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {form.hashtags.map((h) => (
                      <View key={h} style={[s.hashtagPill, { backgroundColor: C.primaryLight }]}>
                        <Text style={[s.hashtagPillText, { color: C.brinjal1 }]}>#{h}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[s.optionDesc, { color: C.textSecondary }]}>—</Text>
                )}
              </Pressable>

              {/* Featured toggle */}
              <FeaturedToggle
                value={form.isFeatured}
                onChange={(v) => update('isFeatured', v)}
                quota={featuredQuota}
                colors={C}
                t={t}
                labelKey="createOpportunity.featuredLabel"
                lockedSubKey="createOpportunity.featuredLockedSub"
              />

              {/* Save as Draft */}
              <Pressable
                style={[s.draftBtn, { borderColor: C.border, opacity: loading ? 0.6 : 1 }]}
                onPress={handleSaveDraft}
                disabled={loading}>
                <FontAwesome5 name="save" size={16} color={C.textSecondary} />
                <Text style={[s.draftBtnText, { color: C.textSecondary }]}>{t('createEvent.saveDraftBtn')}</Text>
              </Pressable>

              {/* Actions — no "Back to edit" here: every field on this
                  screen is already directly editable in place. */}
              <Pressable
                style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1, alignSelf: 'stretch', justifyContent: 'center' }]}
                onPress={handlePublish}
                disabled={loading}>
                <Text style={s.publishBtnText}>{loading ? t('createEvent.publishingBtn') : t('createOpportunity.publishBtn')}</Text>
              </Pressable>
            </View>
          )}

          {/* ── Free Invitation flow, Phase 1: Offer — what the business is
              providing, chosen before the AI prompt so it seeds that prompt's
              context. Reached only via 'chooseType' picking Free Invitation. ── */}
          {phase === 'inviteOffer' && (
            <View style={s.content}>
              <View style={{ gap: 6 }}>
                <Text style={[s.stepSectionHeading, { color: C.text, fontSize: 22 }]}>{t('createInvitation.offerHeadline')}</Text>
                <Text style={[s.optionDesc, { color: C.textSecondary }]}>{t('createInvitation.offerSub')}</Text>
              </View>
              <ChipMultiGroup
                options={OFFERING_OPTIONS}
                values={form.benefits}
                onChange={(v) => update('benefits', v)}
                colors={C}
              />
              <Pressable
                style={[s.generateBtn, { backgroundColor: form.benefits.length > 0 ? C.brinjal1 : C.border }]}
                onPress={() => setPhase('inviteDescribe')}
                disabled={form.benefits.length === 0}>
                <Text style={s.generateBtnText}>{t('createInvitation.continueBtn')}</Text>
                <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
              </Pressable>
            </View>
          )}

          {/* ── Free Invitation flow, Phase 2: Describe — single AI prompt,
              same shell as the Paid 'describe' phase. ── */}
          {phase === 'inviteDescribe' && (
            <View style={s.content}>
              <View style={{ gap: 6 }}>
                <Text style={[s.stepSectionHeading, { color: C.text, fontSize: 22 }]}>{t('createInvitation.describeHeadline')}</Text>
                <Text style={[s.optionDesc, { color: C.textSecondary }]}>{t('createInvitation.describeSub')}</Text>
              </View>

              <SectionCard colors={C}>
                <View style={{ gap: 8 }}>
                  {(
                    [
                      { key: 'text' as const,  icon: 'edit' as const, title: t('createEvent.promptModeText'),  desc: t('createEvent.promptModeTextDesc'),  tone: TabColors.neutral },
                      { key: 'audio' as const, icon: 'microphone' as const,    title: t('createEvent.promptModeAudio'), desc: t('createEvent.promptModeAudioDesc'), tone: TabColors.positive },
                    ]
                  ).map((opt) => {
                    const selected = promptMode === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => setPromptMode(opt.key)}
                        style={({ pressed }) => [
                          s.optionCard,
                          { backgroundColor: C.background, borderColor: selected ? opt.tone.color : C.border, padding: 12 },
                          selected && { backgroundColor: `${opt.tone.color}0D` },
                          { transform: [{ scale: pressed ? 0.97 : 1 }] },
                        ]}>
                        <View style={[s.optionIconWrap, { width: 34, height: 34, backgroundColor: opt.tone.bg, shadowColor: opt.tone.color }]}>
                          <FontAwesome5 name={opt.icon} size={16} color={opt.tone.color} />
                        </View>
                        <View style={s.optionTextWrap}>
                          <Text style={[s.optionTitle, { color: C.text }]}>{opt.title}</Text>
                          <Text style={[s.optionDesc, { color: C.textSecondary }]}>{opt.desc}</Text>
                        </View>
                        {selected && <FontAwesome5 name="check-circle" solid size={18} color={opt.tone.color} />}
                      </Pressable>
                    );
                  })}
                </View>

                {promptMode === 'text' ? (
                  <>
                    <TextInputWithLabel
                      label={t('createInvitation.describeHeadline')}
                      value={aiPromptText}
                      onChangeText={(v) => setAiPromptText(v.slice(0, 500))}
                      placeholder={t('createInvitation.promptPlaceholder')}
                      multiline
                      numberOfLines={5}
                      editable={!aiLoading}
                    />
                    <Text style={[ai.charCount, { color: C.textSecondary }]}>{aiPromptText.length}/500</Text>

                    <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createInvitation.examplesLabel')}</Text>
                    <View style={ai.chipWrap}>
                      {getInviteExamples(businessCategories[0]).map((ex) => (
                        <Pressable
                          key={ex}
                          style={[ai.exampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                          onPress={() => setAiPromptText(ex)}
                          disabled={aiLoading}>
                          <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{ex}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <VoicePromptInput
                      onRecorded={handleAudioRecorded}
                      onDiscard={handleAudioDiscard}
                      onError={handleAudioError}
                      disabled={aiLoading || transcribingAudio}
                    />

                    <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiAudioSamplesLabel')}</Text>
                    <View style={ai.chipWrap}>
                      {getInviteSamples(businessCategories[0]).map(({ text, lang }, idx) => (
                        <Pressable
                          key={`${idx}-${text}`}
                          style={[ai.exampleChip, ai.sampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                          onPress={() => handlePlaySample(idx, text, lang)}
                          disabled={aiLoading}>
                          <FontAwesome5
                            name={playingSampleIdx === idx ? 'stop-circle' : 'play-circle'}
                            size={15}
                            color={playingSampleIdx === idx ? C.brinjal1 : C.textSecondary}
                          />
                          <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{text}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}
              </SectionCard>

              <Pressable
                style={[s.generateBtn, { backgroundColor: (!canSubmitEvent || aiBusy) ? C.border : C.brinjal1 }]}
                onPress={() => void handleCreateEventPress('invitePublish')}
                disabled={!canSubmitEvent || aiBusy}>
                {aiBusy ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={s.generateBtnText}>{t('createEvent.aiModalGenerating')}</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.generateBtnText}>{t('createInvitation.createBtn')}</Text>
                    <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          )}

          {/* ── Free Invitation flow, Phase 3: Draft — collapses "exchange
              type", conditional content detail, and "who you're inviting"
              into one tap-to-edit summary, same pattern as Paid's 'draft'. ── */}
          {phase === 'inviteDraft' && form.eventType === 'OPEN_EVENT' && (
            <View style={s.content}>
              <ListingHeroCard
                featureImageUrl={form.featureImageUrl}
                title={form.title.trim() || t('createEvent.untitledEvent')}
                category={selectedTemplate ? form.template : undefined}
                colors={C}
                onEditPress={() => setEditingField('title')}
              />

              {inviteDraftNeedsAttention && (
                <Pressable
                  style={[s.remoteCard, { backgroundColor: '#FFF8E8', borderColor: '#F59E0B' }]}
                  onPress={() => { cameFromNewFlowRef.current = 'inviteDraft'; setPhase('setup'); }}>
                  <FontAwesome5 name="exclamation-circle" solid size={18} color="#F59E0B" />
                  <View style={s.remoteTextWrap}>
                    <Text style={[s.remoteBody, { color: C.text }]}>{t('createInvitation.needsInputCallout')}</Text>
                  </View>
                  <FontAwesome5 name="chevron-right" solid size={14} color="#F59E0B" />
                </Pressable>
              )}

              <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 2 }]}>
                <Text style={[sc.title, { color: C.text }]}>{t('createInvitation.draftHeading')}</Text>
                <Text style={[sc.sub, { color: C.textSecondary, marginBottom: 4 }]}>{t('createInvitation.draftSub')}</Text>
                <PreviewRow
                  icon="th-large"
                  label={t('createEvent.summaryCategory')}
                  value={form.template || '—'}
                  colors={C}
                  onPress={() => setEditingField('category')}
                />
                <PreviewRow
                  icon="gift"
                  label={t('createInvitation.offeringLabel')}
                  value={form.benefits.join(', ') || '—'}
                  colors={C}
                  onPress={() => setEditingField('offerings')}
                />
                <PreviewRow
                  icon="hand-holding-heart"
                  label={t('createInvitation.exchangeLabel')}
                  value={form.exchangeType.join(', ') || '—'}
                  colors={C}
                  onPress={() => setEditingField('exchangeType')}
                />
                {!(form.exchangeType.length === 1 && form.exchangeType[0] === 'Just attend & share organically') && (
                  <PreviewRow
                    icon="film"
                    label={t('createInvitation.contentDetailsLabel')}
                    value={form.expectedContent || '—'}
                    colors={C}
                    onPress={() => setEditingField('expectedContent')}
                  />
                )}
                <PreviewRow
                  icon="users"
                  label={t('createInvitation.invitingLabel')}
                  value={form.roleTypes.join(', ') || '—'}
                  colors={C}
                  onPress={() => setEditingField('roleTypes')}
                  last
                />
              </View>

              <SectionCard title={t('createEvent.secLocationTitle')} colors={C}>
                <Pressable
                  style={[s.locationBtn, { backgroundColor: C.background, borderColor: C.border }]}
                  onPress={() => setLocationModalOpen(true)}>
                  <Text style={[s.locationBtnTxt, { color: form.venue ? C.text : C.textSecondary }]} numberOfLines={2}>
                    {form.venue || t('createEvent.locationPlaceholder')}
                  </Text>
                  <Text style={s.locationArrow}>›</Text>
                </Pressable>
              </SectionCard>

              <SectionCard title={t('createEvent.secEventDateTitle')} icon="calendar-alt" colors={C}>
                <DeadlinePicker
                  value={form.eventDate}
                  onChange={(d) => {
                    const twoDaysBefore = d ? dayStart(new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000)) : null;
                    setForm((prev) => ({ ...prev, eventDate: d, deadline: twoDaysBefore }));
                  }}
                  colors={C}
                />
              </SectionCard>

              <SectionCard title={t('createEvent.secCapacityTitle')} icon="users" colors={C}>
                <Stepper value={form.capacity} onChange={(v) => update('capacity', v)} min={1} max={500} colors={C} />
              </SectionCard>

              <Pressable
                style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 6 }]}
                onPress={() => setEditingField('description')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[sc.title, { color: C.text }]}>{t('createOpportunity.purposeLabel')}</Text>
                  <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
                </View>
                <Text style={[s.optionDesc, { color: C.textSecondary }]}>{form.description || '—'}</Text>
              </Pressable>

              {/* Actions */}
              <View style={s.reviewActions}>
                <Pressable
                  style={[s.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => { cameFromNewFlowRef.current = 'inviteDraft'; setPhase('setup'); }}>
                  <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createInvitation.editDetailsBtn')}</Text>
                </Pressable>
                <Pressable
                  style={[s.publishBtn, { backgroundColor: C.brinjal1 }]}
                  onPress={() => setPhase('invitePublish')}>
                  <Text style={s.publishBtnText}>{t('createOpportunity.continueBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Free Invitation flow, Phase 4: Publish — mirrors Paid 'publish'
              structurally; FeaturedToggle/SaveDraft/handlePublish all reused
              unchanged (handlePublish's existing OPEN_EVENT branch). ── */}
          {phase === 'invitePublish' && form.eventType === 'OPEN_EVENT' && (
            <View style={s.content}>
              <ListingHeroCard
                featureImageUrl={form.featureImageUrl}
                title={form.title.trim() || t('createEvent.untitledEvent')}
                category={selectedTemplate ? form.template : undefined}
                colors={C}
                onEditPress={() => setEditingField('title')}
                onImagePress={() => setEditingField('image')}
              />

              <Pressable
                style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 6 }]}
                onPress={() => setEditingField('description')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[sc.title, { color: C.text }]}>{t('createOpportunity.purposeLabel')}</Text>
                  <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
                </View>
                <Text style={[s.optionDesc, { color: C.textSecondary }]}>{form.description || '—'}</Text>
              </Pressable>

              <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 2 }]}>
                <Text style={[sc.title, { color: C.text, marginBottom: 2 }]}>{t('createInvitation.publishHeading')}</Text>
                <PreviewRow
                  icon="gift"
                  label={t('createInvitation.publishReceiveLabel')}
                  value={form.benefits.join(', ') || '—'}
                  colors={C}
                  onPress={() => setEditingField('offerings')}
                />
                <PreviewRow
                  icon="users"
                  label={t('createInvitation.publishLookingForLabel')}
                  value={form.roleTypes.join(', ') || '—'}
                  colors={C}
                  onPress={() => setEditingField('roleTypes')}
                />
                <PreviewRow
                  icon="hand-holding-heart"
                  label={t('createInvitation.publishExchangeLabel')}
                  value={form.exchangeType.join(', ') || '—'}
                  colors={C}
                  onPress={() => setEditingField('exchangeType')}
                />
                {/* Free events complete one way only — attend and post about
                    it — so this states the expectation instead of offering
                    the paid flow's Service/Deliverable choice. */}
                <PreviewRow
                  icon="share-alt"
                  label={t('createOpportunity.completionLabel')}
                  value={t('campaignDetail.freeCompletionTitle')}
                  colors={C}
                />
                <PreviewRow
                  icon="map-marker-alt"
                  label={t('createEvent.summaryLocation')}
                  value={form.venue || '—'}
                  colors={C}
                  onPress={() => setLocationModalOpen(true)}
                />
                <PreviewRow
                  icon="calendar-alt"
                  label={t('createEvent.summaryDate')}
                  value={form.eventDate ? fmtDate(form.eventDate) : '—'}
                  colors={C}
                  onPress={() => setEventDatePickerOpen(true)}
                />
                <PreviewRow
                  icon="users"
                  label={t('createEvent.secCapacityTitle')}
                  value={String(form.capacity)}
                  colors={C}
                  onPress={() => setCapacityPickerOpen(true)}
                  last
                />
              </View>

              {/* Featured toggle */}
              <FeaturedToggle
                value={form.isFeatured}
                onChange={(v) => update('isFeatured', v)}
                quota={featuredQuota}
                colors={C}
                t={t}
                labelKey="createInvitation.featuredLabel"
                lockedSubKey="createInvitation.featuredLockedSub"
              />

              {/* Save as Draft */}
              <Pressable
                style={[s.draftBtn, { borderColor: C.border, opacity: loading ? 0.6 : 1 }]}
                onPress={handleSaveDraft}
                disabled={loading}>
                <FontAwesome5 name="save" size={16} color={C.textSecondary} />
                <Text style={[s.draftBtnText, { color: C.textSecondary }]}>{t('createEvent.saveDraftBtn')}</Text>
              </Pressable>

              {/* Actions */}
              <View style={s.reviewActions}>
                <Pressable
                  style={[s.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => setPhase('inviteDraft')}>
                  <FontAwesome5 name="chevron-left" solid size={16} color={C.brinjal1} />
                  <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.backToEditBtn')}</Text>
                </Pressable>
                <Pressable
                  style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                  onPress={handlePublish}
                  disabled={loading}>
                  <Text style={s.publishBtnText}>{loading ? t('createEvent.publishingBtn') : t('createInvitation.publishBtn')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Phase 1: Setup ── */}
          {phase === 'setup' && (
            <View style={s.content}>

              {/* Event Type — descriptive selectable cards (icon + title + why
                  you'd pick it) instead of a plain tab switch, so the choice
                  is self-explanatory without a separate info banner. */}
              <View style={{ gap: 12 }}>
                <View style={s.eventTypeHeaderRow}>
                  <Text style={[s.stepSectionHeading, { color: C.text }]}>{t('createEvent.eventTypeHeading')}</Text>
                  <Pressable onPress={() => setNeedHelpVisible(true)} hitSlop={8} style={[s.needHelpLinkRow, { borderColor: C.brinjal1 }]}>
                    <Text style={[s.needHelpLinkText, { color: C.brinjal1 }]}>{t('createEvent.needHelpLink')}</Text>
                    <FontAwesome5 name="question-circle" solid size={15} color={C.brinjal1} />
                  </Pressable>
                </View>

                <View style={{ gap: 10 }}>
                  {(
                    [
                      { key: 'PAID_CAMPAIGN' as const, icon: 'money-bill-alt' as const,     title: t('createEvent.tabPaidEvent'), desc: t('createEvent.paidEventSub'), tone: TabColors.brand },
                      { key: 'OPEN_EVENT'    as const, icon: 'calendar-alt' as const, title: t('createEvent.tabOpenEvent'), desc: t('createEvent.openEventSub'), tone: TabColors.info },
                    ]
                  ).map((opt) => {
                    const selected = form.eventType === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => { if (form.eventType !== opt.key) resetFormForType(opt.key); }}
                        style={({ pressed }) => [
                          s.optionCard,
                          { backgroundColor: C.surface, borderColor: selected ? opt.tone.color : C.border },
                          selected && { backgroundColor: `${opt.tone.color}0D` },
                          { transform: [{ scale: pressed ? 0.97 : 1 }] },
                        ]}>
                        <View style={[s.optionIconWrap, { backgroundColor: opt.tone.bg, shadowColor: opt.tone.color }]}>
                          <FontAwesome5 name={opt.icon} size={20} color={opt.tone.color} />
                        </View>
                        <View style={s.optionTextWrap}>
                          <Text style={[s.optionTitle, { color: C.text }]}>{opt.title}</Text>
                          <Text style={[s.optionDesc, { color: C.textSecondary }]}>{opt.desc}</Text>
                        </View>
                        {selected && <FontAwesome5 name="check-circle" solid size={20} color={opt.tone.color} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Paid Campaign form */}
              {form.eventType === 'PAID_CAMPAIGN' && (
                <>
                  {/* Describe & generate */}
                  <Text style={[s.stepSectionHeading, { color: C.text }]}>{t('createEvent.makeEventTitle')}</Text>
                  <SectionCard colors={C}>
                    <View style={{ gap: 8 }}>
                      {(
                        [
                          { key: 'text' as const,  icon: 'edit' as const, title: t('createEvent.promptModeText'),  desc: t('createEvent.promptModeTextDesc'),  tone: TabColors.neutral },
                          { key: 'audio' as const, icon: 'microphone' as const,    title: t('createEvent.promptModeAudio'), desc: t('createEvent.promptModeAudioDesc'), tone: TabColors.positive },
                        ]
                      ).map((opt) => {
                        const selected = promptMode === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            onPress={() => setPromptMode(opt.key)}
                            style={({ pressed }) => [
                              s.optionCard,
                              { backgroundColor: C.background, borderColor: selected ? opt.tone.color : C.border, padding: 12 },
                              selected && { backgroundColor: `${opt.tone.color}0D` },
                              { transform: [{ scale: pressed ? 0.97 : 1 }] },
                            ]}>
                            <View style={[s.optionIconWrap, { width: 34, height: 34, backgroundColor: opt.tone.bg, shadowColor: opt.tone.color }]}>
                              <FontAwesome5 name={opt.icon} size={16} color={opt.tone.color} />
                            </View>
                            <View style={s.optionTextWrap}>
                              <Text style={[s.optionTitle, { color: C.text }]}>{opt.title}</Text>
                              <Text style={[s.optionDesc, { color: C.textSecondary }]}>{opt.desc}</Text>
                            </View>
                            {selected && <FontAwesome5 name="check-circle" solid size={18} color={opt.tone.color} />}
                          </Pressable>
                        );
                      })}
                    </View>

                    {promptMode === 'text' ? (
                      <>
                        <TextInputWithLabel
                          label={t('createEvent.aiPromptLabel')}
                          value={aiPromptText}
                          onChangeText={(v) => setAiPromptText(v.slice(0, 500))}
                          placeholder={aiPlaceholder}
                          multiline
                          numberOfLines={4}
                          editable={!aiLoading}
                        />
                        <Text style={[ai.charCount, { color: C.textSecondary }]}>{aiPromptText.length}/500</Text>

                        <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiExamplesLabel')}</Text>
                        <View style={ai.chipWrap}>
                          {getAllPromptExamples(businessCategories[0]).map((ex) => (
                            <Pressable
                              key={ex}
                              style={[ai.exampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                              onPress={() => setAiPromptText(ex)}
                              disabled={aiLoading}>
                              <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{ex}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    ) : (
                      <>
                        <VoicePromptInput
                          onRecorded={handleAudioRecorded}
                          onDiscard={handleAudioDiscard}
                          onError={handleAudioError}
                          disabled={aiLoading || transcribingAudio}
                        />

                        <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiAudioSamplesLabel')}</Text>
                        <View style={ai.chipWrap}>
                          {getPromptSamples(businessCategories[0]).map(({ text, lang }, idx) => (
                            <Pressable
                              key={`${idx}-${text}`}
                              style={[ai.exampleChip, ai.sampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                              onPress={() => handlePlaySample(idx, text, lang)}
                              disabled={aiLoading}>
                              <FontAwesome5
                                name={playingSampleIdx === idx ? 'stop-circle' : 'play-circle'}
                                size={15}
                                color={playingSampleIdx === idx ? C.brinjal1 : C.textSecondary}
                              />
                              <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{text}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </SectionCard>

                  {/* Location */}
                  <SectionCard title={t('createEvent.secLocationTitle')} sub={t('createEvent.secLocationSub')} colors={C}>
                    <TabSlider
                      tabs={[
                        { key: 'ONSITE', label: t('createEvent.locationOnsite'), icon: 'map-marker-alt' },
                        { key: 'REMOTE', label: t('createEvent.locationRemote'), icon: 'globe' },
                      ]}
                      active={form.locationType}
                      onChange={(k) => update('locationType', k as 'ONSITE' | 'REMOTE')}
                      justify
                    />
                    {form.locationType === 'REMOTE' ? (
                      <View style={[s.remoteCard, { backgroundColor: C.background, borderColor: C.border }]}>
                        <FontAwesome5 name="globe" solid size={18} color={C.brinjal1} />
                        <View style={s.remoteTextWrap}>
                          <Text style={[s.remoteTitle, { color: C.text }]}>{t('createEvent.remoteLocationTitle')}</Text>
                          <Text style={[s.remoteBody, { color: C.textSecondary }]}>{t('createEvent.remoteLocationBody')}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          style={[s.locationBtn, { backgroundColor: C.background, borderColor: aiLocationError ? ERROR_RED : C.border }]}
                          onPress={() => setLocationModalOpen(true)}>
                          <Text style={[s.locationBtnTxt, { color: form.location ? C.text : C.textSecondary }]} numberOfLines={2}>
                            {form.location || t('createEvent.locationPlaceholder')}
                          </Text>
                          <Text style={s.locationArrow}>›</Text>
                        </Pressable>
                        {aiLocationError ? <Text style={s.errorText}>{aiLocationError}</Text> : null}
                      </>
                    )}
                  </SectionCard>

                  {/* Create Event */}
                  <Pressable
                    style={[s.generateBtn, { backgroundColor: (!canSubmitEvent || aiBusy) ? C.border : C.brinjal1 }]}
                    onPress={() => void handleCreateEventPress()}
                    disabled={!canSubmitEvent || aiBusy}>
                    {aiBusy ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={s.generateBtnText}>{t('createEvent.aiModalGenerating')}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.generateBtnText}>{t('createEvent.createEventBtn')}</Text>
                        <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {/* Open Event form — same describe-and-generate flow as Paid Campaign,
                  minus budget: brand just enters a prompt + location, AI fills in
                  the rest including what the event offers (Creator Benefits). */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Describe & generate */}
                  <Text style={[s.stepSectionHeading, { color: C.text }]}>{t('createEvent.makeEventTitle')}</Text>
                  <SectionCard colors={C}>
                    <View style={{ gap: 8 }}>
                      {(
                        [
                          { key: 'text' as const,  icon: 'edit' as const, title: t('createEvent.promptModeText'),  desc: t('createEvent.promptModeTextDesc'),  tone: TabColors.neutral },
                          { key: 'audio' as const, icon: 'microphone' as const,    title: t('createEvent.promptModeAudio'), desc: t('createEvent.promptModeAudioDesc'), tone: TabColors.positive },
                        ]
                      ).map((opt) => {
                        const selected = promptMode === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            onPress={() => setPromptMode(opt.key)}
                            style={({ pressed }) => [
                              s.optionCard,
                              { backgroundColor: C.background, borderColor: selected ? opt.tone.color : C.border, padding: 12 },
                              selected && { backgroundColor: `${opt.tone.color}0D` },
                              { transform: [{ scale: pressed ? 0.97 : 1 }] },
                            ]}>
                            <View style={[s.optionIconWrap, { width: 34, height: 34, backgroundColor: opt.tone.bg, shadowColor: opt.tone.color }]}>
                              <FontAwesome5 name={opt.icon} size={16} color={opt.tone.color} />
                            </View>
                            <View style={s.optionTextWrap}>
                              <Text style={[s.optionTitle, { color: C.text }]}>{opt.title}</Text>
                              <Text style={[s.optionDesc, { color: C.textSecondary }]}>{opt.desc}</Text>
                            </View>
                            {selected && <FontAwesome5 name="check-circle" solid size={18} color={opt.tone.color} />}
                          </Pressable>
                        );
                      })}
                    </View>

                    {promptMode === 'text' ? (
                      <>
                        <TextInputWithLabel
                          label={t('createEvent.aiPromptLabel')}
                          value={aiPromptText}
                          onChangeText={(v) => setAiPromptText(v.slice(0, 500))}
                          placeholder={aiPlaceholder}
                          multiline
                          numberOfLines={4}
                          editable={!aiLoading}
                        />
                        <Text style={[ai.charCount, { color: C.textSecondary }]}>{aiPromptText.length}/500</Text>

                        <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiExamplesLabel')}</Text>
                        <View style={ai.chipWrap}>
                          {getAllPromptExamples(businessCategories[0]).map((ex) => (
                            <Pressable
                              key={ex}
                              style={[ai.exampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                              onPress={() => setAiPromptText(ex)}
                              disabled={aiLoading}>
                              <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{ex}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    ) : (
                      <>
                        <VoicePromptInput
                          onRecorded={handleAudioRecorded}
                          onDiscard={handleAudioDiscard}
                          onError={handleAudioError}
                          disabled={aiLoading || transcribingAudio}
                        />

                        <Text style={[ai.exampleLabel, { color: C.textSecondary }]}>{t('createEvent.aiAudioSamplesLabel')}</Text>
                        <View style={ai.chipWrap}>
                          {getPromptSamples(businessCategories[0]).map(({ text, lang }, idx) => (
                            <Pressable
                              key={`${idx}-${text}`}
                              style={[ai.exampleChip, ai.sampleChip, { borderColor: C.border, backgroundColor: C.background }]}
                              onPress={() => handlePlaySample(idx, text, lang)}
                              disabled={aiLoading}>
                              <FontAwesome5
                                name={playingSampleIdx === idx ? 'stop-circle' : 'play-circle'}
                                size={15}
                                color={playingSampleIdx === idx ? C.brinjal1 : C.textSecondary}
                              />
                              <Text style={[ai.exampleChipText, { color: C.textSecondary }]} numberOfLines={1}>{text}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </SectionCard>

                  {/* Venue / Location */}
                  <SectionCard title={t('createEvent.secVenueTitle')} sub={t('createEvent.secVenueSub')} colors={C}>
                    <TabSlider
                      tabs={[
                        { key: 'ONSITE', label: t('createEvent.locationOnsite'), icon: 'map-marker-alt' },
                        { key: 'REMOTE', label: t('createEvent.locationRemote'), icon: 'globe' },
                      ]}
                      active={form.locationType}
                      onChange={(k) => update('locationType', k as 'ONSITE' | 'REMOTE')}
                      justify
                    />
                    {form.locationType === 'REMOTE' ? (
                      <View style={[s.remoteCard, { backgroundColor: C.background, borderColor: C.border }]}>
                        <FontAwesome5 name="globe" solid size={18} color={C.brinjal1} />
                        <View style={s.remoteTextWrap}>
                          <Text style={[s.remoteTitle, { color: C.text }]}>{t('createEvent.remoteLocationTitle')}</Text>
                          <Text style={[s.remoteBody, { color: C.textSecondary }]}>{t('createEvent.remoteLocationBody')}</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <Pressable
                          style={[s.locationBtn, { backgroundColor: C.background, borderColor: aiLocationError ? ERROR_RED : C.border }]}
                          onPress={() => setLocationModalOpen(true)}>
                          <Text style={[s.locationBtnTxt, { color: form.venue ? C.text : C.textSecondary }]} numberOfLines={2}>
                            {form.venue || t('createEvent.locationPlaceholder')}
                          </Text>
                          <Text style={s.locationArrow}>›</Text>
                        </Pressable>
                        {aiLocationError ? <Text style={s.errorText}>{aiLocationError}</Text> : null}
                      </>
                    )}
                  </SectionCard>

                  {/* Create Event */}
                  <Pressable
                    style={[s.generateBtn, { backgroundColor: (!canSubmitEvent || aiBusy) ? C.border : C.brinjal1 }]}
                    onPress={() => void handleCreateEventPress()}
                    disabled={!canSubmitEvent || aiBusy}>
                    {aiBusy ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={s.generateBtnText}>{t('createEvent.aiModalGenerating')}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.generateBtnText}>{t('createEvent.createEventBtn')}</Text>
                        <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}

          {/* ── Phase 3: Roles (PAID_CAMPAIGN only — one type of provider, or several distinct roles?) ── */}
          {phase === 'roles' && form.eventType === 'PAID_CAMPAIGN' && (
            <View style={s.content}>
              <View style={[s.reviewBanner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                <View style={[s.reviewBannerIconWrap, { backgroundColor: C.primaryLight, shadowColor: C.brinjal1 }]}>
                  <FontAwesome5 name="users" solid size={20} color={C.brinjal1} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.reviewBannerTitle, { color: C.text }]}>{t('createEvent.rolesBannerTitle')}</Text>
                  <Text style={[s.reviewBannerSub, { color: C.textSecondary }]}>{t('createEvent.rolesBannerSub')}</Text>
                </View>
              </View>

              {/* Single role vs multiple distinct provider roles — opt-in,
                  auto-set by the AI when it detects a multi-role brief, but
                  always user-editable here regardless of how it was set. */}
              <SectionCard title={t('createEvent.reqModeTitle')} sub={t('createEvent.reqModeSub')} icon="users" colors={C}>
                <TabSlider
                  tabs={[
                    { key: 'single',   label: t('createEvent.reqModeSingle'),   icon: 'user' },
                    { key: 'multiple', label: t('createEvent.reqModeMultiple'), icon: 'users' },
                  ]}
                  active={requirementMode}
                  onChange={(k) => {
                    setRequirementMode(k as 'single' | 'multiple');
                    if (reviewErrors.requirements) setReviewErrors((e) => ({ ...e, requirements: undefined }));
                  }}
                  justify
                />
              </SectionCard>

              {requirementMode === 'single' ? (
                <>
                  {/* Creators Needed */}
                  <SectionCard title={t('createEvent.secCreatorsNeededTitle')} sub={t('createEvent.secCreatorsNeededSub')} icon="user-plus" colors={C}>
                    <Stepper value={form.creatorsNeeded} onChange={(v) => update('creatorsNeeded', v)} colors={C} />
                  </SectionCard>
                </>
              ) : (
                /* Requirements repeater — one card per distinct provider role */
                <SectionCard title={t('createEvent.reqListTitle')} sub={t('createEvent.reqListSub')} icon="user-plus" colors={C}>
                  <View style={{ gap: 10 }}>
                    {form.requirements.map((item, i) => (
                      <RequirementCard
                        key={item.key}
                        item={item}
                        index={i}
                        providerCategoryOptions={providerCategoryOptions}
                        onChange={(next) => update('requirements', form.requirements.map((r) => (r.key === item.key ? next : r)))}
                        onRemove={() => update('requirements', form.requirements.filter((r) => r.key !== item.key))}
                        colors={C}
                        t={t}
                      />
                    ))}
                    {reviewErrors.requirements && <Text style={rq.errorText}>{reviewErrors.requirements}</Text>}
                    {form.requirements.length < 10 && (
                      <Pressable
                        style={[rq.addBtn, { borderColor: C.brinjal1 }]}
                        onPress={() => {
                          const first = providerCategoryOptions[0];
                          const next: RequirementFormItem = {
                            key: `local-${Date.now()}-${form.requirements.length}`,
                            categoryId:    first?.id ?? '',
                            categoryName:  first?.label ?? '',
                            categoryIcon:  first?.icon ?? 'user',
                            categoryColor: first?.color ?? '#7c3aed',
                            quantity: 1,
                            budgetType: 'FIXED',
                            budgetFixed: null,
                            budgetMin: null,
                            budgetMax: null,
                            format: [],
                            deliverables: { ...DEFAULT_DELIVERABLES },
                            description: '',
                            completionType: null,
                            completionReason: '',
                          };
                          update('requirements', [...form.requirements, next]);
                          if (reviewErrors.requirements) setReviewErrors((e) => ({ ...e, requirements: undefined }));
                        }}>
                        <FontAwesome5 name="plus" size={13} color={C.brinjal1} />
                        <Text style={[rq.addBtnText, { color: C.brinjal1 }]}>{t('createEvent.reqAddRole')}</Text>
                      </Pressable>
                    )}
                  </View>
                </SectionCard>
              )}

              {/* Actions */}
              <View style={s.reviewActions}>
                <Pressable
                  style={[s.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => setPhase('review')}>
                  <FontAwesome5 name="chevron-left" solid size={16} color={C.brinjal1} />
                  <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.editReviewBtn')}</Text>
                </Pressable>
                <Pressable
                  style={[s.publishBtn, { backgroundColor: C.brinjal1 }]}
                  onPress={handleContinueToConfirm}>
                  <Text style={s.publishBtnText}>{t('createEvent.continueToConfirmBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}

          {/* ── Phase 2: Review ── */}
          {phase === 'review' && (
            <View style={s.content}>

              {/* Paid Campaign review */}
              {form.eventType === 'PAID_CAMPAIGN' && (
                <>
                  {/* Step 2 review header — icon box + left accent, matching
                      the Open Event banner below and the home feed's banner style. */}
                  <View style={[s.reviewBanner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                    <View style={[s.reviewBannerIconWrap, { backgroundColor: C.primaryLight, shadowColor: C.brinjal1 }]}>
                      <FontAwesome5 name="magic" solid size={20} color={C.brinjal1} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.reviewBannerTitle, { color: C.text }]}>{t('createEvent.paidBannerTitle')}</Text>
                      <Text style={[s.reviewBannerSub, { color: C.textSecondary }]}>{t('createEvent.paidBannerSub')}</Text>
                    </View>
                  </View>

                  {/* Editable title */}
                  <SectionCard title={t('createEvent.secEventTitlePaid')} icon="edit" colors={C}>
                    <TextInputWithLabel
                      label={t('createEvent.secEventTitlePaid')}
                      value={form.title}
                      onChangeText={(v) => {
                        update('title', v);
                        if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined }));
                      }}
                      placeholder={t('createEvent.eventTitlePlaceholder')}
                      error={reviewErrors.title}
                    />
                  </SectionCard>

                  {/* Feature image */}
                  <SectionCard title={t('createEvent.secFeatureImageTitle')} sub={t('createEvent.secFeatureImageSub')} icon="image" colors={C}>
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
                      <View style={[sc.titleRow, s.descHeaderText]}>
                        <View style={[sc.iconChip, { backgroundColor: `${C.brinjal1}1A`, shadowColor: C.brinjal1 }]}>
                          <FontAwesome5 name="file-alt" solid size={14} color={C.brinjal1} />
                        </View>
                        <Text style={[sc.title, { color: C.text }]} numberOfLines={1}>{t('createEvent.secDescPaid')}</Text>
                      </View>
                      <Pressable
                        style={[s.suggestBtn, { borderColor: C.brinjal1, opacity: descSuggestLoading ? 0.6 : 1 }]}
                        onPress={handleSuggestDescription}
                        disabled={descSuggestLoading}>
                        {descSuggestLoading
                          ? <ActivityIndicator size="small" color={C.brinjal1} />
                          : <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.suggestDescriptionBtn')}</Text>}
                      </Pressable>
                    </View>
                    <TextInputWithLabel
                      label={t('createEvent.secDescPaid')}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder={t('createEvent.descriptionPlaceholder')}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Deliverables — a single campaign-wide content spec sent
                      as one `deliverables` string regardless of requirement
                      mode (see buildPaidCampaignPayload), so it needs to stay
                      editable even when requirementMode is 'multiple'. */}
                  <SectionCard title={t('createEvent.secDeliverablesTitle')} sub={t('createEvent.secDeliverablesSub')} icon="layer-group" colors={C}>
                    <DeliverablesCounterList
                      value={form.deliverables}
                      onChange={(v) => update('deliverables', v)}
                      colors={C}
                      t={t}
                    />
                  </SectionCard>

                  {/* Hashtags */}
                  <SectionCard title={t('createEvent.secHashtagsTitle')} icon="tag" colors={C}>
                    <HashtagEditor
                      hashtags={form.hashtags}
                      onChange={(v) => update('hashtags', v)}
                      colors={C}
                      t={t}
                    />
                  </SectionCard>

                  {requirementMode === 'single' ? (
                    <>
                      {/* Budget */}
                      <SectionCard title={t('createEvent.secBudgetTitle')} sub={t('createEvent.secBudgetSub')} icon="money-bill-alt" colors={C}>
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
                    </>
                  ) : null}

                  {/* Applications Close */}
                  <SectionCard title={t('createEvent.secDeadlineTitle')} sub={t('createEvent.secDeadlineSub')} icon="calendar-alt" colors={C}>
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

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable
                      style={[s.editBtn, { borderColor: C.brinjal1 }]}
                      onPress={() => setPhase(cameFromNewFlowRef.current ?? 'setup')}>
                      <FontAwesome5 name="chevron-left" solid size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.editInputsBtn')}</Text>
                    </Pressable>
                    <Pressable
                      style={[s.publishBtn, { backgroundColor: C.brinjal1 }]}
                      onPress={handleContinueToRoles}>
                      <Text style={s.publishBtnText}>{t('createEvent.continueToRolesBtn')}</Text>
                      <FontAwesome5 name="arrow-right" solid size={18} color="#fff" />
                    </Pressable>
                  </View>
                </>
              )}

              {/* Open Event review */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Review header — icon box + left accent, matching the home feed's banner style. */}
                  <View style={[s.reviewBanner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}>
                    <View style={[s.reviewBannerIconWrap, { backgroundColor: C.primaryLight, shadowColor: C.brinjal1 }]}>
                      <FontAwesome5 name="eye" size={20} color={C.brinjal1} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.reviewBannerTitle, { color: C.text }]}>{t('createEvent.openBannerTitle')}</Text>
                      <Text style={[s.reviewBannerSub, { color: C.textSecondary }]}>{t('createEvent.openBannerSub')}</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <SectionCard title={t('createEvent.secEventTitleOpen')} sub={t('createEvent.secEventTitleOpenSub')} icon="edit" colors={C}>
                    <TextInputWithLabel
                      label={t('createEvent.secEventTitleOpen')}
                      value={form.title}
                      onChangeText={(v) => { update('title', v); if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined })); }}
                      placeholder={t('createEvent.eventTitlePlaceholder')}
                      error={reviewErrors.title}
                    />
                  </SectionCard>

                  {/* Feature image */}
                  <SectionCard title={t('createEvent.secFeatureImageTitle')} sub={t('createEvent.secFeatureImageSub')} icon="image" colors={C}>
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
                        <View style={sc.titleRow}>
                          <View style={[sc.iconChip, { backgroundColor: `${C.brinjal1}1A`, shadowColor: C.brinjal1 }]}>
                            <FontAwesome5 name="file-alt" solid size={14} color={C.brinjal1} />
                          </View>
                          <Text style={[sc.title, { color: C.text }]}>{t('createEvent.secDescOpen')}</Text>
                        </View>
                        <Text style={[sc.sub, { color: C.textSecondary }]}>{t('createEvent.secDescOpenSub')}</Text>
                      </View>
                      <Pressable
                        style={[s.suggestBtn, { borderColor: C.brinjal1, opacity: descSuggestLoading ? 0.6 : 1 }]}
                        onPress={handleSuggestDescription}
                        disabled={descSuggestLoading}>
                        {descSuggestLoading
                          ? <ActivityIndicator size="small" color={C.brinjal1} />
                          : <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.suggestDescriptionBtn')}</Text>}
                      </Pressable>
                    </View>
                    <TextInputWithLabel
                      label={t('createEvent.secDescOpen')}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder={t('createEvent.eventDescPlaceholder')}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Creator Benefits — auto-selected, editable. Uses the same
                      6-item OFFERING_OPTIONS as the Free Invitation flow's own
                      "What are you offering?" step, not the old 10-item BENEFITS
                      list, so editing here and there never diverge. */}
                  <SectionCard title={t('createEvent.secBenefitsTitle')} sub={t('createEvent.secBenefitsSub')} icon="gift" colors={C}>
                    <ChipMultiGroup options={OFFERING_OPTIONS} values={form.benefits} onChange={(v) => update('benefits', v)} colors={C} />
                  </SectionCard>

                  {/* In exchange for this, looking for — Free Invitation-only
                      concept, but this legacy editor is also this flow's "Edit
                      details" fallback, so it needs its own round-trippable field. */}
                  <SectionCard title={t('createInvitation.exchangeLabel')} icon="hand-holding-heart" colors={C}>
                    <ChipMultiGroup options={EXCHANGE_OPTIONS} values={form.exchangeType} onChange={(v) => update('exchangeType', v)} colors={C} />
                  </SectionCard>

                  {!(form.exchangeType.length === 1 && form.exchangeType[0] === 'Just attend & share organically') && (
                    <SectionCard title={t('createInvitation.contentDetailsLabel')} icon="film" colors={C}>
                      <TextInputWithLabel
                        label={t('createInvitation.contentDetailsLabel')}
                        value={form.expectedContent}
                        onChangeText={(v) => update('expectedContent', v)}
                        multiline
                        numberOfLines={3}
                      />
                    </SectionCard>
                  )}

                  {/* Who you're inviting */}
                  <SectionCard title={t('createInvitation.invitingLabel')} icon="users" colors={C}>
                    <ChipMultiGroup options={ROLE_TYPE_OPTIONS} values={form.roleTypes} onChange={(v) => update('roleTypes', v)} colors={C} />
                  </SectionCard>

                  {/* Capacity */}
                  <SectionCard title={t('createEvent.secCapacityTitle')} sub={t('createEvent.secCapacitySub')} icon="users" colors={C}>
                    <Stepper value={form.capacity} onChange={(v) => update('capacity', v)} min={1} max={500} colors={C} />
                  </SectionCard>

                  {/* Platform (optional) */}
                  <SectionCard title={t('createEvent.secPlatformOptTitle')} sub={t('createEvent.secPlatformOptSub')} icon="share-alt" colors={C}>
                    <ChipGroup
                      options={['Instagram', 'TikTok', 'YouTube', 'Facebook', notRequiredLabel]}
                      value={form.platforms[0] ?? notRequiredLabel}
                      onChange={(v) => update('platforms', v === notRequiredLabel ? [] : [v])}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Event Date */}
                  <SectionCard title={t('createEvent.secEventDateTitle')} sub={t('createEvent.secEventDateSub')} icon="calendar-alt" colors={C}>
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
                  <SectionCard title={t('createEvent.secRegDeadlineTitle')} sub={t('createEvent.secRegDeadlineSub')} icon="clock" colors={C}>
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
                  <SectionCard title={t('createEvent.secEventSummaryTitle')} icon="clipboard" colors={C}>
                    {[
                      { label: t('createEvent.summaryCategory'), value: form.template || '—' },
                      { label: t('createEvent.summaryVenue'),    value: form.locationType === 'REMOTE' ? t('createEvent.summaryRemote') : (form.venue || t('createEvent.summaryTBD')) },
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
                    t={t}
                  />

                  {/* Save as Draft */}
                  <Pressable
                    style={[s.draftBtn, { borderColor: C.border, opacity: loading ? 0.6 : 1 }]}
                    onPress={handleSaveDraft}
                    disabled={loading}>
                    <FontAwesome5 name="save" size={16} color={C.textSecondary} />
                    <Text style={[s.draftBtnText, { color: C.textSecondary }]}>{t('createEvent.saveDraftBtn')}</Text>
                  </Pressable>

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable style={[s.editBtn, { borderColor: C.brinjal1 }]} onPress={() => setPhase('setup')}>
                      <FontAwesome5 name="chevron-left" solid size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.editEventBtn')}</Text>
                    </Pressable>
                    <Pressable
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

          {/* ── Phase 4: Confirm (PAID_CAMPAIGN only, Airbnb-style final review) ── */}
          {phase === 'confirm' && form.eventType === 'PAID_CAMPAIGN' && (
            <View style={s.content}>
              <ListingHeroCard
                featureImageUrl={form.featureImageUrl}
                title={form.title.trim() || t('createEvent.untitledEvent')}
                category={selectedTemplate ? form.template : undefined}
                colors={C}
              />

              {/* Summary card — same bordered/shadowed surface as every
                  SectionCard in the form above, so the final review reads
                  as one continuous system rather than a bare list. */}
              <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border, gap: 2 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={[sc.title, { color: C.text }]}>{t('createEvent.secSummaryTitle')}</Text>
                  <Pressable onPress={() => setPhase('review')} hitSlop={8}>
                    <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.editReviewBtn')}</Text>
                  </Pressable>
                </View>
                <PreviewRow icon={form.locationType === 'REMOTE' ? 'globe' : 'map-marker-alt'} label={t('createEvent.summaryLocation')} value={form.locationType === 'REMOTE' ? t('createEvent.summaryRemote') : form.location} colors={C} />
                {/* "Who you're targeting" now reflects the roles actually picked in
                    the Roles step (there's no separate audience picker anymore) —
                    folds in what used to be a separate, redundant Roles/Creators
                    Needed row. */}
                {requirementMode === 'multiple' ? (
                  <PreviewRow
                    icon="users"
                    label={t('createEvent.confirmSectionWho')}
                    value={form.requirements.map((r) => `${r.categoryName} ×${r.quantity}`).join(', ') || '—'}
                    colors={C}
                  />
                ) : (
                  <PreviewRow
                    icon="users"
                    label={t('createEvent.confirmSectionWho')}
                    value={form.template ? `${form.template} (${form.creatorsNeeded})` : String(form.creatorsNeeded)}
                    colors={C}
                  />
                )}
                <PreviewRow icon="film" label={t('createEvent.confirmSectionDeliverables')} value={summarizeDeliverables(form.deliverables, form.goals, t)} colors={C} />
                <PreviewRow icon="money-bill-alt" label={t('createEvent.confirmSectionBudget')} value={`Rs. ${confirmBudgetRange.min.toLocaleString()} – ${confirmBudgetRange.max.toLocaleString()}`} colors={C} />
                <PreviewRow icon="calendar-alt" label={t('createEvent.confirmSectionCloses')} value={form.deadline ? fmtDate(form.deadline) : '—'} colors={C} />
                <PreviewRow
                  icon={form.completionType === 'SERVICE' ? 'handshake' : 'cloud-upload-alt'}
                  label={t('createOpportunity.completionLabel')}
                  value={form.completionType === 'SERVICE' ? t('createOpportunity.completionServiceTitle')
                    : form.completionType === 'DELIVERABLE' ? t('createOpportunity.completionDeliverableTitle')
                    : '—'}
                  colors={C}
                  last
                />
              </View>

              {/* Featured toggle */}
              <FeaturedToggle
                value={form.isFeatured}
                onChange={(v) => update('isFeatured', v)}
                quota={featuredQuota}
                colors={C}
                t={t}
              />

              {/* Save as Draft */}
              <Pressable
                style={[s.draftBtn, { borderColor: C.border, opacity: loading ? 0.6 : 1 }]}
                onPress={handleSaveDraft}
                disabled={loading}>
                <FontAwesome5 name="save" size={16} color={C.textSecondary} />
                <Text style={[s.draftBtnText, { color: C.textSecondary }]}>{t('createEvent.saveDraftBtn')}</Text>
              </Pressable>

              {/* Actions */}
              <View style={s.reviewActions}>
                <Pressable
                  style={[s.editBtn, { borderColor: C.brinjal1 }]}
                  onPress={() => setPhase('roles')}>
                  <FontAwesome5 name="chevron-left" solid size={16} color={C.brinjal1} />
                  <Text style={[s.editBtnText, { color: C.brinjal1 }]}>{t('createEvent.backToEditBtn')}</Text>
                </Pressable>
                <Pressable
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
      </MaxWidthContainer>

      {/* Pre-publish warning modal */}
      <Modal visible={publishWarnVisible} transparent animationType="fade" onRequestClose={() => setPublishWarnVisible(false)}>
        <Pressable style={s.warnScrim} onPress={() => setPublishWarnVisible(false)}>
          <Pressable style={[s.warnSheet, { backgroundColor: C.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.warnIconWrap}>
              <FontAwesome5 name="exclamation-triangle" solid size={32} color="#F59E0B" />
            </View>
            <Text style={[s.warnTitle, { color: C.text }]}>{t('createEvent.warnTitle')}</Text>
            <Text style={[s.warnBody, { color: C.textSecondary }]}>
              {t('createEvent.warnBodyPre')}<Text style={{ fontWeight: '700', color: C.text }}>{t('createEvent.warnBodyBold')}</Text>{t('createEvent.warnBodyPost')}
            </Text>
            <View style={s.warnActions}>
              <Pressable style={[s.warnCancelBtn, { borderColor: C.border }]} onPress={() => setPublishWarnVisible(false)}>
                <Text style={[s.warnCancelText, { color: C.textSecondary }]}>{t('createEvent.warnGoBack')}</Text>
              </Pressable>
              <Pressable
                style={[s.warnConfirmBtn, { backgroundColor: C.brinjal1 }]}
                onPress={() => { setPublishWarnVisible(false); handlePublish(); }}>
                <Text style={s.warnConfirmText}>{t('createEvent.warnPublishNow')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Need Help? walkthrough — centered card, tap a language to hear it via TTS */}
      <Modal visible={needHelpVisible} transparent animationType="fade" onRequestClose={closeNeedHelp}>
        <Pressable style={s.warnScrim} onPress={closeNeedHelp}>
          <Pressable style={[s.helpSheet, { backgroundColor: C.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.helpHeaderRow}>
              <Text style={[s.warnTitle, { color: C.text, marginBottom: 0, textAlign: 'left' }]}>{t('createEvent.needHelpTitle')}</Text>
              <Pressable onPress={closeNeedHelp} hitSlop={8}>
                <FontAwesome5 name="times" solid size={22} color={C.textSecondary} />
              </Pressable>
            </View>
            <Text style={[s.helpSub, { color: C.textSecondary }]}>{t('createEvent.needHelpSub')}</Text>
            {/* Same rounded-icon-with-glow-shadow + label pattern as the business
                home tab's Quick Actions row, using the shared TabColors accents
                (brand=English, info=Nepali) instead of ad-hoc colors. */}
            <View style={s.helpCardsRow}>
              {(['en', 'ne'] as const).map((lang) => {
                const isPlaying = helpPlayingLang === lang;
                const isLocked  = helpPlayingLang !== null && !isPlaying;
                const tone = lang === 'en' ? TabColors.brand : TabColors.info;
                return (
                  <Pressable
                    key={lang}
                    style={[
                      s.helpCard,
                      { backgroundColor: C.surface, borderColor: isPlaying ? tone.color : C.border, opacity: isLocked ? 0.4 : 1 },
                      SHADOW.card,
                    ]}
                    onPress={() => handlePlayHelp(lang)}
                    disabled={isLocked}>
                    <View
                      style={[
                        s.helpCardIcon,
                        {
                          backgroundColor: isPlaying ? tone.color : tone.bg,
                          shadowColor: tone.color, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
                        },
                      ]}>
                      <FontAwesome5 name={isPlaying ? 'stop' : 'play'} solid size={20} color={isPlaying ? '#fff' : tone.color} />
                    </View>
                    <Text style={[s.helpCardLabel, { color: C.text }]}>
                      {lang === 'en' ? t('createEvent.needHelpEnglish') : t('createEvent.needHelpNepali')}
                    </Text>
                  </Pressable>
                );
              })}
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

      {/* Publish screen's "Applications close" row opens this directly. */}
      <BottomSheet
        visible={deadlinePickerOpen}
        onClose={() => setDeadlinePickerOpen(false)}
        title={t('createEvent.secDeadlineTitle')}
        maxHeightPct={0.7}>
        {form.deadline && (
          <View style={[{ borderRadius: RADIUS.sm, padding: 10, backgroundColor: C.primaryLight }]}>
            <Text style={[{ fontSize: 13, fontFamily: F.bold, color: C.brinjal1 }]}>{t('createEvent.deadlineSelected', { date: fmtDate(form.deadline) })}</Text>
          </View>
        )}
        <View style={{ marginTop: 16 }}>
          <CalendarGrid value={form.deadline} onChange={(d) => { update('deadline', d); setDeadlinePickerOpen(false); }} colors={C} />
        </View>
      </BottomSheet>

      {/* Free Invitation publish screen's "Event date" row opens this directly. */}
      <BottomSheet
        visible={eventDatePickerOpen}
        onClose={() => setEventDatePickerOpen(false)}
        title={t('createEvent.secEventDateTitle')}
        maxHeightPct={0.7}>
        {form.eventDate && (
          <View style={[{ borderRadius: RADIUS.sm, padding: 10, backgroundColor: C.primaryLight }]}>
            <Text style={[{ fontSize: 13, fontFamily: F.bold, color: C.brinjal1 }]}>{t('createEvent.deadlineSelected', { date: fmtDate(form.eventDate) })}</Text>
          </View>
        )}
        <View style={{ marginTop: 16 }}>
          <CalendarGrid
            value={form.eventDate}
            onChange={(d) => {
              const twoDaysBefore = d ? dayStart(new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000)) : null;
              setForm((prev) => ({ ...prev, eventDate: d, deadline: twoDaysBefore }));
              setEventDatePickerOpen(false);
            }}
            colors={C}
          />
        </View>
      </BottomSheet>

      {/* Free Invitation publish screen's "Creator Capacity" row opens this directly. */}
      <BottomSheet
        visible={capacityPickerOpen}
        onClose={() => setCapacityPickerOpen(false)}
        title={t('createEvent.secCapacityTitle')}
        maxHeightPct={0.5}>
        <View style={{ marginTop: 8 }}>
          <Stepper value={form.capacity} onChange={(v) => update('capacity', v)} min={1} max={500} colors={C} />
        </View>
      </BottomSheet>

      {/* Publish screen tap-to-edit — one shared sheet, contents switch on
          `editingField`. Location has its own modal above; per-role editing
          uses its own sheet instead (see editingRequirementKey below). */}
      <BottomSheet
        visible={editingField !== null}
        onClose={() => setEditingField(null)}
        title={
          editingField === 'title' ? t('createEvent.secEventTitlePaid')
          : editingField === 'description' ? t('createOpportunity.purposeLabel')
          : editingField === 'category' ? t('createEvent.summaryCategory')
          : editingField === 'budget' ? t('createEvent.secBudgetTitle')
          : editingField === 'roles' ? t('createEvent.secCreatorsNeededTitle')
          : editingField === 'deliverables' ? t('createEvent.confirmSectionDeliverables')
          : editingField === 'image' ? t('createEvent.secFeatureImageTitle')
          : editingField === 'hashtags' ? t('createEvent.confirmSectionHashtags')
          : editingField === 'offerings' ? t('createInvitation.offeringLabel')
          : editingField === 'exchangeType' ? t('createInvitation.exchangeLabel')
          : editingField === 'expectedContent' ? t('createInvitation.contentDetailsLabel')
          : editingField === 'roleTypes' ? t('createInvitation.invitingLabel')
          : editingField === 'completionType' ? t('createOpportunity.completionLabel')
          : ''
        }>
        {editingField === 'title' && (
          <TextInputWithLabel
            label={t('createEvent.secEventTitlePaid')}
            value={form.title}
            onChangeText={(v) => update('title', v)}
            placeholder={t('createEvent.eventTitlePlaceholder')}
          />
        )}
        {editingField === 'description' && (
          <View style={{ gap: 10 }}>
            <TextInputWithLabel
              label={t('createOpportunity.purposeLabel')}
              value={form.description}
              onChangeText={(v) => update('description', v)}
              placeholder={t('createEvent.descriptionPlaceholder')}
              multiline
              numberOfLines={6}
            />
            <Pressable
              style={[s.suggestBtn, { borderColor: C.brinjal1, opacity: descSuggestLoading ? 0.6 : 1, alignSelf: 'flex-start' }]}
              onPress={handleSuggestDescription}
              disabled={descSuggestLoading}>
              {descSuggestLoading
                ? <ActivityIndicator size="small" color={C.brinjal1} />
                : <Text style={[s.suggestBtnText, { color: C.brinjal1 }]}>{t('createEvent.suggestDescriptionBtn')}</Text>}
            </Pressable>
          </View>
        )}
        {editingField === 'category' && (
          <ChipGroup
            options={categoryOptions.map((c) => c.label)}
            value={form.template}
            onChange={(v) => update('template', v)}
            colors={C}
          />
        )}
        {editingField === 'budget' && (
          <BudgetTierPicker
            budgetMin={form.aiBudgetMin}
            budgetMax={form.aiBudgetMax}
            onChange={(min, max) => {
              update('aiBudgetMin', min);
              update('aiBudgetMax', max);
              // Publishing re-runs validatePaidReview, which rejects a
              // below-minimum budget — clear the stale error as soon as the
              // number changes rather than leaving it under the row.
              if (reviewErrors.budget) setReviewErrors((e) => ({ ...e, budget: undefined }));
            }}
            colors={C}
            error={reviewErrors.budget}
          />
        )}
        {editingField === 'roles' && (
          <Stepper value={form.creatorsNeeded} onChange={(v) => update('creatorsNeeded', v)} colors={C} />
        )}
        {editingField === 'deliverables' && (
          <DeliverablesCounterList
            value={form.deliverables}
            onChange={(v) => update('deliverables', v)}
            colors={C}
            t={t}
          />
        )}
        {editingField === 'image' && (
          <FeatureImagePicker
            imageUrl={form.featureImageUrl}
            category={form.template}
            uploading={featureImageUploading}
            onPick={handlePickFeatureImage}
            onClear={handleClearFeatureImage}
            colors={C}
          />
        )}
        {editingField === 'hashtags' && (
          <HashtagEditor
            hashtags={form.hashtags}
            onChange={(v) => update('hashtags', v)}
            colors={C}
            t={t}
          />
        )}
        {editingField === 'offerings' && (
          <ChipMultiGroup options={OFFERING_OPTIONS} values={form.benefits} onChange={(v) => update('benefits', v)} colors={C} />
        )}
        {editingField === 'exchangeType' && (
          <ChipMultiGroup options={EXCHANGE_OPTIONS} values={form.exchangeType} onChange={(v) => update('exchangeType', v)} colors={C} />
        )}
        {editingField === 'expectedContent' && (
          <TextInputWithLabel
            label={t('createInvitation.contentDetailsLabel')}
            value={form.expectedContent}
            onChangeText={(v) => update('expectedContent', v)}
            multiline
            numberOfLines={3}
          />
        )}
        {editingField === 'roleTypes' && (
          <ChipMultiGroup options={ROLE_TYPE_OPTIONS} values={form.roleTypes} onChange={(v) => update('roleTypes', v)} colors={C} />
        )}
        {editingField === 'completionType' && (
          <CompletionTypePicker
            value={form.completionType}
            reason={form.completionReason}
            onChange={(v) => setForm((f) => ({ ...f, completionType: v, completionReason: v === f.completionType ? f.completionReason : '' }))}
            colors={C}
            t={t}
          />
        )}
      </BottomSheet>

      {/* Publish step's "People Needed" pencil icons — edit one role's budget
          + content at a time, without leaving the summary. */}
      <BottomSheet
        visible={editingRequirementKey !== null || draftRequirement !== null}
        onClose={() => { setEditingRequirementKey(null); setDraftRequirement(null); }}
        title={draftRequirement
          ? t('createEvent.reqAddRoleTitle')
          : editingRequirement
            ? (editingRequirement.categoryName ? `${editingRequirement.categoryName} ×${editingRequirement.quantity}` : t('createEvent.reqRoleLabel', { n: 1 }))
            : t('createEvent.secCreatorsNeededTitle')}>
        {editingRequirementKey === '__single__' && (
          <View style={{ gap: 8 }}>
            <Text style={[rq.fieldLabel, { color: C.textSecondary, marginTop: 0 }]}>{t('createEvent.secBudgetTitle')}</Text>
            <BudgetTierPicker
              budgetMin={form.aiBudgetMin}
              budgetMax={form.aiBudgetMax}
              onChange={(min, max) => { update('aiBudgetMin', min); update('aiBudgetMax', max); }}
              colors={C}
            />
            <Text style={[rq.fieldLabel, { color: C.textSecondary }]}>{t('createEvent.reqDeliverablesLabel')}</Text>
            <DeliverablesCounterList
              value={form.deliverables}
              onChange={(v) => update('deliverables', v)}
              colors={C}
              t={t}
            />
          </View>
        )}
        {editingRequirement && !draftRequirement && (
          <RequirementRoleEditor
            item={editingRequirement}
            providerCategoryOptions={providerCategoryOptions}
            onChange={(next) => update('requirements', form.requirements.map((r) => (r.key === next.key ? next : r)))}
            colors={C}
            t={t}
          />
        )}
        {/* Add flow — the draft only joins form.requirements when this button
            is tapped, so a swipe-down dismiss leaves the campaign untouched. */}
        {draftRequirement && (
          <View style={{ gap: 8 }}>
            <RequirementRoleEditor
              item={draftRequirement}
              providerCategoryOptions={providerCategoryOptions}
              onChange={setDraftRequirement}
              colors={C}
              t={t}
            />
            <Pressable
              style={[rq.commitBtn, { backgroundColor: C.brinjal1 }]}
              accessibilityRole="button"
              accessibilityLabel={t('createEvent.reqAddRoleConfirm')}
              onPress={() => {
                update('requirements', [...form.requirements, draftRequirement]);
                if (reviewErrors.requirements) setReviewErrors((e) => ({ ...e, requirements: undefined }));
                setDraftRequirement(null);
              }}>
              <FontAwesome5 name="plus" size={13} color="#fff" />
              <Text style={rq.commitBtnText}>{t('createEvent.reqAddRoleConfirm')}</Text>
            </Pressable>
          </View>
        )}
      </BottomSheet>

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
          <FontAwesome5 name={toast.type === 'success' ? 'check-circle' : 'times-circle'} solid size={18} color="#fff" style={{ marginRight: 8 }} />
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

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerDivider:{ height: 1, marginHorizontal: 20 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontFamily: F.bold },
  headerSub:    { fontSize: 11, marginTop: 1, fontFamily: F.regular },
  phasePill:    { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  phasePillText:{ fontSize: 12, fontFamily: F.bold },
  hashtagPill:    { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  hashtagPillText:{ fontSize: 12, fontFamily: F.semibold },

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
  locationBtnTxt: { flex: 1, fontSize: 15, lineHeight: 23, fontFamily: F.regular },
  locationArrow:  { fontSize: 20, color: '#9CA3AF' },
  remoteCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 14 },
  remoteTextWrap: { flex: 1, gap: 3 },
  remoteTitle:    { fontSize: 14, fontFamily: F.semibold },
  remoteBody:     { fontSize: 13, lineHeight: 20, fontFamily: F.regular },

  descHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  descHeaderText: { flex: 1, minWidth: 0 },
  suggestBtn:     { borderRadius: RADIUS.full, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, minHeight: 30, alignItems: 'center', justifyContent: 'center' },
  suggestBtnText: { fontSize: 12, fontFamily: F.bold },

  generateBtn:     { borderRadius: RADIUS.md, height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, ...SHADOW.raised },
  generateBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },

  reviewBanner:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, borderLeftWidth: 4, paddingVertical: 14, paddingHorizontal: 14, ...SHADOW.card },
  reviewBannerIconWrap:{ width: 38, height: 38, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  reviewBannerTitle:   { fontSize: 14, fontFamily: F.bold },
  reviewBannerSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },

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

  eventTypeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  needHelpLinkRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  needHelpLinkText:   { fontSize: 13, fontFamily: F.semibold },
  needHelpPill:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'center', borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 9, marginTop: 4 },

  helpSheet:     { width: '100%', borderRadius: RADIUS.xl, padding: 24, ...SHADOW.floating },
  helpHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  helpSub:       { fontSize: 13, fontFamily: F.regular, lineHeight: 20, marginBottom: 20 },
  // Mirrors the home tab's quickActionsRow/quickAction/quickActionIcon/
  // quickActionLabel shapes exactly (RADIUS.lg card, RADIUS.md icon box,
  // colored glow shadow) so this modal reads as the same design system.
  helpCardsRow:  { flexDirection: 'row', gap: 10 },
  helpCard:      { flex: 1, alignItems: 'center', borderRadius: RADIUS.lg, paddingVertical: 16, gap: 8, borderWidth: 1 },
  helpCardIcon:  { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  helpCardLabel: { fontSize: 12, fontFamily: F.semibold, textAlign: 'center' },

  toast:     { position: 'absolute', bottom: 40, left: 20, right: 20, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', ...SHADOW.floating },
  toastText: { color: '#fff', fontSize: 14, flex: 1, fontFamily: F.bold },

  stepSectionHeading: { fontSize: 15, fontFamily: F.bold },
  stepSectionSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18, marginBottom: 4 },

  // Descriptive selectable option cards (event type, input method) — icon
  // chip + title + description in one tappable row, selected state via
  // border/background swap. Used in place of a plain TabSlider wherever the
  // choice benefits from an explanatory sentence, not just a short label.
  // No `elevation` here (Android-only) — combined with the press `transform: scale`
  // below, Android's elevation shadow renders against the pre-scale bounds for a
  // frame, showing as a grey box inside the border/padding. iOS's shadow* props
  // don't have that issue, so they're kept.
  optionCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, padding: 14, shadowColor: SHADOW.card.shadowColor, shadowOpacity: SHADOW.card.shadowOpacity, shadowRadius: SHADOW.card.shadowRadius, shadowOffset: SHADOW.card.shadowOffset },
  // shadowColor is tinted per-option (see `tone.color` below) for a soft colored glow —
  // Android's `elevation` can't be tinted and just paints a flat gray blob over the icon
  // chip instead, so it's iOS-only here; Android gets no elevation on this small chip.
  optionIconWrap: { width: 40, height: 40, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, default: {} }) },
  optionTextWrap: { flex: 1, gap: 2 },
  optionTitle:    { fontSize: 14, fontFamily: F.bold },
  optionDesc:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },
  // ── "What are you looking to create?" cards — dedicated styles (not the
  // shared optionCard/optionIconWrap family above, which the 'describe'
  // phase's text/audio picker also uses) so this redesign can't shift that
  // other picker's layout.
  typeCard:       { borderRadius: RADIUS.xl, borderWidth: 1.5, padding: 18, gap: 14, ...SHADOW.raised },
  typeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  typeCardIconWrap: { width: 52, height: 52, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center', ...Platform.select({ ios: { shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, default: {} }) },
  typeCardTitle:  { fontSize: 17, fontFamily: F.bold, marginBottom: 3 },
  typeCardDesc:   { fontSize: 13, fontFamily: F.regular, lineHeight: 20 },
  typeCardExample: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: RADIUS.md, borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 10 },
  typeCardExampleText: { flex: 1, fontSize: 12, fontFamily: F.medium, lineHeight: 18, fontStyle: 'italic' },
  typeCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  typeCardCta:    { fontSize: 13, fontFamily: F.bold },

  eventHintBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: RADIUS.md, padding: 14 },
  eventHintText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: F.regular },

});

const ai = StyleSheet.create({
  charCount:    { fontSize: 11, fontFamily: F.regular, textAlign: 'right', marginTop: 4 },
  exampleLabel: { fontSize: 11, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  exampleChip:  { borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%' },
  exampleChipText: { fontSize: 12, fontFamily: F.regular },
  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sampleChip:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
