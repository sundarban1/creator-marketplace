import { PrismaClient } from '@prisma/client';

export async function seedContent(prisma: PrismaClient) {
  // ── Help Center (creator-facing) ───────────────────────────────────────────
  const helpArticles = [
    { id: 'seed-help-1', question: 'How do campaigns work?', answer: 'Businesses in Nepal post campaigns describing their goals, budget, and requirements. Creators browse and apply by submitting a proposal with a cover letter and proposed rate. If the business accepts, you deliver the content by the agreed deadline and get paid.', category: 'Campaigns', order: 1 },
    { id: 'seed-help-2', question: 'How do I apply for a campaign?', answer: 'Go to the Home tab, browse available campaigns, and tap Apply. Fill in your cover letter, proposed rate, and timeline. The business will review your proposal and usually responds within 24–48 hours.', category: 'Campaigns', order: 2 },
    { id: 'seed-help-3', question: 'Can I withdraw a proposal?', answer: 'Yes — you can withdraw a pending proposal any time before it is accepted. Once a proposal is accepted, message the business directly or contact Kolab Support before declining, so it does not affect your creator score.', category: 'Campaigns', order: 3 },
    { id: 'seed-help-4', question: 'How do I get paid?', answer: 'Payments are released once the business confirms your content delivery, typically within 5 business days. Funds go directly to whichever payment method you linked — eSewa, Khalti, or FonePay.', category: 'Payments', order: 1 },
    { id: 'seed-help-5', question: 'What payment methods are supported?', answer: 'Kolab supports eSewa, Khalti, and FonePay for creators based in Nepal. Add or update your preferred method in Settings → Wallet.', category: 'Payments', order: 2 },
    { id: 'seed-help-6', question: 'What is the platform fee?', answer: 'Kolab charges a 10% service fee on each completed paid campaign, deducted before payout. Open, unpaid collaborations have no fee. This covers payment processing, dispute support, and platform upkeep.', category: 'Payments', order: 3 },
    { id: 'seed-help-7', question: 'How is my creator score calculated?', answer: 'Your score factors in profile completeness, campaign completion rate, on-time delivery, and how businesses rate your work. A higher score improves how often you show up in a business’s search and how likely they are to shortlist you.', category: 'Account', order: 1 },
    { id: 'seed-help-8', question: 'How do I get verified?', answer: 'Complete your profile, link your Instagram/TikTok/YouTube/Facebook accounts, and submit your citizenship or PAN document for review. Our team verifies most submissions within 2–3 business days.', category: 'Account', order: 2 },
    { id: 'seed-help-9', question: 'Do I need a minimum follower count?', answer: 'There is no platform-wide minimum. Each campaign sets its own criteria — some businesses specifically look for smaller, highly-engaged local audiences (e.g. within Kathmandu Valley), not just follower count.', category: 'Account', order: 3 },
    { id: 'seed-help-10', question: 'Which cities does Kolab support?', answer: 'Kolab works nationwide across Nepal — set your location during onboarding and turn on Nearby Events to see campaigns from businesses close to you, whether you’re in Kathmandu, Pokhara, Chitwan, or anywhere else.', category: 'Account', order: 4 },
  ];

  await Promise.all(
    helpArticles.map(({ id, ...a }) =>
      prisma.helpArticle.upsert({ where: { id }, update: { ...a, published: true }, create: { id, ...a, published: true } }),
    ),
  );
  console.log(`  ✅ Help articles: ${helpArticles.length} seeded`);

  // ── FAQs (creator-facing) ────────────────────────────────────────────────────
  const faqArticles = [
    { id: 'seed-faq-1', question: 'What is Kolab?', answer: 'Kolab is Nepal’s marketplace connecting content creators with local businesses for paid collaborations, sponsored content, and brand campaigns — from momo shops in Kathmandu to hotels in Pokhara.', category: 'General', order: 1 },
    { id: 'seed-faq-2', question: 'Is Kolab free to use?', answer: 'Yes — creating a creator account and browsing campaigns is completely free. A 10% service fee applies only to successfully completed paid campaigns.', category: 'General', order: 2 },
    { id: 'seed-faq-3', question: 'How do I improve my campaign acceptance rate?', answer: 'Complete your profile, link all your social accounts, add past work samples, and write a proposal that speaks directly to that campaign’s goals instead of sending the same generic pitch to everyone.', category: 'General', order: 3 },
    { id: 'seed-faq-4', question: 'What types of content can I create?', answer: 'Instagram Reels, Stories, and posts; TikTok videos; YouTube reviews and vlogs; Facebook content; and photography — depending on what each business requests.', category: 'Campaigns', order: 1 },
    { id: 'seed-faq-5', question: 'Can businesses see my profile before contacting me?', answer: 'Yes. Your public profile shows your bio, social stats, categories, location, and past work samples, so make sure it accurately represents your content style.', category: 'Campaigns', order: 2 },
    { id: 'seed-faq-6', question: 'What happens if a business does not pay?', answer: 'Paid campaign budgets are confirmed before work begins. If a dispute arises after delivery, contact Kolab Support with the campaign details and our team will mediate a fair resolution.', category: 'Payments', order: 1 },
    { id: 'seed-faq-7', question: 'How long does it take to receive payment?', answer: 'Payments are released within 5 business days after the business confirms your content was delivered. Funds go to your linked eSewa, Khalti, or FonePay account.', category: 'Payments', order: 2 },
    { id: 'seed-faq-8', question: 'How do I delete my account?', answer: 'Go to Settings → Security → Delete Account. This permanently removes your profile, proposals, and payment history from Kolab. This action cannot be undone.', category: 'Account', order: 1 },
    { id: 'seed-faq-9', question: 'How do I report a problem?', answer: 'Go to Settings → Support → Report an Issue, select the issue type, and describe what happened. Our team reviews all reports within 48 hours.', category: 'Account', order: 2 },
  ];

  await Promise.all(
    faqArticles.map(({ id, ...a }) =>
      prisma.faqArticle.upsert({ where: { id }, update: { ...a, published: true }, create: { id, ...a, published: true } }),
    ),
  );
  console.log(`  ✅ FAQ articles: ${faqArticles.length} seeded`);

  // ── Legal Sections ──────────────────────────────────────────────────────────
  const legalSections = [
    // Privacy Policy
    { id: 'seed-legal-pp-1', type: 'PRIVACY_POLICY', title: '1. Information We Collect', body: 'We collect information you provide directly — your name, email address, phone number, citizenship/PAN details for verification, social media handles, follower counts, and payment account details (eSewa, Khalti, or FonePay). We also collect usage data such as campaign activity, device information, and log data when you use Kolab.', order: 1 },
    { id: 'seed-legal-pp-2', type: 'PRIVACY_POLICY', title: '2. How We Use Your Information', body: 'Your information is used to match creators with relevant campaigns, process payments, send notifications, verify identity, improve the platform, and comply with Nepali law. We do not use your data to train third-party AI models without your explicit consent.', order: 2 },
    { id: 'seed-legal-pp-3', type: 'PRIVACY_POLICY', title: '3. Information Sharing', body: 'We share your public profile information with businesses when you apply to their campaigns. We do not sell your personal data to third parties. Verification documents (citizenship, PAN) are only visible to our internal review team.', order: 3 },
    { id: 'seed-legal-pp-4', type: 'PRIVACY_POLICY', title: '4. Data Security', body: 'We use industry-standard encryption and access controls to protect your data. However, no method of transmission over the internet is 100% secure — we encourage you to use a strong, unique password and enable two-factor verification where available.', order: 4 },
    { id: 'seed-legal-pp-5', type: 'PRIVACY_POLICY', title: '5. Your Rights', body: 'You have the right to access, correct, or delete your personal data at any time from Settings. To exercise these rights or ask a question, contact us at privacy@kolab.com.np.', order: 5 },
    // Terms & Conditions
    { id: 'seed-legal-tc-1', type: 'TERMS', title: '1. Acceptance of Terms', body: 'By creating an account or using Kolab, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the platform.', order: 1 },
    { id: 'seed-legal-tc-2', type: 'TERMS', title: '2. Eligibility', body: 'You must be at least 18 years old, or have parental/guardian consent, to create a creator or business account on Kolab. By registering, you confirm that the information you provide — including your name, location, and citizenship/PAN details — is accurate.', order: 2 },
    { id: 'seed-legal-tc-3', type: 'TERMS', title: '3. Campaign Participation', body: 'When a creator applies to a campaign and is accepted, both parties agree to the deliverables, timeline, and rate described in the proposal. Deliverables must be submitted by the agreed deadline, and payment must be released promptly after confirmation.', order: 3 },
    { id: 'seed-legal-tc-4', type: 'TERMS', title: '4. Payments & Fees', body: 'Paid campaign budgets are agreed upfront between the creator and business. Kolab charges a 10% platform fee on each completed paid campaign. Payouts are made to a creator’s linked eSewa, Khalti, or FonePay account within 5 business days of delivery confirmation.', order: 4 },
    { id: 'seed-legal-tc-5', type: 'TERMS', title: '5. Account Suspension', body: 'Kolab may suspend or terminate accounts that violate these Terms, our Community Guidelines, or applicable Nepali law, including fraud, harassment, or repeated non-delivery of agreed content.', order: 5 },
    { id: 'seed-legal-tc-6', type: 'TERMS', title: '6. Governing Law', body: 'These Terms are governed by the laws of Nepal. Any disputes arising from the use of Kolab shall be subject to the exclusive jurisdiction of the courts of Kathmandu, Nepal.', order: 6 },
    // Community Guidelines
    { id: 'seed-legal-cg-1', type: 'GUIDELINES', icon: '✅', title: 'Be Authentic', body: 'Only promote products or services you genuinely believe in, and clearly disclose sponsored content (e.g. #ad, #sponsored) in line with standard advertising practice.', order: 1 },
    { id: 'seed-legal-cg-2', type: 'GUIDELINES', icon: '🤝', title: 'Respect Everyone', body: 'Treat businesses, fellow creators, and the Kolab team with respect regardless of background, language, or region. Harassment or hate speech results in immediate account suspension.', order: 2 },
    { id: 'seed-legal-cg-3', type: 'GUIDELINES', icon: '⭐', title: 'Maintain Quality', body: 'Deliver content that genuinely meets the campaign brief. Low-quality or rushed submissions damage the experience for everyone on the platform, including future campaigns for you.', order: 3 },
    { id: 'seed-legal-cg-4', type: 'GUIDELINES', icon: '🇳🇵', title: 'Represent Responsibly', body: 'When creating content about local businesses, restaurants, or destinations in Nepal, be fair and accurate. Do not misrepresent a business’s products, pricing, or location.', order: 4 },
    { id: 'seed-legal-cg-5', type: 'GUIDELINES', icon: '🚫', title: 'Prohibited Content', body: 'Do not create content involving explicit material, misinformation, hate speech, or anything that violates Nepal’s Electronic Transactions Act or other applicable law.', order: 5 },
  ];

  await Promise.all(
    legalSections.map(({ id, ...s }) =>
      prisma.legalSection.upsert({ where: { id }, update: { ...s, published: true }, create: { id, ...s, published: true } }),
    ),
  );
  console.log(`  ✅ Legal sections: ${legalSections.length} seeded`);
}
