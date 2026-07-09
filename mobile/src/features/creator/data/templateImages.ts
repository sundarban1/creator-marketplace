export const TEMPLATE_IMAGES: Record<string, string> = {
  // New template names
  'Restaurant Promotion':          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
  'Café Promotion':                'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',
  'Street Food / Local Food':      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
  'Hotel & Resort':                'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  'Travel & Tourism':              'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
  'Fashion & Clothing Brand':      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'Beauty Salon & Spa':            'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
  'Gym & Fitness':                 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  'Tech / Gadget Promotion':       'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
  'Event Promotion':               'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  'New Business Opening':          'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
  'Product Launch':                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  'Education / Course':            'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
  'Real Estate Promotion':         'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80',
  'Retail Shop Promotion':         'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=400&q=80',
  'Discount / Offer Event':        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80',
  'Festival Event':                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
  'Food Delivery / Cloud Kitchen': 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&q=80',

  // Legacy "Promote X" category values (from current seeder)
  'Promote Restaurant':         'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
  'Promote Cafe':               'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',
  'Promote Hotel':              'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  'Promote Clothing Brand':     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'Promote Product':            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
  'Promote Event':              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  'Promote Business Opening':   'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',

  // Generic category fallbacks
  Food:           'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  Restaurant:     'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
  Cafe:           'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',
  Travel:         'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
  Fashion:        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  Beauty:         'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
  Skincare:       'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80',
  Fitness:        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  Technology:     'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
  Electronics:    'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
  Events:         'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  Entertainment:  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80',
  Hotel:          'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  Hospitality:    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
  Clothing:       'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  Coffee:         'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',

  // Creator category picker (matches admin-defined Category names)
  Gaming:              'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&q=80',
  Tech:                'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80',
  Education:           'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80',
  Lifestyle:           'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&q=80',
  'Home & Living':     'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80',
  Wellness:            'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80',
  Music:               'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
  'Art & Design':      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&q=80',
  Pets:                'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&q=80',
  Parenting:           'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=400&q=80',
  Automotive:          'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&q=80',
  Finance:             'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
  Sustainability:      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80',
  Photography:         'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
  Sports:              'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&q=80',
  'Film & TV':         'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80',
  Mindfulness:         'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
  'Food & Drink':      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80',
};

// Generic fallback for categories with no specific entry above — always a real
// photo, never a blank/icon placeholder.
export const DEFAULT_TEMPLATE_IMAGE = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80';

export function getTemplateImage(template?: string | null, category?: string | null): string | undefined {
  if (template && TEMPLATE_IMAGES[template]) return TEMPLATE_IMAGES[template];
  if (category && TEMPLATE_IMAGES[category]) return TEMPLATE_IMAGES[category];
  return undefined;
}
