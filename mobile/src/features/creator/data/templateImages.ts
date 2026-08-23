// Feature-image resolution for campaigns and events.
//
// Every campaign/event card, the campaign-detail hero and the create-campaign
// preview fall back to a stock photo when the business hasn't uploaded its own
// feature image. Picking that photo well matters most on the AI-draft path:
// the brand describes an event in one sentence, and the very next screen shows
// them a finished-looking draft — a missing or unrelated hero photo is the
// first thing they notice.
//
// Resolution is keyword-first, category-second (see resolveFeatureImage) —
// the industry category describes the *business*, the title describes the
// *event*, and it's the event we're illustrating.

// ─── Photos ───────────────────────────────────────────────────────────────────
// Named once and aliased below, so the many category names/keys that share a
// photo can't drift apart. Every URL here has been loaded and eyeballed — do
// the same before adding one; a 200 alone doesn't tell you what's in the frame.

const IMG = {
  restaurant:    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
  cafe:          'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',
  streetFood:    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
  food:          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  foodDrink:     'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
  foodDelivery:  'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&q=80',
  hotel:         'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  travel:        'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
  trekking:      'https://images.unsplash.com/photo-1518002054494-3a6f94352e9d?w=400&q=80',
  fashion:       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  footwear:      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&q=80',
  jewellery:     'https://images.unsplash.com/photo-1650389236412-e7413cbcf2fe?w=400&q=80',
  beauty:        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
  skincare:      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80',
  fitness:       'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  wellness:      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  mindfulness:   'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
  technology:    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
  gaming:        'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80',
  events:        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  festival:      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
  music:         'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
  opening:       'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
  productLaunch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  discount:      'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
  retail:        'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=400&q=80',
  education:     'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
  realEstate:    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80',
  finance:       'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
  healthcare:    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=400&q=80',
  homeLiving:    'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80',
  mediaFilm:     'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80',
  photography:   'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
  artDesign:     'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80',
  ngo:           'https://images.unsplash.com/photo-1560220604-1985ebfe28b1?w=400&q=80',
  government:    'https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?w=400&q=80',
  professional:  'https://images.unsplash.com/photo-1573164574572-cb89e39749b4?w=400&q=80',
  agriculture:   'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&q=80',
  construction:  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&q=80',
  sustainability:'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80',
  sports:        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80',
  automotive:    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&q=80',
  pets:          'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&q=80',
  parenting:     'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=400&q=80',
  lifestyle:     'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&q=80',
} as const;

export const TEMPLATE_IMAGES: Record<string, string> = {
  // ── Live industry categories (BOTH scope) ──────────────────────────────────
  // Both the display name and the `key` slug are listed, because campaign cards
  // look up `categoryKey ?? category` while the AI draft carries the name. Keep
  // this block in sync with INDUSTRY_CATEGORIES in backend/prisma/seeds/categories.ts;
  // anything missing here silently degrades to DEFAULT_TEMPLATE_IMAGE.
  'Restaurants':                  IMG.restaurant,      'restaurants':               IMG.restaurant,
  'Cafés':                        IMG.cafe,            'cafes':                     IMG.cafe,
  'Hotels':                       IMG.hotel,           'hotels':                    IMG.hotel,
  'Resorts':                      IMG.hotel,           'resorts':                   IMG.hotel,
  'Travel & Tourism':             IMG.travel,          'travel-tourism':            IMG.travel,
  'Trekking & Adventure':         IMG.trekking,        'trekking-adventure':        IMG.trekking,
  'Fashion & Clothing':           IMG.fashion,         'fashion-clothing':          IMG.fashion,
  'Footwear':                     IMG.footwear,        'footwear':                  IMG.footwear,
  'Beauty & Cosmetics':           IMG.beauty,          'beauty-cosmetics':          IMG.beauty,
  'Skincare & Personal Care':     IMG.skincare,        'skincare-personal-care':    IMG.skincare,
  'Jewellery & Accessories':      IMG.jewellery,       'jewellery-accessories':     IMG.jewellery,
  'Retail & Shopping':            IMG.retail,          'retail-shopping':           IMG.retail,
  'E-commerce':                   IMG.retail,          'ecommerce':                 IMG.retail,
  'Food & Beverage Brands':       IMG.foodDrink,       'food-beverage-brands':      IMG.foodDrink,
  'Events & Entertainment':       IMG.events,          'events-entertainment':      IMG.events,
  'Fitness & Wellness':           IMG.fitness,         'fitness-wellness':          IMG.fitness,
  'Education & Training':         IMG.education,       'education-training':        IMG.education,
  'Electronics & Mobile':         IMG.technology,      'electronics-mobile':        IMG.technology,
  'Technology & Software':        IMG.technology,      'technology-software':       IMG.technology,
  'Automotive':                   IMG.automotive,      'automotive':                IMG.automotive,
  'Real Estate & Property':       IMG.realEstate,      'real-estate-property':      IMG.realEstate,
  'Banking & FinTech':            IMG.finance,         'banking-fintech':           IMG.finance,
  'Internet & Telecom':           IMG.technology,      'internet-telecom':          IMG.technology,
  'Healthcare & Medical':         IMG.healthcare,      'healthcare-medical':        IMG.healthcare,
  'Home & Furniture':             IMG.homeLiving,      'home-furniture':            IMG.homeLiving,
  'Media & Production':           IMG.mediaFilm,       'media-production':          IMG.mediaFilm,
  'NGO & Development':            IMG.ngo,             'ngo-development':           IMG.ngo,
  'Government & Public Sector':   IMG.government,      'government-public':         IMG.government,
  'Professional Services':        IMG.professional,    'professional-services':     IMG.professional,
  'Sports & Recreation':          IMG.sports,          'sports-recreation':         IMG.sports,
  'Agriculture':                  IMG.agriculture,     'agriculture':               IMG.agriculture,
  'Construction & Engineering':   IMG.construction,    'construction-engineering':  IMG.construction,
  'Lifestyle':                    IMG.lifestyle,       'lifestyle':                 IMG.lifestyle,
  // 'Other' / 'other-industry' deliberately absent — nothing illustrates it
  // honestly, so it takes DEFAULT_TEMPLATE_IMAGE like any unknown value.

  // ── Quick-template names shown on the create-campaign setup screen ─────────
  'Restaurant Promotion':          IMG.restaurant,
  'Café Promotion':                IMG.cafe,
  'Street Food / Local Food':      IMG.streetFood,
  'Hotel & Resort':                IMG.hotel,
  'Beauty Salon & Spa':            IMG.beauty,
  'Gym & Fitness':                 IMG.fitness,
  'Tech / Gadget Promotion':       IMG.technology,
  'Event Promotion':               IMG.events,
  'New Business Opening':          IMG.opening,
  'Product Launch':                IMG.productLaunch,
  'Education / Course':            IMG.education,
  'Real Estate Promotion':         IMG.realEstate,
  'Retail Shop Promotion':         IMG.retail,
  'Discount / Offer Event':        IMG.discount,
  'Festival Event':                IMG.festival,
  'Food Delivery / Cloud Kitchen': IMG.foodDelivery,
  'Fashion & Clothing Brand':      IMG.fashion,

  // ── Legacy "Promote X" category values (older seeded campaigns) ────────────
  'Promote Restaurant':       IMG.restaurant,
  'Promote Cafe':             IMG.cafe,
  'Promote Hotel':            IMG.hotel,
  'Promote Clothing Brand':   IMG.fashion,
  'Promote Product':          IMG.productLaunch,
  'Promote Event':            IMG.events,
  'Promote Business Opening': IMG.opening,

  // ── Creator-side category names (matches admin-defined Category rows) ──────
  Food:                IMG.food,
  Restaurant:          IMG.restaurant,
  Cafe:                IMG.cafe,
  Coffee:              IMG.cafe,
  Travel:              IMG.travel,
  Fashion:             IMG.fashion,
  Clothing:            IMG.fashion,
  Beauty:              IMG.beauty,
  Skincare:            IMG.skincare,
  Fitness:             IMG.fitness,
  Technology:          IMG.technology,
  Tech:                IMG.technology,
  Electronics:         IMG.technology,
  Events:              IMG.events,
  Entertainment:       IMG.events,
  Hotel:               IMG.hotel,
  Hospitality:         IMG.hotel,
  Gaming:              IMG.gaming,
  Education:           IMG.education,
  'Home & Living':     IMG.homeLiving,
  Wellness:            IMG.wellness,
  Music:               IMG.music,
  'Art & Design':      IMG.artDesign,
  Pets:                IMG.pets,
  Parenting:           IMG.parenting,
  Finance:             IMG.finance,
  Sustainability:      IMG.sustainability,
  Photography:         IMG.photography,
  Sports:              IMG.sports,
  'Film & TV':         IMG.mediaFilm,
  Mindfulness:         IMG.mindfulness,
  'Food & Drink':      IMG.foodDrink,
};

// Generic fallback for categories with no specific entry above — always a real
// photo, never a blank/icon placeholder.
export const DEFAULT_TEMPLATE_IMAGE = IMG.events;

// ─── Text matching ────────────────────────────────────────────────────────────

// Diacritics are folded by hand rather than via String.normalize('NFD') so this
// behaves identically on Hermes, and so 'Cafés' matches the 'cafes' key.
const FOLD: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ñ: 'n', ç: 'c',
};

// 'Café Promotion' / 'cafe-promotion' / 'CAFÉ  PROMOTION' all collapse to the
// same string, so an admin renaming a category by punctuation alone can't drop
// its photo.
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[áàâäãåéèêëíìîïóòôöõúùûüñç]/g, (c) => FOLD[c] ?? c)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Built once from TEMPLATE_IMAGES so every entry above is reachable by its
// normalized form too. First writer wins, matching the map's own ordering.
const NORMALIZED_IMAGES: Record<string, string> = {};
for (const [name, url] of Object.entries(TEMPLATE_IMAGES)) {
  const key = normalize(name);
  if (key && !NORMALIZED_IMAGES[key]) NORMALIZED_IMAGES[key] = url;
}

// Words the brand actually uses when describing an event, mapped to a photo.
// Ordered specific → generic: the first rule with a hit wins, so 'holi' beats
// 'festival' and 'sneaker' beats 'shop'. `words` match whole tokens only (so
// 'camp' never matches "campaign"); `phrases` match as substrings.
const KEYWORD_IMAGES: { words?: string[]; phrases?: string[]; image: string }[] = [
  { words: ['holi', 'tihar', 'dashain', 'teej', 'losar', 'jatra', 'mela', 'festival', 'fest'], image: IMG.festival },
  { words: ['trek', 'trekking', 'hike', 'hiking', 'himal', 'everest', 'annapurna', 'mustang', 'rafting', 'paragliding', 'camping', 'trail', 'summit'], phrases: ['base camp'], image: IMG.trekking },
  { words: ['momo', 'thakali', 'newari', 'sekuwa', 'khaja', 'buffet', 'brunch', 'iftar', 'barbecue', 'bbq', 'menu', 'tasting', 'chef', 'dining', 'restaurant', 'kitchen', 'cuisine'], phrases: ['dal bhat', 'food festival'], image: IMG.restaurant },
  { words: ['coffee', 'cafe', 'espresso', 'latte', 'chiya', 'barista', 'bakery', 'dessert'], image: IMG.cafe },
  { words: ['concert', 'gig', 'dj', 'band', 'singer', 'musician', 'jam'], phrases: ['live music', 'music night'], image: IMG.music },
  { words: ['sneaker', 'sneakers', 'shoe', 'shoes', 'footwear', 'sandal', 'sandals'], image: IMG.footwear },
  { words: ['jewellery', 'jewelry', 'ornament', 'ornaments', 'gold', 'silver', 'necklace', 'earrings'], image: IMG.jewellery },
  { words: ['fashion', 'outfit', 'outfits', 'apparel', 'clothing', 'boutique', 'runway', 'lookbook', 'styling'], phrases: ['fashion show'], image: IMG.fashion },
  { words: ['makeup', 'salon', 'spa', 'facial', 'manicure', 'bridal', 'cosmetics', 'skincare', 'haircut'], image: IMG.beauty },
  { words: ['gym', 'workout', 'fitness', 'zumba', 'marathon', 'crossfit', 'aerobics'], phrases: ['fitness challenge'], image: IMG.fitness },
  { words: ['yoga', 'meditation', 'mindfulness', 'retreat'], image: IMG.wellness },
  { words: ['hotel', 'resort', 'staycation', 'suite', 'checkin', 'homestay', 'lodge'], image: IMG.hotel },
  { words: ['tour', 'trip', 'getaway', 'holiday', 'itinerary', 'sightseeing', 'travel'], image: IMG.travel },
  { words: ['unboxing', 'gadget', 'smartphone', 'laptop', 'app', 'software', 'startup', 'hackathon', 'ai'], phrases: ['tech meetup'], image: IMG.technology },
  { words: ['esports', 'gaming', 'lan'], phrases: ['gaming tournament'], image: IMG.gaming },
  { words: ['photowalk', 'photoshoot', 'photography'], image: IMG.photography },
  { words: ['screening', 'premiere', 'film', 'movie', 'documentary'], image: IMG.mediaFilm },
  { words: ['exhibition', 'gallery', 'painting', 'artwork', 'craft', 'handicraft'], phrases: ['art exhibition'], image: IMG.artDesign },
  { words: ['workshop', 'seminar', 'webinar', 'training', 'bootcamp', 'course', 'class', 'masterclass', 'scholarship', 'college', 'school'], image: IMG.education },
  { words: ['clinic', 'hospital', 'doctor', 'medical', 'checkup', 'dental', 'vaccination'], phrases: ['health camp', 'blood donation'], image: IMG.healthcare },
  { words: ['volunteer', 'volunteers', 'ngo', 'charity', 'donation', 'fundraiser', 'awareness', 'cleanup', 'plantation'], image: IMG.ngo },
  { words: ['farm', 'farming', 'agriculture', 'harvest', 'organic', 'nursery'], image: IMG.agriculture },
  { words: ['construction', 'engineering', 'infrastructure'], image: IMG.construction },
  { words: ['apartment', 'property', 'housing', 'plotting'], phrases: ['real estate', 'site visit', 'open house'], image: IMG.realEstate },
  { words: ['bank', 'banking', 'loan', 'insurance', 'fintech', 'wallet', 'remittance'], image: IMG.finance },
  { words: ['car', 'bike', 'scooter', 'automobile', 'showroom'], phrases: ['test drive'], image: IMG.automotive },
  { words: ['furniture', 'interior', 'decor', 'renovation'], image: IMG.homeLiving },
  { words: ['pet', 'pets', 'dog', 'dogs', 'cat', 'cats'], image: IMG.pets },
  { words: ['futsal', 'football', 'cricket', 'basketball', 'volleyball', 'match'], image: IMG.sports },
  { words: ['inauguration', 'opening', 'inaugural'], phrases: ['grand opening', 'ribbon cutting'], image: IMG.opening },
  { words: ['launch', 'launching'], phrases: ['product launch', 'new arrival'], image: IMG.productLaunch },
  { words: ['sale', 'discount', 'offer', 'clearance', 'deal', 'deals', 'combo'], image: IMG.discount },
  { words: ['shop', 'store', 'outlet', 'mall'], image: IMG.retail },
  { words: ['meetup', 'conference', 'summit', 'expo', 'networking'], image: IMG.professional },
];

// Tokens are de-pluralised so 'shoes' hits a 'shoe' keyword and vice versa —
// cheaper and more predictable here than a real stemmer.
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of normalize(text).split(' ')) {
    if (!raw) continue;
    tokens.add(raw);
    if (raw.length > 3 && raw.endsWith('s')) tokens.add(raw.slice(0, -1));
    else tokens.add(`${raw}s`);
  }
  return tokens;
}

function matchKeywords(text?: string | null): string | undefined {
  if (!text || !text.trim()) return undefined;
  const normalized = normalize(text);
  const tokens = tokenize(text);
  for (const rule of KEYWORD_IMAGES) {
    if (rule.words?.some((w) => tokens.has(w))) return rule.image;
    if (rule.phrases?.some((p) => normalized.includes(p))) return rule.image;
  }
  return undefined;
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

// Category/template lookup only — returns undefined on a miss so callers that
// want to render nothing (rather than a stock photo) still can. Callers that
// always need a photo should use resolveFeatureImage.
export function getTemplateImage(template?: string | null, category?: string | null): string | undefined {
  for (const value of [template, category]) {
    if (!value) continue;
    const exact = TEMPLATE_IMAGES[value];
    if (exact) return exact;
    const fuzzy = NORMALIZED_IMAGES[normalize(value)];
    if (fuzzy) return fuzzy;
  }
  return undefined;
}

// Always returns a photo. Used on the AI-draft path, where the brand is shown a
// finished-looking draft and an empty hero reads as a broken one.
//
// Title before category on purpose: the industry category describes the
// business ("Cafés") while the title describes the event ("Holi Colour Fest"),
// and it's the event the photo illustrates. Description is checked only after
// the category, since it's long enough to trip a keyword the event isn't
// really about.
export function resolveFeatureImage(input: {
  template?: string | null;
  category?: string | null;
  title?: string | null;
  description?: string | null;
}): string {
  return matchKeywords(input.title)
    ?? getTemplateImage(input.template, input.category)
    ?? matchKeywords(input.description)
    ?? DEFAULT_TEMPLATE_IMAGE;
}
