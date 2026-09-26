export const en = {
  nav: {
    links: {
      discover: 'Discover',
      forCreators: 'For Creators',
      forBusinesses: 'For Businesses',
      howItWorks: 'How It Works',
      about: 'About',
      trustSafety: 'Trust & Safety',
    },
    login: 'Log in',
    toggleMenuAriaLabel: 'Toggle menu',
    languageLabel: 'Language',
    appearanceLabel: 'Appearance',
    getStarted: 'Join Kolab',
    getStartedModalTitle: 'Ready to get started? ✨',
    getStartedModalBody: 'Create a free account to find creators, discover opportunities, and start working together on Kolab.',
    getStartedModalCta: 'Create an account',
    getStartedModalLoginPrompt: 'Already have an account?',
    getStartedModalLogin: 'Log in',
  },

  hero: {
    eyebrow: "🇳🇵 Built for Nepal's growing creator & business community",
    headlineLine1: 'The right collaboration',
    headlineLine2: 'starts here.',
    headlineLine3: 'For creators and businesses.',
    sub: 'Kolab connects creators with businesses for real collaboration — real skills, fresh content, and new opportunities.',
    searchPlaceholder: 'I need 3 creators to promote my cafe',
    searchAriaLabel: 'Describe the creators you need',
    searchCta: 'Find Creators',
    searchingLabel: 'Finding creators…',
    popularSearchesLabel: 'Popular:',
    // Fallback only — the live list comes from the backend
    // (GET /api/public/creators/popular-searches), which drops any search
    // that currently has no creators.
    popularSearches: [
      'Food creators in Kathmandu',
      'TikTok creators in Pokhara',
      'Beauty creators in Nepal',
    ],
    socialProofSuffix: 'creators are already on Kolab',
    socialProofQualitative: 'Built for creators and businesses across Nepal',
    connectors: {
      people: { label: 'Creators', sub: 'Find the right creators' },
      services: { label: 'Services', sub: 'Find the skills you need' },
      opportunities: { label: 'Opportunities', sub: 'Find your next opportunity' },
      events: { label: 'Events', sub: "Discover what's happening" },
    },
    ctaCreator: 'Find Opportunities',
    ctaBusiness: 'Find Creators',
    ctaCreatorSignup: 'Join as a Creator',
    ctaBusinessSignup: 'Post a Campaign',
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
      { heading: 'Find the Right Skills', sub: 'Find creators and skills that fit your campaign, job, budget, and time.' },
      { heading: 'Everything in One Place', sub: 'Find opportunities, send proposals, chat, manage campaigns, submit your work, and track payments — all in one place.' },
      { heading: 'Real Work, Less Hassle', sub: 'Skip the endless messaging and searching. Find real campaigns and jobs — or the right people for them — and connect directly.' },
      { heading: 'Collaborate with Confidence', sub: 'Keep requirements, messages, work, deadlines, and agreements organized so everyone knows what to expect.' },
      { heading: 'Get Paid Securely', sub: 'Send and receive payments through a clear, safe process — no more worrying about late payments, scams, or unclear deals.' },
    ],
  },

  trust: {
    eyebrow: 'Trusted by',
    heading: 'Nepal Creator economy',
    // Labels for the live numeric tiles, shown once real counts from
    // /api/public/landing-stats are confirmed positive.
    stats: [
      { label: 'Skilled Creators' },
      { label: 'Businesses' },
      { label: 'Categories' },
    ],
    // Shown instead of numbers whenever live counts aren't meaningful yet
    // (loading, failed, or genuinely zero pre-launch) — never a fabricated number.
    qualitative: [
      'Built for creators and businesses across Nepal',
      'Launching across Nepal',
      'Designed for creator-business collaboration',
    ],
  },

  creatorStory: {
    eyebrow: 'For Creators',
    label: 'For Creators',
    heading: 'Your skills deserve opportunities.',
    sub: 'Create your profile, show what you do, and find real work — then get paid for it.',
    title: 'Discover work, deliver great content, get paid.',
    steps: [
      { title: 'Create your account', desc: 'Create your profile and verify your account.' },
      { title: 'Show what you do', desc: 'Add your skills, platforms, location and portfolio.' },
      { title: 'Find opportunities', desc: 'Discover campaigns, jobs and collaborations.' },
      { title: 'Apply', desc: 'Apply to opportunities that match your skills.' },
      { title: 'Collaborate', desc: 'Work with the business and complete the agreed work.' },
      { title: 'Get paid', desc: 'Receive payment once the collaboration is complete.' },
      { title: 'Grow', desc: 'Build your profile, experience and relationships.' },
    ],
    ctaCaption: 'Create your professional profile',
    liveOnWeb: 'Live on Web',
    comingSoonBoth: 'Coming soon on iOS & Android',
  },
  businessStory: {
    eyebrow: 'For Businesses',
    label: 'For Businesses',
    heading: 'Stop searching. Start finding.',
    sub: 'Tell Kolab what you need and discover creators who fit your campaign, content, event or project.',
    title: 'Post a campaign, find the right creators, grow.',
    steps: [
      { title: 'Create your business account', desc: 'Set up your business profile.' },
      { title: 'Tell us what you need', desc: 'Post a campaign, job or creator requirement.' },
      { title: 'Discover creators', desc: 'Search and filter to find people who fit your requirement.' },
      { title: 'Explore profiles', desc: 'Look at their work, platforms and past collaborations.' },
      { title: 'Collaborate', desc: 'Work with the creators you choose.' },
      { title: 'Complete the work', desc: 'Manage the agreed deliverables and deadlines.' },
      { title: 'Build relationships', desc: 'Work with creators again for future campaigns.' },
    ],
    ctaCaption: 'Post your project or requirement',
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

  oldWay: {
    problemIntro: "Finding the right creator shouldn't be this hard.",
    eyebrow: 'The way it usually works',
    heading: 'Do you know any good creators?',
    sub: 'For many businesses, working with creators still means asking around, searching social media, and messaging people one by one.',
    messages: [
      'Hey, are you available?',
      'Can you send your rates?',
      'How many followers do you have?',
      'Did you upload the content?',
      'Can you send the screenshot?',
      'Which creators are confirmed?',
    ],
    noteLabel: 'Reminder',
    noteText: 'Follow up with 3 creators before Friday',
    calendarLabel: 'Fri, 10:00 AM',
    calendarText: 'Call with creator #4',
    spreadsheetLabel: 'Creator tracker.xlsx',
    spreadsheetText: '12 rows · 4 unconfirmed',
    paymentLabel: 'Payment sent',
    paymentText: 'NPR 15,000 · manual transfer',
    closingLine1: { pre: 'Too many ', highlight: 'conversations', post: '.' },
    closingLine2: { pre: 'Too much ', highlight: 'manual', post: ' work.' },
    closingLine3: { pre: 'Too much ', highlight: 'uncertainty', post: '.' },
  },

  // A single fake listing reused wherever the page needs a realistic
  // opportunity-card mockup (BusinessStory) so it's translated and typed
  // once instead of duplicated per call site.
  sampleOpportunity: {
    title: 'Fashion Reel Creators',
    budget: 'NPR 15,000',
    brand: 'Urban Threads',
    postedAgo: '2 days ago',
    category: 'Fashion',
    location: 'Lalitpur',
    deadlineLabel: '5 days left',
  },

  liveOnKolab: {
    eyebrow: 'Live on Kolab',
    heading: "See what's already happening.",
    sub: 'Real campaigns, creators and businesses — right now on the platform.',
    tabs: { opportunities: 'Opportunities', creators: 'Creators', businesses: 'Businesses' },
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
    applyLabel: 'Apply Now',
    cards: [
      { title: 'Food Creator Needed', budget: 'NPR 20,000', brand: 'Momo Bar · Kathmandu', category: 'Food' },
      { title: 'Travel Creator Collab', budget: 'NPR 15,000', brand: 'Hotel Mustang · Pokhara', category: 'Travel' },
    ],
  },

  events: {
    eyebrow: 'Opportunities on Kolab',
    heading: 'Paid collaborations and open events looking for creators.',
    sub: 'Real campaigns and events posted by businesses across Nepal — from paid brand deals to open creator meetups.',
    cta: 'Browse all events',
    paidBadge: 'Paid',
    freeBadge: 'Open',
    modalTitle: 'Ready to explore more opportunities? ✨',
    modalBody: 'Create an account to browse paid collaborations and open events on Kolab, and start applying to the ones that fit you.',
    modalCta: 'Create an account',
    modalLoginPrompt: 'Already have an account?',
    modalLogin: 'Log in',
    fallback: [
      { badge: 'Paid', title: 'Food Creator Needed', business: 'Everest Cafe', location: 'Kathmandu', meta: 'NPR 20,000' },
      { badge: 'Paid', title: 'Fashion Reel Creators', business: 'Urban Threads', location: 'Lalitpur', meta: 'NPR 15,000' },
      { badge: 'Open', title: 'Grand Opening Collab', business: 'The Beauty Bar', location: 'Pokhara', meta: 'Free food + experience' },
      { badge: 'Paid', title: 'Travel Vlog Partner', business: 'Himalaya Treks', location: 'Pokhara', meta: 'NPR 25,000' },
    ],
  },

  categories: {
    eyebrow: 'Every category, covered',
    heading: 'Find creators across Nepal.',
    more: 'More',
    list: [
      'Fashion', 'Travel', 'Food & Beverage', 'Technology', 'Gaming',
      'Fitness & Health', 'Beauty', 'Lifestyle', 'Music', 'Photography',
      'Education', 'Entertainment',
    ],
  },

  marketplace: {
    creators: {
      eyebrow: 'Creators on Kolab',
      heading: 'Meet the creators bringing Nepali brands to life.',
      sub: 'Verified content creators and influencers across every niche — explore profiles, portfolios and past work.',
      cta: 'Browse all creators',
      verified: 'Verified',
      followers: 'followers',
      modalTitle: 'Ready to discover more creators? ✨',
      modalBody: 'Create an account to explore talented creators on Kolab and find the perfect match for your next project.',
      modalCta: 'Create an account',
      modalLoginPrompt: 'Already have an account?',
      modalLogin: 'Log in',
      fallback: [
        { name: 'Content Creators', category: 'Fashion & Lifestyle' },
        { name: 'Influencers', category: 'Food & Travel' },
        { name: 'UGC Creators', category: 'Beauty & Tech' },
        { name: 'Video Creators', category: 'Entertainment' },
      ],
    },
    businesses: {
      eyebrow: 'Businesses on Kolab',
      heading: 'The brands hiring creators on Kolab.',
      sub: 'From cafés to salons to startups — businesses across Nepal running campaigns and events with creators.',
      cta: 'Browse all businesses',
      verified: 'Verified',
      modalTitle: 'Ready to discover more businesses? ✨',
      modalBody: 'Create an account to explore businesses hiring creators on Kolab and find the perfect match for your next collaboration.',
      modalCta: 'Create an account',
      modalLoginPrompt: 'Already have an account?',
      modalLogin: 'Log in',
      fallback: [
        { name: 'Restaurants & Cafés', category: 'Food & Beverage' },
        { name: 'Salons & Spas', category: 'Beauty & Wellness' },
        { name: 'Retail & Fashion', category: 'Shopping' },
        { name: 'Startups', category: 'Technology' },
      ],
    },
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
    heading: 'Built for better collaboration.',
    sub: 'Every profile, request, and conversation is designed to keep collaboration safe and clear.',
    points: [
      {
        title: 'Verified Profiles',
        desc: 'Identity checks keep the creators and businesses you meet real.',
        detail: 'Every account is checked before it can publish a profile, apply to a campaign, or message another user.',
      },
      {
        title: 'Reviews & Ratings',
        desc: 'Honest feedback from real collaborations, every time.',
        detail: "Ratings are only left after a real collaboration closes, so a profile's history shows real work, not fake praise.",
      },
      {
        title: 'Agreed Terms, Both Sides',
        desc: 'Scope, budget and deliverables are agreed by both sides before work begins.',
        detail: "Nothing starts until both the creator and the business agree on the same terms, so there are no surprises in the middle of a project.",
      },
      {
        title: 'Secure Escrow Payments',
        desc: 'Payment is held in escrow and released to the creator only once work is approved — never sent directly, so neither side is exposed to a scam.',
        detail: 'The business pays first, the creator delivers the work, and the payment moves automatically the moment the work is approved.',
      },
      {
        title: 'Secure Communication',
        desc: 'Keep every conversation and file in one protected place.',
        detail: 'No need to share personal phone numbers or use many different apps — every conversation stays in one place, with the campaign.',
      },
      {
        title: 'Report & Safety',
        desc: 'Flag an issue anytime — our team responds fast.',
        detail: 'A dedicated safety team reviews every report and can take action on a payment or a conversation if something looks wrong.',
      },
    ],
  },

  stories: {
    eyebrow: 'Success stories',
    heading: 'Real people. Real collaborations.',
    showMore: 'Show more',
    showLess: 'Show less',
    // Shown only when there are genuinely no published stories yet (or the
    // fetch fails) — never a fabricated quote standing in for a real one.
    emptyTitle: "Stories are just getting started.",
    emptyBody: 'As creators and businesses complete collaborations on Kolab, their stories will appear here.',
  },

  finalCta: {
    heading: "Your next collaboration shouldn't depend on who you know.",
    supportingLine: 'It should start with what you can create.',
    roles: { business: 'Business', creator: 'Creator' },
    creatorCard: {
      heading: 'Find opportunities. Build your profile. Get hired.',
      sub: 'Create your account and start discovering real work.',
      cta: 'Join as a Creator',
    },
    businessCard: {
      heading: 'Find creators who fit your next campaign.',
      sub: 'Post what you need and discover the right people.',
      cta: 'Post a Campaign',
    },
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

  aboutPage: {
    title: 'About Kolab',
    tagline: 'Bringing creators and businesses together.',
    intro: 'Kolab is a platform built to make it easier for creators and businesses to discover opportunities, collaborate, and grow together.',
    creatorsHeading: 'For Creators',
    creatorsBody: 'Discover new opportunities, showcase your content, collaborate with businesses, and build your professional journey.',
    businessesHeading: 'For Businesses',
    businessesBody: 'Find the right creators, create opportunities, manage collaborations, and connect with new audiences.',
    missionHeading: 'Our Mission',
    missionBody: 'To make creator-business collaboration simpler, more accessible, and more meaningful across Nepal.',
    nepalHeading: 'Built for Nepal 🇳🇵',
    nepalBody: "We're building a community where creators and businesses can connect, collaborate, and create opportunities together.",
    company: 'Kolab Technologies',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    copyright: '© {year} Kolab',
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

  launchAnnouncement: {
    badge: '🎉 Kolab Launch',
    appsComingSoonIos: 'iOS',
    appsComingSoonMid: '&',
    appsComingSoonAndroid: 'Android',
    appsComingSoonSuffix: 'launching soon',
    titleTop: 'Join Kolab Early',
    titleBottomPre: '& Start ',
    titleHighlight: 'Winning',
    description: 'Two exciting ways to win at launch — join the Lucky Draw, enter the Video Contest below, or do both.',
    tabDraw: 'Lucky Draw',
    tabContest: 'Video Contest',
    stepsHeading: '🎟️ How to Enter',
    stepsSubheading: 'Complete these 3 simple steps to join the draw.',
    // Step 1's description renders as plain text; step 2's is scanned for
    // Facebook/Instagram/TikTok and those words turned into real links to
    // the admin-managed social URLs (see renderWithPlatformLinks below).
    steps: [
      { title: 'Register & Verify', description: 'Create your Kolab account and complete verification.' },
      { title: 'Follow Kolab', description: 'Like & follow Kolab on Facebook, Instagram & TikTok.' },
      { title: 'Tag 5 Friends', description: 'Tag five friends in the official Kolab Lucky Draw post.' },
    ],
    eligibleTitle: "🎉 You're in!",
    eligibleBody: "Complete all three requirements and you're eligible for the Kolab Lucky Draw.",
    attendanceTitle: "🎉 You don't need to attend the launch!",
    attendanceBody: "Complete all the requirements and you're still eligible for the Kolab Lucky Draw, even if you can't attend the launch event.",
    attendanceNote: 'The lucky draw will take place live during the official Kolab launch event.',
    prizesHeading: '🎁 Exciting prizes await',
    prizes: ['Gift Hampers', 'Cash Prizes', 'Coupons', 'More Surprises'],
    contestStepsHeading: '🎬 How to Enter',
    contestStepsSubheading: 'Complete these 3 simple steps to submit your video.',
    contestSteps: [
      { title: 'Create', description: 'Shoot a ~30-second creative video promoting Kolab in your own unique style.' },
      { title: 'Post & Submit', description: 'Post it on TikTok, Instagram, Facebook or another public platform, then send us the link.' },
      { title: 'Win', description: 'Top 3 most creative videos win exciting prizes or cash rewards!' },
    ],
    contestNoteTitle: '🎬 Show us your creativity',
    contestNoteBody: 'Be creative, have fun, and show us how you would introduce Kolab to the world. 🎬✨',
    cta: 'Join Kolab',
    loginPrompt: 'Already have an account?',
    login: 'Log in',
    closeAriaLabel: 'Close',
  },
};

export type LandingDict = typeof en;
