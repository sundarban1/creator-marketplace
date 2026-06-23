import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
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
import { campaignService } from '@/services/campaign';
import { profileService } from '@/services/profile';
import { CATEGORY_META, CREATOR_CATEGORIES, DEFAULT_META } from '@/features/creator/data/filterOptions';
import { F } from '@/utilities/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

// Categories are fetched from API on mount (same list as creator onboarding)
// Static fallback in case API is slow
const CATEGORY_FALLBACK = CREATOR_CATEGORIES.map((c) => ({
  label: c.label,
  emoji: c.emoji,
}));

const GOALS = [
  'Brand Awareness',
  'More Customers',
  'Product Launch',
  'Event Promotion',
  'Social Media Content',
  'User Generated Content',
];

const BUDGETS = [
  'Under Rs. 5,000',
  'Rs. 5,000 – 15,000',
  'Rs. 15,000 – 50,000',
  'Rs. 50,000+',
  'Free Product Exchange',
];

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

const PLATFORM_FALLBACK = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];

const BUDGET_MAP: Record<string, { min: number; max: number; payment: string }> = {
  'Under Rs. 5,000':        { min: 0,     max: 5000,   payment: 'Fixed Fee' },
  'Rs. 5,000 – 15,000':     { min: 5000,  max: 15000,  payment: 'Fixed Fee' },
  'Rs. 15,000 – 50,000':    { min: 15000, max: 50000,  payment: 'Fixed Fee' },
  'Rs. 50,000+':            { min: 50000, max: 999999, payment: 'Fixed Fee' },
  'Free Product Exchange':  { min: 0,     max: 0,      payment: 'Product Exchange' },
};

const TEMPLATE_CONTENT: Record<string, { title: string; desc: string }> = {
  'Food':           { title: 'Authentic Food Experience – Creator Collaboration', desc: "We're looking for food creators to showcase our restaurant, dishes, or food products with genuine taste reactions and stunning visuals. Help us inspire food lovers to discover us." },
  'Travel':         { title: 'Nepal Adventure – Travel Creator Campaign', desc: "We're partnering with travel creators to showcase our destination, property, or travel experience. Create compelling journey content that inspires audiences to explore." },
  'Fashion':        { title: 'Style Collaboration – Fashion Creator Campaign', desc: "We're looking for fashion creators to model and showcase our latest collection. Feature our pieces in your signature style and help us reach fashion-forward audiences." },
  'Beauty':         { title: 'Glow Up – Beauty Creator Campaign', desc: "We're inviting beauty creators to feature our products or services, document transformation experiences, and share before/after content that inspires their audience." },
  'Fitness':        { title: 'Fitness Collab – Gym & Wellness Campaign', desc: "We're looking for fitness creators to showcase our gym, equipment, or fitness products. Create motivational content that inspires audiences to start their fitness journey." },
  'Gaming':         { title: 'Gaming Review – Creator Collaboration', desc: "We're partnering with gaming creators for a review, gameplay showcase, or sponsored content about our game or gaming product. Share your genuine experience with your audience." },
  'Tech':           { title: 'Honest Tech Review – Creator Collab', desc: "We're partnering with tech creators for an unboxing, feature demo, and honest review of our latest product. Share your genuine take on performance and value." },
  'Education':      { title: 'Learn & Grow – Education Creator Campaign', desc: "We're partnering with creators to promote our courses or programs. Highlight benefits and student success stories to help us reach learners ready to upskill." },
  'Lifestyle':      { title: 'Lifestyle Integration – Creator Partnership', desc: "We're looking for lifestyle creators to naturally integrate our brand into their daily content. Show how our product or service fits seamlessly into a modern lifestyle." },
  'Home & Living':  { title: 'Home Transformation – Creator Campaign', desc: "We're inviting home & living creators to feature our products in real home settings. Create inspiring content that shows how our products elevate everyday living." },
  'Wellness':       { title: 'Wellness Journey – Creator Collaboration', desc: "We're partnering with wellness creators to showcase our products, services, or programs. Help us reach health-conscious audiences looking to improve their wellbeing." },
  'Music':          { title: 'Music & Entertainment – Creator Campaign', desc: "We're looking for music creators to promote our event, brand, or product. Create engaging audio-visual content that connects with music lovers and builds excitement." },
  'Art & Design':   { title: 'Creative Collab – Art & Design Campaign', desc: "We're partnering with creative and design creators to showcase our brand with artistic flair. Create visually stunning content that highlights our aesthetic and values." },
  'Pets':           { title: 'Pet-Friendly Creator Campaign', desc: "We're looking for pet creators to feature our pet products or services. Show your furry friends enjoying what we offer and help us reach dedicated pet owners." },
  'Parenting':      { title: 'Parenting Creator Campaign', desc: "We're partnering with parenting creators to showcase our family-friendly products. Share authentic family moments that resonate with parents and caregivers." },
  'Automotive':     { title: 'Auto Creator Campaign', desc: "We're looking for automotive creators for a test drive, feature review, or showroom visit. Create engaging content that showcases performance, style, and value." },
  'Finance':        { title: 'Financial Education – Creator Campaign', desc: "We're partnering with finance creators to educate audiences about our financial products or services. Help us build trust and reach people ready to make smart money moves." },
  'Sustainability': { title: 'Eco-Conscious Creator Campaign', desc: "We're partnering with sustainability creators to promote our eco-friendly products or initiatives. Help us inspire audiences to make conscious choices for the planet." },
  'Photography':    { title: 'Photography Showcase – Creator Campaign', desc: "We're looking for photography creators to capture and showcase our products, spaces, or experiences. Create stunning visual content that tells our brand's story." },
  'Sports':         { title: 'Sports & Fitness – Creator Campaign', desc: "We're looking for sports creators to showcase our products, equipment, or services in action. Create high-energy content that motivates your athletic audience." },
  'Film & TV':      { title: 'Entertainment Creator Campaign', desc: "We're partnering with film and entertainment creators for a review, reaction, or sponsored content about our production, platform, or entertainment product." },
  'Mindfulness':    { title: 'Mindfulness & Wellness – Creator Campaign', desc: "We're partnering with mindfulness creators to promote our wellness products or programs. Help us reach audiences looking to reduce stress and improve mental wellbeing." },
  'Food & Drink':   { title: 'Food & Beverage Creator Campaign', desc: "We're looking for food and drink creators to showcase our café, restaurant, or beverage products. Create aesthetic content with genuine taste reactions that inspire followers." },
  'Entertainment':  { title: 'Event & Entertainment – Creator Campaign', desc: "We're hosting an event or launching entertainment content and need creators to build hype and coverage. Create compelling content that drives awareness and excitement." },
};

const DELIVERABLE_TYPES: { key: string; label: string }[] = [
  { key: 'REEL',                  label: 'Reel' },
  { key: 'STORY',                 label: 'Story' },
  { key: 'PHOTO_POST',            label: 'Photo Post' },
  { key: 'CAROUSEL_POST',         label: 'Carousel Post' },
  { key: 'VISIT_STORE',           label: 'Visit Store' },
  { key: 'PRODUCT_REVIEW_VIDEO',  label: 'Product Review Video' },
  { key: 'EVENT_COVERAGE_VIDEO',  label: 'Event Coverage Video' },
  { key: 'MENTION_IN_CAPTION',    label: 'Mention in Caption' },
  { key: 'TAG_BUSINESS',          label: 'Tag Business' },
  { key: 'GOOGLE_REVIEW',         label: 'Google Review' },
];

const DEFAULT_DELIVERABLES: Record<string, number> = Object.fromEntries(
  DELIVERABLE_TYPES.map((d) => [d.key, 0])
);

type TemplatePreset = { deliverables: Record<string, number>; goals: string[]; budget: string };
const p = (overrides: Partial<Record<string, number>>, goals: string[], budget: string): TemplatePreset =>
  ({ deliverables: { ...DEFAULT_DELIVERABLES, ...overrides }, goals, budget });

const TEMPLATE_PRESETS: Record<string, TemplatePreset> = {
  'Food':           p({ REEL: 1, STORY: 3, VISIT_STORE: 1 },                ['More Customers', 'Brand Awareness'],       'Rs. 5,000 – 15,000'),
  'Travel':         p({ REEL: 1, PHOTO_POST: 5, STORY: 3, VISIT_STORE: 1 }, ['Brand Awareness', 'More Customers'],       'Rs. 15,000 – 50,000'),
  'Fashion':        p({ REEL: 1, PHOTO_POST: 1, STORY: 1 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Beauty':         p({ REEL: 1, STORY: 2, VISIT_STORE: 1 },                ['More Customers', 'Brand Awareness'],       'Rs. 5,000 – 15,000'),
  'Fitness':        p({ REEL: 1, STORY: 1, VISIT_STORE: 1 },                ['More Customers', 'Brand Awareness'],       'Under Rs. 5,000'),
  'Gaming':         p({ REEL: 1, PRODUCT_REVIEW_VIDEO: 1, STORY: 1 },       ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Tech':           p({ PRODUCT_REVIEW_VIDEO: 1, PHOTO_POST: 1, STORY: 1 }, ['Product Launch', 'Brand Awareness'],       'Rs. 5,000 – 15,000'),
  'Education':      p({ REEL: 1, STORY: 2, CAROUSEL_POST: 1 },              ['More Customers', 'Brand Awareness'],       'Rs. 5,000 – 15,000'),
  'Lifestyle':      p({ REEL: 1, PHOTO_POST: 2, STORY: 3 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Home & Living':  p({ REEL: 1, PHOTO_POST: 3, STORY: 1 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Wellness':       p({ REEL: 1, STORY: 2, VISIT_STORE: 1 },                ['More Customers', 'Brand Awareness'],       'Rs. 5,000 – 15,000'),
  'Music':          p({ REEL: 1, STORY: 2, EVENT_COVERAGE_VIDEO: 1 },       ['Brand Awareness', 'Event Promotion'],      'Rs. 5,000 – 15,000'),
  'Art & Design':   p({ REEL: 1, PHOTO_POST: 3, STORY: 1 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Pets':           p({ REEL: 1, PHOTO_POST: 1, STORY: 2 },                 ['Brand Awareness', 'Social Media Content'], 'Under Rs. 5,000'),
  'Parenting':      p({ REEL: 1, PHOTO_POST: 1, STORY: 2 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Automotive':     p({ REEL: 1, PHOTO_POST: 3, PRODUCT_REVIEW_VIDEO: 1 },  ['Brand Awareness', 'More Customers'],       'Rs. 15,000 – 50,000'),
  'Finance':        p({ REEL: 1, STORY: 2, CAROUSEL_POST: 1 },              ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Sustainability': p({ REEL: 1, PHOTO_POST: 2, STORY: 1 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Photography':    p({ PHOTO_POST: 5, REEL: 1, STORY: 2 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Sports':         p({ REEL: 1, STORY: 1, VISIT_STORE: 1 },                ['More Customers', 'Brand Awareness'],       'Under Rs. 5,000'),
  'Film & TV':      p({ REEL: 1, STORY: 2, EVENT_COVERAGE_VIDEO: 1 },       ['Brand Awareness', 'Event Promotion'],      'Rs. 5,000 – 15,000'),
  'Mindfulness':    p({ REEL: 1, STORY: 3, PHOTO_POST: 1 },                 ['Brand Awareness', 'Social Media Content'], 'Rs. 5,000 – 15,000'),
  'Food & Drink':   p({ REEL: 1, STORY: 3, PHOTO_POST: 1 },                 ['Brand Awareness', 'More Customers'],       'Rs. 5,000 – 15,000'),
  'Entertainment':  p({ REEL: 2, STORY: 2, EVENT_COVERAGE_VIDEO: 1 },       ['Event Promotion', 'Brand Awareness'],      'Rs. 5,000 – 15,000'),
};

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  template: string;
  goals: string[];
  budget: string;
  creatorType: string[];
  platform: string;
  location: string;
  creatorsNeeded: number;
  deliverables: Record<string, number>;
  title: string;
  description: string;
  deadline: Date | null;
  isFeatured: boolean;
  // Open Event fields
  eventType:    'PAID_CAMPAIGN' | 'OPEN_EVENT';
  eventDate:    Date | null;
  venue:        string;
  capacity:     number;
  benefits:     string[];
  eventContent: string[];
};

type SetupErrors = Partial<Record<'template' | 'goals' | 'budget', string>>;
type ReviewErrors = Partial<Record<'title' | 'deadline' | 'platform' | 'eventDate', string>>;
type EventErrors = Partial<Record<'template' | 'capacity' | 'venue', string>>;
type PlacePrediction = { place_id: string; description: string };

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
  options: readonly { label: string; emoji: string }[];
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
      <Pressable
        style={[dp.trigger, { backgroundColor: C.background, borderColor: error ? ERROR_RED : value ? C.brinjal1 : C.border }]}
        onPress={() => setOpen(true)}>
        {selectedImg ? (
          <Image source={{ uri: selectedImg }} style={dp.triggerThumb} resizeMode="cover" />
        ) : selected ? (
          <Text style={dp.triggerEmoji}>{selected.emoji}</Text>
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
          <Pressable style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={dp.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{placeholder}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {options.map((opt) => {
                const sel = opt.label === value;
                const img = imageFor ? imageFor(opt.label) : undefined;
                return (
                  <Pressable
                    key={opt.label}
                    style={[dp.item, { backgroundColor: sel ? C.primaryLight : 'transparent' }]}
                    onPress={() => { onChange(opt.label); setOpen(false); }}>
                    <View style={[dp.itemThumbWrap, { backgroundColor: C.border, overflow: 'hidden' }]}>
                      {img ? (
                        <Image source={{ uri: img }} style={dp.itemThumb} resizeMode="cover" />
                      ) : (
                        <Text style={dp.itemEmoji}>{opt.emoji}</Text>
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
  triggerEmoji: { fontSize: 18 },
  triggerText:  { flex: 1, fontSize: 14, fontFamily: F.medium },
  error:        { fontSize: 12, color: ERROR_RED, fontFamily: F.regular, marginTop: 4 },
  modalWrap:  { flex: 1, justifyContent: 'flex-end' },
  scrim:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '70%' },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  sheetTitle: { fontSize: 16, fontWeight: '800', fontFamily: F.extrabold, marginBottom: 12 },
  item:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  itemThumbWrap:{ width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  itemThumb:    { width: 44, height: 44 },
  itemEmoji:    { fontSize: 20 },
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
  const [open, setOpen] = useState(false);

  function toggle(opt: string) {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  }

  const label = values.length === 0 ? placeholder : values.length === 1 ? values[0] : `${values[0]} +${values.length - 1} more`;

  return (
    <>
      <Pressable
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
          <Pressable style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={mc.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{placeholder}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={[mc.done, { color: C.brinjal1 }]}>Done</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {options.map((opt) => {
                const checked = values.includes(opt);
                return (
                  <Pressable
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
  badgeText:  { fontSize: 11, color: '#fff', fontWeight: '700', fontFamily: F.bold },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  done:       { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
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
            <Pressable
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
  chip:     { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
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
            <Pressable
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

// ─── PlacesInput ──────────────────────────────────────────────────────────────

function PlacesInput({ value, onChange, colors, error }: {
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useAppColors>;
  error?: string;
}) {
  const C = colors;
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || !GOOGLE_PLACES_KEY) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_KEY}&language=en&types=geocode`;
        const res = await fetch(url);
        const json = await res.json();
        setSuggestions(json.status === 'OK' ? json.predictions : []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <View style={pl.wrap}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder="e.g. Kathmandu, Pokhara or Remote"
        placeholderTextColor={C.textSecondary}
        style={[pl.input, { backgroundColor: C.background, borderColor: error ? ERROR_RED : C.border, color: C.text }]}
      />
      {error && <Text style={pl.errorTxt}>{error}</Text>}
      {suggestions.length > 0 && (
        <View style={[pl.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
          {suggestions.map((place, i) => (
            <Pressable
              key={place.place_id}
              style={[pl.item, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => { onChange(place.description); setSuggestions([]); }}>
              <Text style={pl.pin}>📍</Text>
              <Text style={[pl.itemText, { color: C.text }]} numberOfLines={2}>{place.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const pl = StyleSheet.create({
  wrap:     { zIndex: 99 },
  input:    { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  errorTxt: { fontSize: 12, color: ERROR_RED, marginTop: 4, fontFamily: F.regular },
  dropdown: { borderRadius: 12, borderWidth: 1.5, marginTop: 6, overflow: 'hidden', elevation: 10, zIndex: 100 },
  item:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  pin:      { fontSize: 14 },
  itemText: { fontSize: 13, flex: 1, fontFamily: F.regular },
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
  navTxt:    { fontSize: 28, lineHeight: 32 },
  monthTitle:{ fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  dayRow:    { flexDirection: 'row' },
  dayHdr:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', fontFamily: F.semibold },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  cell:      { width: '14.285%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  dayNum:    { fontSize: 13, fontWeight: '500', fontFamily: F.medium },
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
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        style={[pl.input, { flexDirection: 'row', alignItems: 'center', borderColor: error ? ERROR_RED : value ? C.brinjal1 : C.border, backgroundColor: C.background, height: 50 }]}
        onPress={() => setOpen(true)}>
        <Text style={[{ flex: 1, fontSize: 15, fontFamily: F.regular, color: value ? C.text : C.textSecondary }]}>
          {value ? fmtDate(value) : 'Tap to select a date'}
        </Text>
        {value ? (
          <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); onChange(null); }}>
            <Ionicons name="close-circle" size={18} color={C.textSecondary} />
          </Pressable>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={C.textSecondary} />
        )}
      </Pressable>
      {error && <Text style={pl.errorTxt}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={dp.modalWrap}>
          <Pressable style={dp.scrim} onPress={() => setOpen(false)} />
          <View style={[dp.sheet, { backgroundColor: C.surface }]}>
            <View style={[dp.handle, { backgroundColor: C.border }]} />
            <View style={mc.sheetHeader}>
              <Text style={[dp.sheetTitle, { color: C.text, marginBottom: 0 }]}>{label ?? 'Application Deadline'}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={[mc.done, { color: C.brinjal1 }]}>Done</Text>
              </Pressable>
            </View>
            {value && (
              <View style={[{ borderRadius: 10, padding: 10, marginTop: 12, backgroundColor: C.primaryLight }]}>
                <Text style={[{ fontSize: 13, fontWeight: '700', fontFamily: F.bold, color: C.brinjal1 }]}>Selected: {fmtDate(value)}</Text>
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
  return (
    <View style={[st.wrap, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Pressable style={[st.btn, { backgroundColor: value <= min ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        <Text style={[st.btnTxt, { color: value <= min ? C.border : C.brinjal1 }]}>−</Text>
      </Pressable>
      <View style={st.center}>
        <Text style={[st.value, { color: C.brinjal1 }]}>{value}</Text>
        <Text style={[st.unit, { color: C.textSecondary }]}>creator{value !== 1 ? 's' : ''}</Text>
      </View>
      <Pressable style={[st.btn, { backgroundColor: value >= max ? C.background : C.primaryLight }]}
        onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        <Text style={[st.btnTxt, { color: value >= max ? C.border : C.brinjal1 }]}>+</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  btn:    { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { fontSize: 24, fontWeight: '300', lineHeight: 28, fontFamily: F.regular },
  center: { flex: 1, alignItems: 'center' },
  value:  { fontSize: 24, fontWeight: '800', fontFamily: F.extrabold },
  unit:   { fontSize: 11, fontWeight: '500', marginTop: 1, fontFamily: F.medium },
});

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, sub, children, colors }: {
  title: string; sub?: string; children: React.ReactNode; colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  return (
    <View style={[sc.card, { backgroundColor: C.surface }]}>
      <Text style={[sc.title, { color: C.text }]}>{title}</Text>
      {sub && <Text style={[sc.sub, { color: C.textSecondary }]}>{sub}</Text>}
      {children}
    </View>
  );
}

const sc = StyleSheet.create({
  card:  { borderRadius: 16, padding: 18, gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  title: { fontSize: 15, fontWeight: '800', fontFamily: F.extrabold },
  sub:   { fontSize: 12, lineHeight: 18, marginTop: -6, fontFamily: F.regular },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CreateCampaignScreen() {
  const C = useAppColors();
  const [phase, setPhase] = useState<'setup' | 'review'>('setup');
  const [loading, setLoading] = useState(false);
  const [setupErrors, setSetupErrors] = useState<SetupErrors>({});
  const [reviewErrors, setReviewErrors] = useState<ReviewErrors>({});
  const [eventErrors, setEventErrors] = useState<EventErrors>({});
  const scrollRef = useRef<ScrollView>(null);
  const [categoryOptions, setCategoryOptions] = useState(CATEGORY_FALLBACK);
  const [platformOptions, setPlatformOptions] = useState<string[]>(PLATFORM_FALLBACK);

  useEffect(() => {
    campaignService.getCategories().then((cats) => {
      if (cats.length > 0) {
        setCategoryOptions(
          cats.map((label) => ({
            label,
            emoji: (CATEGORY_META[label] ?? DEFAULT_META).emoji,
          }))
        );
      }
    }).catch(() => { /* keep fallback */ });

    campaignService.getPlatforms().then((plats) => {
      if (plats.length > 0) setPlatformOptions(plats);
    }).catch(() => { /* keep fallback */ });

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
    platform: 'Instagram',
    location: '',
    creatorsNeeded: 1,
    deliverables: { ...DEFAULT_DELIVERABLES },
    title: '',
    description: '',
    deadline: dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    isFeatured: false,
    // Open Event fields
    eventType:    'PAID_CAMPAIGN',
    eventDate:    dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    venue:        '',
    capacity:     20,
    benefits:     [],
    eventContent: [],
  });

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
      platform:       'Instagram',
      location:       prev.location,
      creatorsNeeded: 1,
      deliverables:   { ...DEFAULT_DELIVERABLES },
      title:          '',
      description:    '',
      deadline:       newType === 'OPEN_EVENT' ? regDeadline : dayStart(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      isFeatured:     false,
      eventType:      newType,
      eventDate,
      venue:          prev.venue,
      capacity:       20,
      benefits:       [],
      eventContent:   [],
    }));
    setSetupErrors({});
    setReviewErrors({});
    setEventErrors({});
    setPhase('setup');
  }

  function handleGenerate() {
    const errs: SetupErrors = {};
    if (!form.template)          errs.template = 'Please select a campaign template.';
    if (form.goals.length === 0) errs.goals    = 'Please select at least one goal.';
    if (!form.budget)            errs.budget   = 'Please select a budget range.';

    if (Object.keys(errs).length > 0) { setSetupErrors(errs); return; }
    setSetupErrors({});

    const content = TEMPLATE_CONTENT[form.template] ?? { title: '', desc: '' };
    let desc = content.desc;
    if (desc) {
      desc += `\n\nCampaign Goals: ${form.goals.join(', ')}`;
      if (form.location) desc += `\nLocation: ${form.location}`;
    }

    setForm((prev) => ({ ...prev, title: content.title, description: desc }));
    setPhase('review');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleContinueEvent() {
    const errs: EventErrors = {};
    if (!form.template)        errs.template = 'Please select an event category.';
    if (!form.venue.trim())    errs.venue    = 'Venue / location is required.';
    if (form.capacity < 1)     errs.capacity = 'Capacity must be at least 1.';

    if (Object.keys(errs).length > 0) { setEventErrors(errs); return; }
    setEventErrors({});

    const content  = EVENT_TEMPLATE_CONTENT[form.template] ?? { title: '', desc: '' };
    const autoDesc = content.desc
      ? content.desc + (form.venue ? `\n\nLocation: ${form.venue}` : '')
      : '';
    const suggestedBenefits = CATEGORY_BENEFITS[form.template] ?? ['Event access'];
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

  async function handlePublish() {
    if (form.eventType === 'PAID_CAMPAIGN') {
      const errs: ReviewErrors = {};
      if (!form.title.trim()) errs.title    = 'Campaign title is required.';
      if (!form.platform)     errs.platform = 'Please select a platform.';
      if (!form.deadline)     errs.deadline = 'Please select an application deadline.';
      if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
      setReviewErrors({});

      const budget = BUDGET_MAP[form.budget] ?? { min: 0, max: 0, payment: 'Negotiable' };
      setLoading(true);
      try {
        await campaignService.create({
          title:          form.title.trim(),
          description:    form.description.trim(),
          template:       form.template,
          category:       form.template,
          goals:          form.goals,
          platform:       form.platform,
          location:       form.location.trim() || undefined,
          minFollowers:   0,
          contentType:    form.goals[0] ?? '',
          deliverables:   (() => {
            const parts = DELIVERABLE_TYPES
              .filter((d) => (form.deliverables[d.key] ?? 0) > 0)
              .map((d) => `${form.deliverables[d.key]} ${d.label}`);
            return parts.length > 0 ? parts.join(', ') : form.goals.join(', ');
          })(),
          deadline:       form.deadline!.toISOString(),
          budgetMin:      budget.min,
          budgetMax:      budget.max,
          paymentType:    budget.payment,
          creatorsNeeded: form.creatorsNeeded,
          isFeatured:     form.isFeatured,
          campaignType:   'PAID_CAMPAIGN',
        });
        showToast('Campaign published successfully!');
        setTimeout(() => router.replace('/(business)/'), 500);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to create campaign.', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // Open Event publish
      const errs: ReviewErrors = {};
      if (!form.title.trim()) errs.title     = 'Event title is required.';
      if (!form.eventDate)    errs.eventDate = 'Please select an event date.';
      if (!form.deadline)     errs.deadline  = 'Please select a registration deadline.';
      else if (form.eventDate && form.deadline >= form.eventDate)
        errs.deadline = 'Registration deadline must be before the event date.';
      if (Object.keys(errs).length > 0) { setReviewErrors(errs); return; }
      setReviewErrors({});

      setLoading(true);
      try {
        await campaignService.create({
          title:          form.title.trim(),
          description:    form.description.trim(),
          template:       form.template,
          category:       form.template,
          goals:          ['Event Promotion', 'Brand Awareness'],
          platform:       form.platform || '',
          location:       form.venue.trim() || undefined,
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
        showToast('Event published successfully!');
        setTimeout(() => router.replace('/(business)/'), 500);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to create event.', 'error');
      } finally {
        setLoading(false);
      }
    }
  }

  const selectedTemplate = categoryOptions.find((t) => t.label === form.template);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <Pressable
          onPress={() => phase === 'review' ? setPhase('setup') : (router.canGoBack() ? router.back() : router.replace('/(business)/'))}
          style={[s.backBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name={phase === 'review' ? 'chevron-back' : 'close'} size={22} color="#fff" />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Create Campaign</Text>
          <Text style={s.headerSub}>{phase === 'setup' ? 'Set up your campaign' : 'Review & publish'}</Text>
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
          showsVerticalScrollIndicator={false}>

          {/* ── Phase 1: Setup ── */}
          {phase === 'setup' && (
            <View style={s.content}>

              {/* Event Type Selector */}
              <View style={[s.eventTypeCard, { backgroundColor: C.surface }]}>
                <Text style={[s.eventTypeCardTitle, { color: C.text }]}>🎯 Event Type</Text>
                <Text style={[s.eventTypeCardSub, { color: C.textSecondary }]}>Choose how you want to collaborate with creators</Text>
                <View style={s.eventTypeRow}>
                  <Pressable
                    style={[s.eventTypeOption, { borderColor: form.eventType === 'PAID_CAMPAIGN' ? C.brinjal1 : C.border, backgroundColor: form.eventType === 'PAID_CAMPAIGN' ? C.primaryLight : C.background }]}
                    onPress={() => { if (form.eventType !== 'PAID_CAMPAIGN') resetFormForType('PAID_CAMPAIGN'); }}>
                    <View style={[s.etRadioOuter, { borderColor: form.eventType === 'PAID_CAMPAIGN' ? C.brinjal1 : C.border }]}>
                      {form.eventType === 'PAID_CAMPAIGN' && <View style={[s.etRadioInner, { backgroundColor: C.brinjal1 }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.etOptionLabel, { color: form.eventType === 'PAID_CAMPAIGN' ? C.brinjal1 : C.text }]}>💰 Paid Campaign</Text>
                      <Text style={[s.etOptionSub, { color: C.textSecondary }]}>Creators are paid for content</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={[s.eventTypeOption, { borderColor: form.eventType === 'OPEN_EVENT' ? C.brinjal1 : C.border, backgroundColor: form.eventType === 'OPEN_EVENT' ? C.primaryLight : C.background }]}
                    onPress={() => { if (form.eventType !== 'OPEN_EVENT') resetFormForType('OPEN_EVENT'); }}>
                    <View style={[s.etRadioOuter, { borderColor: form.eventType === 'OPEN_EVENT' ? C.brinjal1 : C.border }]}>
                      {form.eventType === 'OPEN_EVENT' && <View style={[s.etRadioInner, { backgroundColor: C.brinjal1 }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.etOptionLabel, { color: form.eventType === 'OPEN_EVENT' ? C.brinjal1 : C.text }]}>🎪 Open Creator Event</Text>
                      <Text style={[s.etOptionSub, { color: C.textSecondary }]}>Invite creators to attend an event</Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Paid Campaign form */}
              {form.eventType === 'PAID_CAMPAIGN' && (
                <>
                  {/* Template */}
                  <SectionCard title="📂 Campaign Category" sub="Choose the category that best matches your campaign." colors={C}>
                    <DropdownPicker
                      value={form.template}
                      onChange={(v) => {
                        const preset = TEMPLATE_PRESETS[v];
                        setForm((prev) => ({
                          ...prev,
                          template: v,
                          ...(preset ? {
                            goals:        preset.goals,
                            budget:       preset.budget,
                            deliverables: preset.deliverables,
                          } : {}),
                        }));
                        if (setupErrors.template) setSetupErrors((e) => ({ ...e, template: undefined }));
                        if (setupErrors.goals)    setSetupErrors((e) => ({ ...e, goals: undefined }));
                        if (setupErrors.budget)   setSetupErrors((e) => ({ ...e, budget: undefined }));
                      }}
                      options={categoryOptions}
                      placeholder="Select a category…"
                      colors={C}
                      error={setupErrors.template}
                    />
                  </SectionCard>

                  {/* Goals */}
                  <SectionCard title="🎯 Campaign Goals" sub="Select what you want to achieve with this campaign." colors={C}>
                    <MultiCheckboxDropdown
                      values={form.goals}
                      onChange={(v) => {
                        update('goals', v);
                        if (setupErrors.goals) setSetupErrors((e) => ({ ...e, goals: undefined }));
                      }}
                      options={GOALS}
                      placeholder="Select campaign goals…"
                      colors={C}
                      error={setupErrors.goals}
                    />
                  </SectionCard>

                  {/* Budget */}
                  <SectionCard title="💰 Budget" sub="How much are you willing to invest per creator?" colors={C}>
                    <RadioGroup
                      value={form.budget}
                      onChange={(v) => {
                        update('budget', v);
                        if (setupErrors.budget) setSetupErrors((e) => ({ ...e, budget: undefined }));
                      }}
                      options={BUDGETS}
                      colors={C}
                      error={setupErrors.budget}
                    />
                  </SectionCard>

                  {/* Location */}
                  <SectionCard title="📍 Location" sub='Where should creators be based? Type "Remote" for online.' colors={C}>
                    <PlacesInput value={form.location} onChange={(v) => update('location', v)} colors={C} />
                  </SectionCard>

                  {/* Generate button */}
                  <Pressable
                    style={({ pressed }) => [s.generateBtn, { backgroundColor: C.brinjal1, opacity: pressed ? 0.88 : 1 }]}
                    onPress={handleGenerate}>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <Text style={s.generateBtnText}>Generate Campaign</Text>
                  </Pressable>
                </>
              )}

              {/* Open Event form */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Category — same template picker as paid campaign */}
                  <SectionCard title="📂 Event Category" sub="Choose the category that best matches your event." colors={C}>
                    <DropdownPicker
                      value={form.template}
                      onChange={(v) => {
                        update('template', v);
                        if (eventErrors.template) setEventErrors((e) => ({ ...e, template: undefined }));
                      }}
                      options={categoryOptions}
                      placeholder="Select a category…"
                      colors={C}
                      error={eventErrors.template}
                    />
                  </SectionCard>

                  {/* Venue / Location */}
                  <SectionCard title="📍 Venue / Location" sub="Where is the event taking place? (auto-filled from your business profile)" colors={C}>
                    <PlacesInput
                      value={form.venue}
                      onChange={(v) => { update('venue', v); if (eventErrors.venue) setEventErrors((e) => ({ ...e, venue: undefined })); }}
                      colors={C}
                      error={eventErrors.venue}
                    />
                  </SectionCard>

                  {/* Capacity */}
                  <SectionCard title="👥 Creator Capacity" sub="Maximum number of creators who can attend." colors={C}>
                    <Stepper value={form.capacity} onChange={(v) => update('capacity', v)} min={1} max={500} colors={C} />
                    {eventErrors.capacity && <Text style={s.errorText}>{eventErrors.capacity}</Text>}
                  </SectionCard>

                  {/* Continue hint */}
                  <View style={[s.eventHintBox, { backgroundColor: C.primaryLight }]}>
                    <Ionicons name="sparkles" size={16} color={C.brinjal1} />
                    <Text style={[s.eventHintText, { color: C.brinjal1 }]}>
                      Event title, description, date and creator benefits will be auto-generated on the next page based on your selected category.
                    </Text>
                  </View>

                  {/* Continue button */}
                  <Pressable
                    style={({ pressed }) => [s.generateBtn, { backgroundColor: C.brinjal1, opacity: pressed ? 0.88 : 1 }]}
                    onPress={handleContinueEvent}>
                    <Ionicons name="sparkles" size={20} color="#fff" />
                    <Text style={s.generateBtnText}>Generate & Continue</Text>
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
                  {/* Generated notice */}
                  <View style={[s.generatedBanner, { backgroundColor: C.primaryLight }]}>
                    <Ionicons name="sparkles" size={20} color={C.brinjal1} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.generatedTitle, { color: C.brinjal1 }]}>Campaign Generated</Text>
                      <Text style={[s.generatedSub, { color: C.brinjal1 }]}>Review and edit before publishing. All fields are editable.</Text>
                    </View>
                  </View>

                  {/* Editable title */}
                  <SectionCard title="📣 Campaign Title" colors={C}>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: reviewErrors.title ? ERROR_RED : C.border, color: C.text }]}
                      value={form.title}
                      onChangeText={(v) => {
                        update('title', v);
                        if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined }));
                      }}
                      placeholder="Campaign title…"
                      placeholderTextColor={C.textSecondary}
                    />
                    {reviewErrors.title && <Text style={s.errorText}>{reviewErrors.title}</Text>}
                  </SectionCard>

                  {/* Editable description */}
                  <SectionCard title="📝 Description" colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder="Describe your campaign…"
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Platform */}
                  <SectionCard title="📱 Platform" sub="Where should creators post their content?" colors={C}>
                    <ChipGroup
                      options={platformOptions}
                      value={form.platform}
                      onChange={(v) => {
                        update('platform', v);
                        if (reviewErrors.platform) setReviewErrors((e) => ({ ...e, platform: undefined }));
                      }}
                      colors={C}
                      error={reviewErrors.platform}
                    />
                  </SectionCard>

                  {/* Deliverables */}
                  <SectionCard title="📦 Deliverables" sub="Set quantity to 0 to exclude." colors={C}>
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
                              {item.label}
                            </Text>
                            <View style={[dlv.counter, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: C.background }]}>
                              <Pressable
                                style={dlv.counterBtn}
                                onPress={() => update('deliverables', { ...form.deliverables, [item.key]: Math.max(0, count - 1) })}>
                                <Text style={[dlv.counterBtnTxt, { color: count <= 0 ? C.border : C.brinjal1 }]}>−</Text>
                              </Pressable>
                              <Text style={[dlv.counterVal, { color: active ? C.brinjal1 : C.textSecondary }]}>{count}</Text>
                              <Pressable
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

                  {/* Deadline */}
                  <SectionCard title="📅 Application Deadline" sub="Last date creators can apply." colors={C}>
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
                  <SectionCard title="👥 Creators Needed" sub="How many creators do you need for this campaign?" colors={C}>
                    <Stepper value={form.creatorsNeeded} onChange={(v) => update('creatorsNeeded', v)} colors={C} />
                  </SectionCard>

                  {/* Summary */}
                  <SectionCard title="📋 Summary" colors={C}>
                    {[
                      { label: 'Category', value: selectedTemplate ? `${selectedTemplate.emoji} ${form.template}` : '—' },
                      { label: 'Goals',    value: form.goals.join(', ') || '—' },
                      { label: 'Budget',   value: form.budget || '—' },
                      { label: 'Location', value: form.location || 'Remote' },
                    ].map(({ label, value }, i, arr) => (
                      <View key={label} style={[s.summaryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <Text style={[s.summaryLabel, { color: C.textSecondary }]}>{label}</Text>
                        <Text style={[s.summaryValue, { color: C.text }]} numberOfLines={2}>{value}</Text>
                      </View>
                    ))}
                  </SectionCard>

                  {/* Featured toggle */}
                  <Pressable
                    style={[s.featuredToggle, { backgroundColor: form.isFeatured ? '#FFF8E8' : C.surface, borderColor: form.isFeatured ? '#F59E0B' : C.border }]}
                    onPress={() => update('isFeatured', !form.isFeatured)}>
                    <View style={s.featuredLeft}>
                      <Text style={s.featuredEmoji}>⭐</Text>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[s.featuredLabel, { color: C.text }]}>Feature this Campaign</Text>
                        <Text style={[s.featuredSub, { color: C.textSecondary }]}>Appears highlighted on creator home</Text>
                      </View>
                    </View>
                    <View style={[s.toggle, { backgroundColor: form.isFeatured ? '#F59E0B' : C.border }]}>
                      <View style={[s.toggleThumb, { left: form.isFeatured ? 20 : 2 }]} />
                    </View>
                  </Pressable>

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable
                      style={[s.editBtn, { borderColor: C.brinjal1 }]}
                      onPress={() => setPhase('setup')}>
                      <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>Edit Inputs</Text>
                    </Pressable>
                    <Pressable
                      style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                      onPress={handlePublish}
                      disabled={loading}>
                      <Text style={s.publishBtnText}>{loading ? 'Publishing…' : '🚀 Publish Campaign'}</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {/* Open Event review */}
              {form.eventType === 'OPEN_EVENT' && (
                <>
                  {/* Auto-generated banner */}
                  <View style={[s.generatedBanner, { backgroundColor: C.primaryLight }]}>
                    <Ionicons name="sparkles" size={20} color={C.brinjal1} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.generatedTitle, { color: C.brinjal1 }]}>Event Details Auto-Generated</Text>
                      <Text style={[s.generatedSub, { color: C.brinjal1 }]}>Review and edit anything before publishing.</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <SectionCard title="🎪 Event Title" sub="Edit or personalise the auto-generated title." colors={C}>
                    <TextInput
                      style={[s.input, { backgroundColor: C.background, borderColor: reviewErrors.title ? ERROR_RED : C.border, color: C.text }]}
                      value={form.title}
                      onChangeText={(v) => { update('title', v); if (reviewErrors.title) setReviewErrors((e) => ({ ...e, title: undefined })); }}
                      placeholder="Event title…"
                      placeholderTextColor={C.textSecondary}
                    />
                    {reviewErrors.title && <Text style={s.errorText}>{reviewErrors.title}</Text>}
                  </SectionCard>

                  {/* Description */}
                  <SectionCard title="📝 Event Description" sub="Edit or personalise the auto-generated description." colors={C}>
                    <TextInput
                      style={[s.textarea, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                      value={form.description}
                      onChangeText={(v) => update('description', v)}
                      placeholder="Event description…"
                      placeholderTextColor={C.textSecondary}
                      multiline
                      numberOfLines={6}
                    />
                  </SectionCard>

                  {/* Creator Benefits — auto-selected, editable */}
                  <SectionCard title="🎁 Creator Benefits" sub="Auto-selected based on your category. Tick or untick as needed." colors={C}>
                    {BENEFITS.map((benefit) => {
                      const checked = form.benefits.includes(benefit);
                      return (
                        <Pressable
                          key={benefit}
                          style={[s.benefitRow, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.primaryLight : C.background }]}
                          onPress={() => {
                            const next = checked
                              ? form.benefits.filter((b) => b !== benefit)
                              : [...form.benefits, benefit];
                            update('benefits', next);
                          }}>
                          <View style={[s.benefitCheck, { borderColor: checked ? C.brinjal1 : C.border, backgroundColor: checked ? C.brinjal1 : 'transparent' }]}>
                            {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                          <Text style={[s.benefitLabel, { color: checked ? C.brinjal1 : C.text }]}>{benefit}</Text>
                        </Pressable>
                      );
                    })}
                  </SectionCard>

                  {/* Platform (optional) */}
                  <SectionCard title="📱 Platform (Optional)" sub="Where should creators post event content?" colors={C}>
                    <ChipGroup
                      options={['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Not required']}
                      value={form.platform || 'Not required'}
                      onChange={(v) => update('platform', v === 'Not required' ? '' : v)}
                      colors={C}
                    />
                  </SectionCard>

                  {/* Event Date */}
                  <SectionCard title="📅 Event Date" sub="Defaulted to one week from today. Registration deadline auto-updates." colors={C}>
                    <DeadlinePicker
                      value={form.eventDate}
                      onChange={(d) => {
                        const twoDaysBefore = d ? dayStart(new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000)) : null;
                        setForm((prev) => ({ ...prev, eventDate: d, deadline: twoDaysBefore }));
                        if (reviewErrors.eventDate) setReviewErrors((e) => ({ ...e, eventDate: undefined, deadline: undefined }));
                      }}
                      error={reviewErrors.eventDate}
                      colors={C}
                      label="Event Date"
                    />
                  </SectionCard>

                  {/* Registration Deadline — auto-set to eventDate - 2 days */}
                  <SectionCard title="📅 Registration Deadline" sub="Auto-set to 2 days before event. You can adjust if needed." colors={C}>
                    <DeadlinePicker
                      value={form.deadline}
                      onChange={(d) => {
                        update('deadline', d);
                        if (reviewErrors.deadline) setReviewErrors((e) => ({ ...e, deadline: undefined }));
                      }}
                      error={reviewErrors.deadline}
                      colors={C}
                      label="Registration Deadline"
                    />
                  </SectionCard>

                  {/* Event summary */}
                  <SectionCard title="📋 Event Summary" colors={C}>
                    {[
                      { label: 'Category', value: form.template || '—' },
                      { label: 'Venue',    value: form.venue || 'TBD' },
                      { label: 'Date',     value: form.eventDate ? fmtDate(form.eventDate) : '—' },
                      { label: 'Capacity', value: `${form.capacity} creators` },
                    ].map(({ label, value }, i, arr) => (
                      <View key={label} style={[s.summaryRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                        <Text style={[s.summaryLabel, { color: C.textSecondary }]}>{label}</Text>
                        <Text style={[s.summaryValue, { color: C.text }]} numberOfLines={2}>{value}</Text>
                      </View>
                    ))}
                  </SectionCard>

                  {/* Featured toggle */}
                  <Pressable
                    style={[s.featuredToggle, { backgroundColor: form.isFeatured ? '#FFF8E8' : C.surface, borderColor: form.isFeatured ? '#F59E0B' : C.border }]}
                    onPress={() => update('isFeatured', !form.isFeatured)}>
                    <View style={s.featuredLeft}>
                      <Text style={s.featuredEmoji}>⭐</Text>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[s.featuredLabel, { color: C.text }]}>Feature this Event</Text>
                        <Text style={[s.featuredSub, { color: C.textSecondary }]}>Appears highlighted on creator home</Text>
                      </View>
                    </View>
                    <View style={[s.toggle, { backgroundColor: form.isFeatured ? '#F59E0B' : C.border }]}>
                      <View style={[s.toggleThumb, { left: form.isFeatured ? 20 : 2 }]} />
                    </View>
                  </Pressable>

                  {/* Actions */}
                  <View style={s.reviewActions}>
                    <Pressable style={[s.editBtn, { borderColor: C.brinjal1 }]} onPress={() => setPhase('setup')}>
                      <Ionicons name="chevron-back" size={16} color={C.brinjal1} />
                      <Text style={[s.editBtnText, { color: C.brinjal1 }]}>Edit Event</Text>
                    </Pressable>
                    <Pressable
                      style={[s.publishBtn, { backgroundColor: loading ? C.border : C.brinjal1 }]}
                      onPress={handlePublish}
                      disabled={loading}>
                      <Text style={s.publishBtnText}>{loading ? 'Publishing…' : '🎪 Publish Event'}</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[s.toast, { opacity: toastOpacity, backgroundColor: toast.type === 'success' ? '#22C55E' : '#EF4444' }]}
          pointerEvents="none">
          <Text style={s.toastText}>{toast.type === 'success' ? '✓  ' : '✕  '}{toast.message}</Text>
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
  headerTitle:  { fontSize: 16, fontWeight: '800', fontFamily: F.extrabold, color: '#fff' },
  headerSub:    { fontSize: 11, marginTop: 1, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)' },
  phasePill:    { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  phasePillText:{ fontSize: 12, fontWeight: '700', fontFamily: F.bold, color: '#fff' },

  progressTrack:{ height: 3 },
  progressFill: { height: 3 },

  scroll:   { padding: 20, paddingBottom: 48 },
  content:  { gap: 16 },

  input:     { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  textarea:  { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 120, textAlignVertical: 'top', fontFamily: F.regular },
  errorText: { fontSize: 12, color: ERROR_RED, fontFamily: F.regular },

  generateBtn:     { borderRadius: 14, height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 8, shadowColor: '#6C3DE0', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: F.extrabold },

  generatedBanner:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, padding: 14 },
  generatedTitle:   { fontSize: 14, fontWeight: '700', fontFamily: F.bold, marginBottom: 2 },
  generatedSub:     { fontSize: 12, lineHeight: 17, fontFamily: F.regular },

  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  summaryLabel: { fontSize: 13, fontFamily: F.regular, width: 72 },
  summaryValue: { flex: 1, fontSize: 13, fontWeight: '600', fontFamily: F.semibold, textAlign: 'right' },

  featuredToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, borderWidth: 1.5 },
  featuredLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  featuredEmoji:  { fontSize: 24 },
  featuredLabel:  { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  featuredSub:    { fontSize: 12, lineHeight: 17, fontFamily: F.regular },
  toggle:         { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb:    { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 3 },

  reviewActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 14, height: 52, borderWidth: 1.5 },
  editBtnText:   { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  publishBtn:    { flex: 2, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowColor: '#6C3DE0', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  publishBtnText:{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: F.extrabold },

  toast:     { position: 'absolute', bottom: 40, left: 20, right: 20, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, fontFamily: F.bold },

  eventTypeCard:      { borderRadius: 16, padding: 18, gap: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  eventTypeCardTitle: { fontSize: 15, fontWeight: '800', fontFamily: F.extrabold },
  eventTypeCardSub:   { fontSize: 12, lineHeight: 18, marginTop: -6, fontFamily: F.regular },
  eventTypeRow:       { gap: 10 },
  eventTypeOption:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  etRadioOuter:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  etRadioInner:       { width: 10, height: 10, borderRadius: 5 },
  etOptionLabel:      { fontSize: 14, fontFamily: F.bold },
  etOptionSub:        { fontSize: 11, fontFamily: F.regular, marginTop: 2 },

  eventHintBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14 },
  eventHintText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: F.regular },

  benefitRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 8 },
  benefitCheck:  { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  benefitLabel:  { flex: 1, fontSize: 14, fontFamily: F.medium },
});

const dlv = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  bullet:     { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  label:      { flex: 1, fontSize: 14 },
  counter:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, overflow: 'hidden' },
  counterBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  counterBtnTxt: { fontSize: 20, lineHeight: 24, fontWeight: '300' },
  counterVal: { width: 28, textAlign: 'center', fontSize: 14, fontWeight: '700', fontFamily: F.bold },
});
