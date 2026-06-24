import { PrismaClient } from '@prisma/client';

export async function seedContent(prisma: PrismaClient) {
  // ── Help Center ─────────────────────────────────────────────────────────────
  const helpArticles = [
    { id: 'seed-help-1', question: 'How do campaigns work?', answer: 'Businesses post campaigns describing their goals, budget, and requirements. Creators browse and apply by submitting a proposal. If accepted, you deliver the content and get paid within 5 business days.', category: 'Campaigns', order: 1 },
    { id: 'seed-help-2', question: 'How do I apply for a campaign?', answer: 'Go to the Home tab, browse available campaigns, and tap Apply. Fill in your cover letter, proposed rate, and timeline. The business will review your proposal and respond within 24–48 hours.', category: 'Campaigns', order: 2 },
    { id: 'seed-help-3', question: 'Can I withdraw a proposal?', answer: 'Yes, you can withdraw a pending proposal before it is accepted. Once accepted, contact support before declining to avoid penalties to your creator score.', category: 'Campaigns', order: 3 },
    { id: 'seed-help-4', question: 'How do I get paid?', answer: 'Payments are released within 5 business days after the business confirms content delivery. Funds are transferred to your linked payment method (eSewa, Khalti, or FonePay).', category: 'Payments', order: 1 },
    { id: 'seed-help-5', question: 'What payment methods are supported?', answer: 'We currently support eSewa, Khalti, and FonePay for Nepal-based creators. Add your preferred methods in Settings → Earnings & Payments.', category: 'Payments', order: 2 },
    { id: 'seed-help-6', question: 'What is the platform fee?', answer: 'CreatorMarket charges a 10% platform fee on each completed campaign. This covers payment processing, dispute resolution, and platform maintenance.', category: 'Payments', order: 3 },
    { id: 'seed-help-7', question: 'How is my creator score calculated?', answer: 'Your score considers profile completeness, campaign completion rate, content quality ratings, and on-time delivery. A higher score improves your visibility and selection chances.', category: 'Account', order: 1 },
    { id: 'seed-help-8', question: 'How do I get verified?', answer: 'Verified status is granted after your account is reviewed by our team. Complete your profile, link your social accounts, and submit at least 3 successful campaigns to qualify.', category: 'Account', order: 2 },
    { id: 'seed-help-9', question: 'What are the minimum follower requirements?', answer: 'There is no strict platform minimum. However, each campaign sets its own criteria. Building a strong, engaged audience improves your chances of being selected.', category: 'Account', order: 3 },
  ];

  await Promise.all(
    helpArticles.map((a) =>
      prisma.helpArticle.upsert({ where: { id: a.id }, update: {}, create: { ...a, published: true } }),
    ),
  );
  console.log(`  ✅ Help articles: ${helpArticles.length} seeded`);

  // ── FAQs ────────────────────────────────────────────────────────────────────
  const faqArticles = [
    { id: 'seed-faq-1', question: 'What is CreatorMarket?', answer: 'CreatorMarket is a platform connecting content creators with local businesses for paid collaborations, sponsored content, and brand campaigns.', category: 'General', order: 1 },
    { id: 'seed-faq-2', question: 'Is CreatorMarket free to use?', answer: 'Yes — creating a creator account and browsing campaigns is completely free. A 10% service fee applies only on successfully completed campaigns.', category: 'General', order: 2 },
    { id: 'seed-faq-3', question: 'How do I improve my campaign acceptance rate?', answer: "Complete your profile, link all your social accounts, add past work samples, and write personalized proposals that directly address each campaign's goals.", category: 'General', order: 3 },
    { id: 'seed-faq-4', question: 'What types of content can I create?', answer: 'Instagram Reels/Stories/Posts, TikTok videos, YouTube reviews and vlogs, Facebook content, and photography — depending on what the business requests.', category: 'Campaigns', order: 1 },
    { id: 'seed-faq-5', question: 'Can businesses see my profile before contacting me?', answer: 'Yes. Your public profile shows your bio, social stats, categories, and past work samples. Make sure it accurately represents your content style.', category: 'Campaigns', order: 2 },
    { id: 'seed-faq-6', question: 'What happens if a business does not pay?', answer: 'We hold campaign budgets in escrow before any work begins. If a dispute arises, our team mediates and ensures fair resolution based on agreed deliverables.', category: 'Payments', order: 1 },
    { id: 'seed-faq-7', question: 'How long does it take to receive payment?', answer: 'Payments are processed within 5 business days after the business confirms content delivery. Funds go to your linked eSewa, Khalti, or FonePay account.', category: 'Payments', order: 2 },
    { id: 'seed-faq-8', question: 'How do I delete my account?', answer: 'Go to Settings → Security → Delete Account. This permanently removes all your data, proposals, and payment history. This action cannot be undone.', category: 'Account', order: 1 },
    { id: 'seed-faq-9', question: 'How do I report a problem?', answer: 'Go to Settings → Support → Report an Issue. Select the issue type, describe the problem in detail, and submit. Our team reviews all reports within 48 hours.', category: 'Account', order: 2 },
  ];

  await Promise.all(
    faqArticles.map((a) =>
      prisma.faqArticle.upsert({ where: { id: a.id }, update: {}, create: { ...a, published: true } }),
    ),
  );
  console.log(`  ✅ FAQ articles: ${faqArticles.length} seeded`);

  // ── Legal Sections ──────────────────────────────────────────────────────────
  const legalSections = [
    // Privacy Policy
    { id: 'seed-legal-pp-1', type: 'PRIVACY_POLICY', title: '1. Information We Collect', body: 'We collect information you provide directly, such as your name, email address, social media handles, follower counts, and payment details. We also collect usage data including campaign interactions, device information, and log data when you use our services.', order: 1 },
    { id: 'seed-legal-pp-2', type: 'PRIVACY_POLICY', title: '2. How We Use Your Information', body: 'Your information is used to match you with relevant campaigns, process payments, send notifications, improve our platform, and comply with legal obligations. We do not use your data to train AI models without explicit consent.', order: 2 },
    { id: 'seed-legal-pp-3', type: 'PRIVACY_POLICY', title: '3. Information Sharing', body: 'We share your profile information with businesses when you apply for their campaigns. We do not sell your personal data to third parties.', order: 3 },
    { id: 'seed-legal-pp-4', type: 'PRIVACY_POLICY', title: '4. Data Security', body: 'We use industry-standard encryption and security practices to protect your data. However, no method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password.', order: 4 },
    { id: 'seed-legal-pp-5', type: 'PRIVACY_POLICY', title: '5. Your Rights', body: 'You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at privacy@creatormarket.com.np.', order: 5 },
    // Terms & Conditions
    { id: 'seed-legal-tc-1', type: 'TERMS', title: '1. Acceptance of Terms', body: 'By using CreatorMarket you agree to these Terms. If you do not agree, please do not use the platform.', order: 1 },
    { id: 'seed-legal-tc-2', type: 'TERMS', title: '2. Creator Eligibility', body: 'You must be at least 18 years old to use this platform. By registering, you confirm that the information you provide is accurate.', order: 2 },
    { id: 'seed-legal-tc-3', type: 'TERMS', title: '3. Campaign Participation', body: 'When you apply for a campaign and are accepted, you agree to deliver the content as described by the deadline specified.', order: 3 },
    { id: 'seed-legal-tc-4', type: 'TERMS', title: '4. Payments & Fees', body: 'Campaign payments are processed through our escrow system. CreatorMarket charges a 10% platform fee on each completed campaign.', order: 4 },
    { id: 'seed-legal-tc-5', type: 'TERMS', title: '5. Governing Law', body: 'These Terms are governed by the laws of Nepal. Any disputes shall be resolved through arbitration in Kathmandu, Nepal.', order: 5 },
    // Community Guidelines
    { id: 'seed-legal-cg-1', type: 'GUIDELINES', icon: '✅', title: 'Be Authentic', body: 'Only promote products or services you genuinely believe in. Disclose all sponsored relationships clearly.', order: 1 },
    { id: 'seed-legal-cg-2', type: 'GUIDELINES', icon: '🤝', title: 'Respect Everyone', body: 'Treat businesses, fellow creators, and platform staff with respect. Harassment or hate speech will result in immediate account suspension.', order: 2 },
    { id: 'seed-legal-cg-3', type: 'GUIDELINES', icon: '⭐', title: 'Maintain Quality', body: "Deliver content that meets the brief's requirements. Low-quality submissions damage everyone's experience.", order: 3 },
    { id: 'seed-legal-cg-4', type: 'GUIDELINES', icon: '🚫', title: 'Prohibited Content', body: 'Do not create content with explicit material, misinformation, or anything that violates applicable laws.', order: 4 },
  ];

  await Promise.all(
    legalSections.map((s) =>
      prisma.legalSection.upsert({ where: { id: s.id }, update: {}, create: { ...s, published: true } }),
    ),
  );
  console.log(`  ✅ Legal sections: ${legalSections.length} seeded`);
}
