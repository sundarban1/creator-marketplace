export const en = {
  nav: {
    links: {
      how: 'How it works',
      audience: 'Creators & Brands',
      categories: 'Categories',
      security: 'Security',
      contact: 'Contact',
    },
    cta: 'Get started',
  },

  hero: {
    eyebrow: "Nepal's creator marketplace",
    headline: 'Where creators and brands',
    headlineEmphasis: 'collaborate',
    sub: 'Kolab connects Nepali creators with brands for paid campaigns — discover, collaborate, and get paid, all in one place.',
    ctaCreator: 'Join as Creator',
    ctaBusiness: 'Hire Creators',
  },

  trust: {
    // fallback is shown only until the real /api/public/landing-stats count loads
    stats: [
      { fallback: 5000, label: 'Creators' },
      { fallback: 300, label: 'Brands' },
      { fallback: 12, label: 'Categories' },
    ],
  },

  how: {
    eyebrow: 'How it works',
    heading: 'From sign-up to payout, in four steps',
    steps: [
      { title: 'Create your profile', desc: 'Creators connect their social accounts. Brands set up a business profile.' },
      { title: 'Discover & apply', desc: 'Brands post campaigns, creators apply, or brands invite creators directly.' },
      { title: 'Collaborate', desc: 'Chat, share drafts, and finalize the content together.' },
      { title: 'Get paid safely', desc: 'Payment is held in escrow and released once the work is approved.' },
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

  partners: {
    eyebrow: 'Partners',
    heading: 'Integrated with the platforms you already use',
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
    ],
  },

  finalCta: {
    heading: 'Ready to get started?',
    sub: "Join Nepal's creator marketplace today.",
    ctaCreator: 'Join as Creator',
    ctaBusiness: 'Hire Creators',
  },

  footer: {
    tagline: 'Where creators and brands collaborate.',
    privacy: 'Privacy',
    terms: 'Terms',
    support: 'Support',
    contact: 'Contact',
    rights: 'All rights reserved.',
    madeIn: 'Made in Nepal',
    contactForm: {
      heading: 'Get in touch',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      topicLabel: 'Topic',
      topicPlaceholder: "What's this about?",
      messageLabel: 'Message',
      messagePlaceholder: 'Tell us a bit more...',
      submitBtn: 'Send message',
      submittingBtn: 'Sending...',
      successTitle: 'Message sent',
      successSub: "We'll get back to you soon.",
      errorGeneric: 'Something went wrong. Please try again.',
    },
  },
};

export type LandingDict = typeof en;
