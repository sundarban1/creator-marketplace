import { PrismaClient } from '@prisma/client';

// Real, production-safe Help Center content — the creator-facing articles the
// mobile app renders under Settings → Help Center (grouped by `category`,
// ordered by `order`). Every row upserts by a stable id, so this is safe to
// re-run any time the copy changes, against local or production alike.
//
// Categories mirror the admin dashboard's Help Center editor
// (web/src/pages/HelpCenter.tsx): General, Events, Payments, Account, Content.
export async function seedHelpCenter(prisma: PrismaClient) {
  const articles = [
    // ── General ──────────────────────────────────────────────────────────────
    {
      id: 'seed-help-1',
      category: 'General',
      order: 1,
      question: 'What is Kolab?',
      answer:
        'Kolab is Nepal’s marketplace connecting content creators with local businesses for paid collaborations, sponsored content, and brand campaigns — from momo shops in Kathmandu to hotels in Pokhara. Businesses post events describing what they need; creators browse, apply, deliver the content, and get paid.',
    },
    {
      id: 'seed-help-2',
      category: 'General',
      order: 2,
      question: 'Is Kolab free to use?',
      answer:
        'Yes. Creating a creator account, completing your profile, and browsing or applying to events is completely free. Kolab only takes a service fee on successfully completed paid events (see Payments).',
    },
    {
      id: 'seed-help-3',
      category: 'General',
      order: 3,
      question: 'Who can join as a creator?',
      answer:
        'Anyone in Nepal who creates content — on Instagram, TikTok, YouTube, or Facebook. There is no platform-wide minimum follower count; many businesses specifically want smaller, highly-engaged local audiences. You must be at least 18, or have guardian consent, to create an account.',
    },
    {
      id: 'seed-help-4',
      category: 'General',
      order: 4,
      question: 'How is Kolab different from getting brand deals through DMs?',
      answer:
        'Everything lives in one place: the brief, the agreed rate and deadline, your chat with the business, content delivery, and payment. Paid event budgets are confirmed before you start work, and if something goes wrong after delivery, Kolab Support can step in — which a private DM deal can’t offer.',
    },

    // ── Events ───────────────────────────────────────────────────────────────
    {
      id: 'seed-help-5',
      category: 'Events',
      order: 1,
      question: 'How do events work?',
      answer:
        'A business posts an event with its goal, budget, requirements, and deadline. You apply by sending a proposal with a short cover letter and your rate. If the business accepts, you deliver the content by the agreed date and — for paid events — the payment is released to your wallet once the business approves your work.',
    },
    {
      id: 'seed-help-6',
      category: 'Events',
      order: 2,
      question: 'How do I apply to an event?',
      answer:
        'Open the Home tab, tap an event that fits you, and tap Apply. Write a cover letter that speaks to that event’s goal, set your proposed rate, and submit. Most businesses respond within 24–48 hours. A focused, tailored proposal beats sending the same generic pitch everywhere.',
    },
    {
      id: 'seed-help-7',
      category: 'Events',
      order: 3,
      question: 'Can I withdraw an application?',
      answer:
        'Yes — you can withdraw a pending proposal any time before it is accepted. If a proposal has already been accepted, message the business first, and contact Kolab Support if you need to step away, so it doesn’t affect your standing on the platform.',
    },
    {
      id: 'seed-help-8',
      category: 'Events',
      order: 4,
      question: 'What is the difference between paid and open events?',
      answer:
        'Paid events have a confirmed budget held by Kolab; you’re paid after the business approves your delivery. Open events have no payment — creators take part for exposure, product, event access, or portfolio work. The event card always shows which type it is before you apply.',
    },

    // ── Payments ─────────────────────────────────────────────────────────────
    {
      id: 'seed-help-9',
      category: 'Payments',
      order: 1,
      question: 'How do I get paid for a paid event?',
      answer:
        'When a business accepts your proposal for a paid event, the budget is reserved up front. After you submit your deliverables and the business approves them, the amount (minus the platform fee) is added to your Kolab wallet. From there you request a withdrawal to your linked payment account.',
    },
    {
      id: 'seed-help-10',
      category: 'Payments',
      order: 2,
      question: 'What payment methods are supported?',
      answer:
        'For creators in Nepal, Kolab supports eSewa, Khalti, and FonePay. Add or change your preferred payout method under Settings → Wallet before requesting a withdrawal.',
    },
    {
      id: 'seed-help-11',
      category: 'Payments',
      order: 3,
      question: 'What is the platform fee?',
      answer:
        'Kolab charges a 10% service fee on each completed paid event, deducted before the amount reaches your wallet. Open (unpaid) events have no fee. The fee covers payment processing, dispute support, and running the platform.',
    },
    {
      id: 'seed-help-12',
      category: 'Payments',
      order: 4,
      question: 'How do I withdraw my earnings?',
      answer:
        'Go to Settings → Wallet, tap Withdraw, and enter an amount within the daily and per-request limits shown. Each request is reviewed by the Kolab team before it is paid out to your eSewa, Khalti, or FonePay account, usually within a few business days. You can track the status in your wallet history.',
    },

    // ── Account ──────────────────────────────────────────────────────────────
    {
      id: 'seed-help-13',
      category: 'Account',
      order: 1,
      question: 'How do I get verified?',
      answer:
        'Complete your profile, link your Instagram, TikTok, YouTube, or Facebook accounts, and submit your citizenship or PAN document under Settings → Verification. Our team reviews most submissions within 2–3 business days. Verified creators are more likely to be shortlisted by businesses.',
    },
    {
      id: 'seed-help-14',
      category: 'Account',
      order: 2,
      question: 'How is my profile ranked in search?',
      answer:
        'Businesses see you based on how well your categories, location, and audience match what they’re looking for, plus profile completeness, your event completion and on-time delivery record, and the ratings businesses leave after working with you. Keeping your profile current and delivering on time are the biggest levers.',
    },
    {
      id: 'seed-help-15',
      category: 'Account',
      order: 3,
      question: 'How do I change my phone number or delete my account?',
      answer:
        'To update your phone number, go to Settings → Security and verify the new number with the code we text you. To delete your account, go to Settings → Security → Delete Account — this permanently removes your profile, proposals, and history and cannot be undone.',
    },

    // ── Content ──────────────────────────────────────────────────────────────
    {
      id: 'seed-help-16',
      category: 'Content',
      order: 1,
      question: 'What kinds of content can businesses ask for?',
      answer:
        'Instagram Reels, Stories, and posts; TikTok videos; YouTube reviews and vlogs; Facebook content; and photography. Each event’s brief spells out the exact formats, number of posts, and any must-have talking points or hashtags.',
    },
    {
      id: 'seed-help-17',
      category: 'Content',
      order: 2,
      question: 'Who owns the content I create for an event?',
      answer:
        'Unless the event brief says otherwise, you keep ownership of what you create and the business gets a licence to use it for the purpose described in the brief. If a business wants full rights or paid ad usage beyond that, it should be stated in the event and reflected in your rate. Always disclose sponsored content (for example #ad or #sponsored).',
    },
  ];

  // Seeded sequentially (not Promise.all) so `createdAt` increases in array
  // order — the mobile Help Center groups by category in first-seen order, so
  // this keeps the section order stable at General → Events → Payments →
  // Account → Content on a fresh seed.
  for (const { id, ...a } of articles) {
    await prisma.helpArticle.upsert({
      where:  { id },
      update: { ...a, published: true },
      create: { id, ...a, published: true },
    });
  }
  console.log(`  ✅ Help Center: ${articles.length} articles seeded`);
}
