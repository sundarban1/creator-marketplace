export const en = {
  nav: {
    links: {
      showcase: 'Why Kolab',
      audience: 'How It Works',
      journey: 'Campaign Flow',
      // categories: 'Categories', // Categories section commented out on the landing page for now
      // security: 'Security', // Security section commented out on the landing page for now
      collaboration: 'How Creators Connect',
      contact: 'Contact',
    },
    cta: 'Get started',
    toggleMenuAriaLabel: 'Toggle menu',
    languageLabel: 'Language',
    appearanceLabel: 'Appearance',
  },

  hero: {
    eyebrow: 'Kolab — AI-powered collaboration between brands and creators.',
    headlinePrefix: 'Where',
    headlineBrands: 'Brands',
    headlineMiddle: 'Meet',
    headlineCreators: 'Creators',
    headlineSuffix: '',
    // Cycled by a typewriter effect in the two colored headline slots — "Where"
    // and "Meet" stay fixed, these two words type/delete together in sync.
    headlinePairs: [
      { a: 'Brands', b: 'Creators' },
      { a: 'Ideas', b: 'Creativity' },
      { a: 'Brands', b: 'Talent' },
      { a: 'Creators', b: 'Success' },
      { a: 'Creators', b: 'Creators' },
    ],
    sub: 'Kolab connects Nepali brands and creators for paid collaborations — discover opportunities, find the right partners, collaborate, and grow, all in one place.',
    ctaCreator: 'Join as Creator',
    ctaBusiness: 'Hire Creators',
    scrollAriaLabel: 'Scroll to explore',
    scrollLabel: 'Scroll',
  },

  showcase: {
    eyebrow: 'Why Kolab',
    panels: [
      { heading: 'Find the Right Match', sub: 'Discover creators, brands, and collaboration opportunities that actually fit your goals, niche, audience, and budget.' },
      { heading: 'Everything in One Place', sub: 'Discover opportunities, send proposals, communicate, manage campaigns, submit deliverables, and track payments without jumping between platforms.' },
      { heading: 'Real Opportunities, Less Hassle', sub: 'Skip endless DMs and cold outreach. Find genuine collaboration opportunities and connect directly with the right people.' },
      { heading: 'Collaborate with Confidence', sub: 'Keep campaign requirements, communication, deliverables, deadlines, and agreements organized so everyone knows what to expect.' },
      { heading: 'Get Paid Securely', sub: 'Make payments and receive earnings through a transparent process, reducing the stress of chasing payments, scams, or unclear deals.' },
    ],
  },

  trust: {
    eyebrow: 'Trusted by',
    heading: "Nepal's creator economy, by the numbers",
    // fallback is shown only until the real /api/public/landing-stats count loads
    stats: [
      { fallback: 5000, label: 'Creators' },
      { fallback: 300, label: 'Brands' },
      { fallback: 12, label: 'Categories' },
    ],
  },

  journey: {
    eyebrow: 'How a campaign flows',
    heading: 'From acceptance to payout, automatically',
    sub: 'Every campaign on Kolab moves through the same secure, escrow-backed journey — so both sides always know exactly what happens next.',
    liveBadge: 'Live campaign',
    legendCreator: 'Creator',
    legendBrand: 'Brand',
    legendSystem: 'Kolab',
    steps: [
      { title: 'Event created', desc: 'The brand posts a campaign with its budget, goals, and requirements.', role: 'brand' },
      { title: 'Proposal submitted', desc: 'A creator pitches their idea and rate for the campaign.', role: 'creator' },
      { title: 'Proposal accepted', desc: 'The brand accepts the pitch and the collaboration is locked in.', role: 'brand' },
      { title: 'Payment secured', desc: 'Full payment moves into escrow before any work begins — funds are protected for both sides.', role: 'brand' },
      { title: 'Creator notified', desc: "An instant alert lets the creator know it's time to start creating.", role: 'system' },
      { title: 'Work begins', desc: 'The creator starts producing content against the agreed brief.', role: 'creator' },
      { title: 'Deliverables uploaded', desc: 'Finished content is submitted straight from the app for review.', role: 'creator' },
      { title: 'Brand reviews & approves', desc: 'The brand checks the work and approves it, or requests a quick revision.', role: 'brand' },
      { title: 'Payment released', desc: "Escrow releases the funds straight to the creator's account. Done.", role: 'system' },
    ],
  },

  audience: {
    eyebrow: 'Built for both sides',
    heading: 'Whether you create or you hire',
    creator: {
      title: 'For Creators',
      sub: 'Turn your following into income.',
      points: [
        'Connect Instagram, TikTok, YouTube & Facebook',
        'Get discovered by real brands across Nepal',
        'Apply to paid campaigns and open events',
        'Get paid securely via eSewa, Khalti, or Fonepay',
      ],
      cta: 'Join as Creator',
    },
    business: {
      title: 'For Brands',
      sub: 'Find and hire the right creators, fast.',
      points: [
        'Search creators by category, location & budget',
        'Post a campaign or invite creators directly',
        'Track proposals and progress in one dashboard',
        'Pay only when the work is approved',
      ],
      cta: 'Hire Creators',
    },
  },

  categories: {
    eyebrow: 'Every niche, covered',
    heading: 'Creators across every category',
    list: [
      'Fashion', 'Travel', 'Food & Beverage', 'Technology', 'Gaming',
      'Fitness & Health', 'Beauty', 'Lifestyle', 'Music', 'Photography',
      'Education', 'Entertainment',
    ],
  },

  collaboration: {
    eyebrow: 'How creators connect',
    heading: 'Creators discover each other too',
    mapCallouts: [
      'Discover creators who match your interests, niche, and location across Nepal.',
      'Explore creator profiles to find the right fit for your next collaboration.',
      'Send a collaboration request and introduce yourself directly.',
      'Start a conversation and discuss ideas, content, and collaboration opportunities.',
      'Build meaningful creator connections and turn conversations into your next Kolab.',
    ],
    cities: [
      'Biratnagar', 'Dharan', 'Kathmandu', 'Pokhara', 'Nepalgunj', 'Dang',
      'Butwal', 'Itahari', 'Dhankuta', 'Nagarkot', 'Dhulikhel', 'Bhaktapur',
      'Lalitpur', 'Bharatpur', 'Hetauda', 'Damak', 'Birtamod', 'Mechinagar',
      'Janakpur', 'Birgunj', 'Kalaiya', 'Lahan', 'Rajbiraj', 'Gaur',
      'Bhairahawa', 'Ghorahi', 'Tulsipur', 'Taulihawa', 'Kohalpur', 'Dhangadhi',
      'Tikapur', 'Mahendranagar', 'Attariya', 'Surkhet', 'Baglung', 'Beni',
      'Kushma', 'Gorkha', 'Waling', 'Banepa', 'Panauti', 'Bidur',
      'Sindhuli', 'Ilam',
    ],
  },

  partners: {
    eyebrow: 'Partners',
    heading: 'The brands Nepal trusts, on Kolab',
    platformLabel: 'Connect your socials',
    paymentLabel: 'Get paid your way',
  },

  security: {
    eyebrow: 'Security',
    heading: 'Built on trust',
    sub: 'Every account and every payment is protected.',
    points: [
      { title: 'Verified creators', desc: 'Identity confirmed with citizenship document verification.' },
      { title: 'Escrow payments', desc: 'Funds are held safely until the work is approved.' },
      { title: 'ID & contact verification', desc: 'Email, phone, and document checks for every account.' },
      { title: 'Transparent reviews', desc: 'Every collaboration ends with an honest rating.' },
    ],
  },

  stories: {
    eyebrow: 'Success stories',
    heading: 'Loved by creators and brands',
    items: [
      { quote: 'My first paid campaign came within two weeks of joining Kolab.', name: 'Priya Sharma', role: 'Fashion Creator, Kathmandu' },
      { quote: 'We hired three creators for our launch in a single afternoon.', name: 'Himalaya Brew', role: 'Brand' },
      { quote: 'Escrow made it easy to trust a brand I had never worked with.', name: 'Anish Shrestha', role: 'Tech Creator, Pokhara' },
      { quote: 'Filtering by budget and location saved us so much time.', name: 'Dhaka Threads', role: 'Brand' },
      { quote: 'Brands reach out to me now instead of the other way around.', name: 'Suman Gurung', role: 'Fitness Creator, Lalitpur' },
      { quote: 'Two reels filled our tables for a whole month.', name: 'Everest Eats', role: 'Brand' },
      { quote: 'My engagement tripled once brands started sending real products, not just cash.', name: 'Kripa Tamang', role: 'Beauty Creator, Biratnagar' },
      { quote: 'Local creators reached buyers our ads never could.', name: 'Sagarmatha Realty', role: 'Brand' },
      { quote: 'I finally get paid what my content is actually worth.', name: 'Bibek Rai', role: 'Travel Creator, Chitwan' },
      { quote: 'Kolab paid for itself with our very first campaign.', name: 'Thamel Boutique', role: 'Brand' },
    ],
  },

  finalCta: {
    heading: 'Ready to get started?',
    sub: "Join Nepal's creator marketplace today.",
    ctaCreator: 'Join as Creator',
    ctaBusiness: 'Hire Creators',
  },

  footer: {
    tagline: 'Where Brands Meet Creators.',
    privacy: 'Privacy',
    terms: 'Terms',
    support: 'Support',
    contact: 'Contact',
    rights: 'All rights reserved.',
    contactForm: {
      heading: 'Get in touch',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      topicLabel: 'Topic',
      topicPlaceholder: "What's this about?",
      messageLabel: 'Message',
      messagePlaceholder: "What's this about?",
      submitBtn: 'Send message',
      submittingBtn: 'Sending...',
      successTitle: 'Message sent',
      successSub: "We'll get back to you soon.",
      errorGeneric: 'Something went wrong. Please try again.',
      errorNameRequired: 'Please enter your name.',
      errorEmailRequired: 'Please enter your email.',
      errorEmailInvalid: 'Please enter a valid email address.',
      errorTopicRequired: 'Please enter a topic.',
      errorMessageRequired: 'Please enter a message.',
      errorMessageTooShort: 'Message must be at least 10 characters.',
    },
  },

  legalPages: {
    backToHome: '← Back to home',
    lastUpdated: 'Last updated {{date}}',
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms of Service',
    emptyTitle: 'Content coming soon',
    emptyBody: "This page hasn't been published yet. Check back soon.",
    loadError: "Couldn't load this page. Please try again.",
  },

  supportPage: {
    title: 'Support',
    subtitle: 'Answers to common questions, and a direct line to us if you need more.',
    faqHeading: 'Frequently asked questions',
    faqEmpty: "No FAQs published yet — reach out below and we'll help directly.",
    contactHeading: 'Still need help?',
    contactSub: "Send us a message and we'll get back to you.",
  },

  appStoreBadges: {
    downloadOnThe: 'Download on the',
    appStore: 'App Store',
    getItOn: 'Get it on',
    googlePlay: 'Google Play',
  },

  comingSoonBadge: {
    label: 'Coming Soon',
  },

  chatWidget: {
    errorNameRequired: 'Please enter your name.',
    errorContactRequired: 'Please enter your email or phone number.',
    errorGeneric: 'Something went wrong. Please try again.',
    headerTitle: 'Chat with Kolab',
    headerSubtitle: 'We typically reply within a few hours',
    closeAriaLabel: 'Close chat',
    openAriaLabel: 'Open chat',
    introText: "Tell us who you are and we'll start the conversation.",
    namePlaceholder: 'Your name',
    contactPlaceholder: 'Email or phone number',
    starting: 'Starting…',
    startChat: 'Start chat',
    emptyMessages: 'Send a message to get started.',
    messagePlaceholder: 'Type a message…',
    sendAriaLabel: 'Send message',
  },

  phoneShowcase: {
    creatorApp: { badge: 'Opening Kolab', quote: '“Find your next job in Kolab”', caption: 'Anjali Gurung · Creator, Kathmandu' },
    product: { badge: 'Displaying product', quote: '“Here’s the one I’ve been using”', caption: 'Sponsored by Himal Coffee' },
    food: { badge: 'Reviewing', caption: 'Worth the hype — ordering again' },
    clothing: { badge: 'Creator Pitching', quote: '“Hey guys, how are you?”', caption: 'Pesal · Itahari, Nepal' },
    onSet: { badge: 'On set', caption: 'Another shoot day, another brand', sub: 'Creator, Nepal' },
    behindScenes: { badge: 'Behind the scenes', caption: 'Getting today’s content ready', sub: 'Creator, Nepal' },
    style: { badge: 'Style content', quote: '“Today’s fit check”', caption: 'Street style creator' },
    momo: { badge: 'Momo & chowmein review', quote: '“This jhol momo is unreal”', caption: 'Sabina Tamang · Food creator' },
    hotel: { badge: 'Client pitch', caption: 'Pitching a reel concept to Hotel Mustang’s owner' },
    blog: { badge: 'Blogging live', quote: '“Okay guys, today we’re unboxing…”', caption: 'Prakash Shrestha · Tech blogger' },
    payment: { badge: 'Payment released', amount: '+ Rs 15,000 received', caption: 'Escrow released · eSewa' },
    content: { recLabel: 'REC', badge: 'Making content' },
  },

  contentPage: {
    home: 'Home',
    faqHeading: 'Frequently asked questions',
    exploreMore: 'Explore more',
    whatYouGet: 'What you get on Kolab',
    howItWorks: 'How it works',
    verifiedSafe: 'Verified, safe collaborations',
  },
};

export type LandingDict = typeof en;
