export const en = {
  nav: {
    links: {
      discover: 'Discover',
      services: 'Services',
      opportunities: 'Opportunities',
      events: 'Events',
      howItWorks: 'How it works',
    },
    toggleMenuAriaLabel: 'Toggle menu',
    languageLabel: 'Language',
    appearanceLabel: 'Appearance',
  },

  hero: {
    eyebrow: 'AI-powered — find the right skilled creators for your campaign or job',
    headlineLine1: 'Find the right creators.',
    headlineLine2: 'Create opportunities.',
    headlineLine3: 'Collaborate.',
    sub: 'Kolab helps you find the skills your campaign, event or job needs — and connects you with the creators who can deliver them.',
    searchPlaceholder: "Try 'I need 3 content creators for my restaurant launch'",
    searchAriaLabel: 'Search Kolab',
    micAriaLabel: 'Search by voice',
    searchCta: 'Search',
    popularSearchesLabel: 'Popular searches:',
    popularSearches: ['Content Creators', 'Influencers', 'UGC Creators', 'Reels', 'Product Reviews'],
    socialProofSuffix: 'creators are already on Kolab',
    socialProofFallback: 10000,
    connectors: {
      people: { label: 'Creators', sub: 'Find the right creators' },
      services: { label: 'Services', sub: 'Find the skills you need' },
      opportunities: { label: 'Opportunities', sub: 'Find your next opportunity' },
      events: { label: 'Events', sub: "Discover what's happening" },
    },
    ctaCreator: 'Offer Your Skills',
    ctaBusiness: 'Find Skills',
    scrollAriaLabel: 'Scroll to explore',
    scrollLabel: 'Scroll',
  },

  possibilities: {
    eyebrow: 'What you can do here',
    heading: 'One place. Many possibilities.',
    // `caption` sits on the photo itself — a real search phrase someone would
    // type for that card, so the grid shows the intent behind each tile
    // rather than only naming it.
    cards: {
      people: { title: 'Creators', sub: 'Find the creators you need.', cta: 'Explore Creators', caption: 'Looking for creators to promote my cafe' },
      services: { title: 'Services', sub: 'Find the skills you need.', cta: 'Explore Services', caption: 'Looking for a UGC creator for my brand' },
      opportunities: { title: 'Opportunities', sub: 'Find your next opportunity.', cta: 'Explore Opportunities', caption: 'Looking for skillful creators' },
      events: { title: 'Events', sub: "Discover what's happening.", cta: 'Explore Events', caption: 'Looking for a content creator to promote my event' },
    },
  },

  showcase: {
    eyebrow: 'Why Kolab',
    panels: [
      { heading: 'Find the Right Skills', sub: 'Discover the creators and skills that actually fit your campaign, job, budget, and timeline.' },
      { heading: 'Everything in One Place', sub: 'Discover opportunities, send proposals, communicate, manage campaigns, submit deliverables, and track payments without jumping between platforms.' },
      { heading: 'Real Work, Less Hassle', sub: 'Skip endless DMs and cold outreach. Find real campaigns and jobs — or the skills to deliver them — and connect directly.' },
      { heading: 'Collaborate with Confidence', sub: 'Keep campaign requirements, communication, deliverables, deadlines, and agreements organized so everyone knows what to expect.' },
      { heading: 'Get Paid Securely', sub: 'Make payments and receive earnings through a transparent process, reducing the stress of chasing payments, scams, or unclear deals.' },
    ],
  },

  trust: {
    eyebrow: 'Trusted by',
    heading: 'Nepal Creator economy',
    // fallback is shown only until the real /api/public/landing-stats count loads
    stats: [
      { fallback: 5000, label: 'Skilled Creators' },
      { fallback: 300, label: 'Businesses' },
      { fallback: 12, label: 'Categories' },
    ],
  },

  audience: {
    eyebrow: 'Built for both sides',
    heading: 'Built for both sides of collaboration.',
    headingAccent: 'collaboration.',
    sub: "Whether you're offering your skills or hiring them for a campaign, event or job, Kolab brings both sides together.",
    matchFound: 'Match found',
    giver: {
      label: 'For service givers',
      title: 'Turn what you do into opportunity.',
      sub: 'Showcase your skills, discover projects and connect with creators and businesses looking for what you do.',
      notifications: ['Food Creator Needed', 'UGC Content Collab', 'Brand Collaboration'],
      badge: 'Top Creator',
      name: 'Sundar Nepal',
      role: 'Content Creator',
      rating: '4.9 (128)',
      location: 'Kathmandu',
      tags: ['Reels', 'UGC', 'Food & Travel'],
      tagsMore: '+3',
      opportunities: '24 Opportunities',
      avatarsMore: '+19',
      cta: 'Find Opportunities',
      ctaCaption: 'Create your professional profile',
    },
    taker: {
      label: 'For service takers',
      title: 'Find the creators who can make it happen.',
      sub: 'Find the skills you need for your campaign, event or job — and the creators behind them.',
      opportunityBadge: 'New opportunity',
      opportunityTitle: 'Content Creators Needed',
      location: 'Kathmandu',
      budget: 'NPR 20,000',
      creators: '3 Creators',
      project: 'Restaurant Launch',
      projectTag: 'Project',
      opportunityCta: 'Find Creators',
      talent: ['Content Creator', 'Influencer', 'UGC Creator'],
      cta: 'Find Skills',
      ctaCaption: 'Post your project or requirement',
    },
  },

  aiDiscovery: {
    eyebrow: 'Search smarter',
    heading: 'AI discovery that understands you.',
    sub: 'Tell Kolab what your campaign or job needs. Search naturally — type it, speak it, and let Kolab find the right skills.',
    understandingLabel: 'Understanding…',
    matchesLabel: 'matches found',
    viewMatches: 'View Matches',
    queries: [
      { text: 'I need 2 food creators in Kathmandu for my restaurant launch.', checklist: ['Food & Beverage', 'Content Creator', 'Kathmandu', '2 creators', 'Restaurant Launch'], matches: 24 },
      { text: 'I need 3 content creators for my brand event.', checklist: ['Content Creator', 'Reels', 'Brand Event', '3 creators'], matches: 31 },
      { text: 'I need influencers to promote my corporate event.', checklist: ['Influencer', 'Event Promotion', 'Corporate Event', '2 creators'], matches: 18 },
      { text: 'I need UGC creators for a product review campaign.', checklist: ['UGC Creator', 'Product Review', 'Campaign', '2 creators'], matches: 27 },
      { text: 'I need food and lifestyle creators for my café launch.', checklist: ['Food & Beverage', 'Lifestyle Creator', 'Reels', 'Café Launch'], matches: 22 },
    ],
  },

  // The creator-home replica in AppHomePreview. Strings are the app's own
  // (mobile/src/i18n/en.ts `home.*` / `creator.home.*`) so the frame shows
  // the shipped copy, not a paraphrase of it. `quickActions` is positionally
  // paired with QUICK_ACTIONS in AppHomePreview.tsx — keep both at five and
  // in the same order.
  appPreview: {
    label: 'The actual app',
    greeting: 'Good morning, Aayush',
    location: 'Kathmandu',
    searchPlaceholder: 'Search opportunities, services, or businesses',
    attentionTitle: 'Action Required',
    attentionSub: 'Upload deliverables for “Momo Bar Launch”',
    ctaTitle: 'Find your next work',
    ctaSub: 'Discover businesses looking for creators like you.',
    ctaBtn: 'Browse Work',
    quickActions: ['Applied Works', 'Work Requests', 'Discover', 'Businesses', 'Find Creators'],
    recommended: 'Recommended',
    seeAll: 'See all',
    cards: [
      { title: 'Food Creator Needed', budget: 'NPR 20,000', brand: 'Momo Bar · Kathmandu', category: 'Food' },
      { title: 'Travel Creator Collab', budget: 'NPR 15,000', brand: 'Hotel Mustang · Pokhara', category: 'Travel' },
    ],
  },

  opportunityFeed: {
    eyebrow: 'Never miss a fit',
    heading: 'Your next opportunity could be one click away.',
    opportunitiesLabel: 'Opportunities',
    viewAllOpportunities: 'View all opportunities',
    applyNow: 'Apply Now',
    opportunities: [
      { badge: 'Paid', title: 'Food Creator Needed', location: 'Kathmandu', meta: 'NPR 20,000', sub: '3 Creators' },
      { badge: 'Event', title: 'Grand Opening Collab', location: 'Pokhara', meta: 'Free food + experience', sub: 'Networking' },
      { badge: 'Free', title: 'Free Creator Event', location: 'Kathmandu', meta: 'Free food · Experience', sub: 'Networking' },
    ],
    moreOpportunities: [
      { title: 'Fashion Reel Creators', date: 'Deadline Sep 18', location: 'Kathmandu' },
      { title: 'Cafe Menu Launch', date: 'Deadline Sep 22', location: 'Lalitpur' },
      { title: 'Travel Vlog Partner', date: 'Deadline Sep 30', location: 'Pokhara' },
    ],
    eventsLabel: 'Find Creators for Your Event',
    viewAllEvents: 'View all events',
    featuredEvent: { dateDay: '12', dateMonth: 'Sep', title: 'Grand Opening Event Promotion', location: 'Kathmandu', sub: 'Content Creators & Influencers' },
    // Positionally paired with MORE_EVENT_PHOTOS in OpportunityFeed.tsx —
    // reorder one and the other has to follow.
    moreEvents: [
      { title: 'Restaurant Opening', date: 'Sep 20', location: 'Pokhara' },
      { title: 'Salon Promotion', date: 'Sep 25', location: 'Kathmandu' },
      { title: 'Opening Clothing Store', date: 'Oct 05', location: 'Lalitpur' },
    ],
  },

  categories: {
    eyebrow: 'Every category, covered',
    heading: 'Whatever skill your campaign or job needs, someone on Kolab has it.',
    more: 'More',
    list: [
      'Fashion', 'Travel', 'Food & Beverage', 'Technology', 'Gaming',
      'Fitness & Health', 'Beauty', 'Lifestyle', 'Music', 'Photography',
      'Education', 'Entertainment',
    ],
  },

  howItWorks: {
    eyebrow: 'How Kolab works',
    heading: 'From idea to collaboration.',
    steps: [
      { title: 'Discover', desc: 'Find creators, services, events or opportunities that match your needs.' },
      { title: 'Connect', desc: 'Explore profiles, requirements or portfolios, then reach out or apply.' },
      { title: 'Collaborate', desc: 'Work together smoothly and bring your ideas to life.' },
      { title: 'Grow', desc: 'Build relationships, reputation and future opportunities.' },
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
    eyebrow: 'Built on trust',
    heading: 'Built for meaningful collaborations.',
    sub: 'Every profile, request, and conversation is designed to keep collaboration safe and clear.',
    points: [
      { title: 'Verified Profiles', desc: 'Identity checks keep the creators and businesses you meet real.' },
      { title: 'Reviews & Ratings', desc: 'Honest feedback from real collaborations, every time.' },
      { title: 'Clear Requirements', desc: 'Scope, budget, and deliverables spelled out upfront.' },
      { title: 'Secure Communication', desc: 'Keep every conversation and file in one protected place.' },
      { title: 'Report & Safety', desc: 'Flag an issue anytime — our team responds fast.' },
    ],
  },

  stories: {
    eyebrow: 'Success stories',
    heading: 'Success stories from our community.',
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
    heading: 'Ready to collaborate?',
    sub: 'Find the skills for your campaign or job. Offer your own. Make something happen.',
    ctaGetStarted: 'Get Started',
    ctaExplore: 'Explore Kolab',
    roles: { designer: 'Designer', business: 'Business', creator: 'Creator' },
  },

  footer: {
    tagline: 'Discover. Connect. Collaborate. Grow.',
    columns: {
      discover: 'Discover',
      forCreators: 'For Creators',
      forBusinesses: 'For Businesses',
      company: 'Company & Support',
    },
    downloadApp: 'Download the Kolab app',
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
