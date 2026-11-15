// DRAFT Community Guidelines sections for UGC safety (Apple Guideline 1.2).
//
// Creates the sections as UNPUBLISHED (published: false). Nothing appears in
// the apps until a Kolab admin reviews the wording in Admin → Legal →
// Guidelines and publishes it. Re-running never overwrites text an admin has
// already edited — existing rows are left untouched (create-only).
//
// Usage: npx tsx prisma/seed-safety-guidelines.ts   (or: npm run db:seed:safety-guidelines)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SECTIONS: Array<{ id: string; icon: string; title: string; body: string; order: number }> = [
  {
    id: 'draft-cg-safety-1', icon: '🛑', order: 10, title: 'What is not allowed on Kolab',
    body: [
      'To keep Kolab safe for creators and businesses, the following are not allowed anywhere on Kolab — profiles, events, competitions, portfolio items, submissions, reviews or chat:',
      '• Harassment, bullying, threats or intimidation',
      '• Hate speech or discrimination based on caste, ethnicity, religion, gender, sexual orientation, disability, region or language',
      '• Sexually explicit or sexually exploitative content, and non-consensual intimate imagery',
      '• Violent or graphic content, or content that encourages violence or self-harm',
      '• Any content that sexualises, endangers or exploits minors',
      '• Fraud, scams, impersonation or fake accounts',
      '• Spam and misleading content, including fake engagement or deceptive offers',
      '• Content that infringes someone else’s copyright, trademark or other rights',
      '• Anything illegal under the laws of Nepal',
      'Kolab is for adults (see the age requirement in the Terms of Use). Content must be suitable for the app’s age rating — Kolab does not offer a mature-content section.',
    ].join('\n'),
  },
  {
    id: 'draft-cg-safety-2', icon: '🚩', order: 11, title: 'How to report content',
    body: 'Tap the ⋯ (more) button on a profile, event, competition or portfolio item and choose Report, or long-press a chat message and choose Report. Pick a reason and add any details. Reports are confidential: the person you report is never told who reported them. Every report goes to Kolab’s moderation team.',
  },
  {
    id: 'draft-cg-safety-3', icon: '⛔', order: 12, title: 'How to block someone',
    body: 'Tap ⋯ on their profile or in your chat with them and choose Block user. Blocking takes effect immediately: you stop seeing their content, and neither of you can message the other. They are not notified. You can unblock anyone from Settings → Help & Safety → Blocked users. Blocking does not cancel existing agreements or payments.',
  },
  {
    id: 'draft-cg-safety-4', icon: '🛡️', order: 13, title: 'How Kolab reviews reports',
    body: 'A Kolab moderator reviews every report against these Guidelines and decides whether a violation happened. A report on its own is not proof — we look at the content and its context. If we find a violation we may remove the content, send a warning, restrict messaging, or temporarily or permanently suspend the account. We may also check content automatically before it is published and hold or reject content that clearly breaks these rules. Where appropriate we let the reporter know the outcome, without sharing private details.',
  },
  {
    id: 'draft-cg-safety-5', icon: '✉️', order: 14, title: 'Contact us and appeals',
    body: 'For abuse, harassment, safety concerns or questions about these Guidelines, email info@kolab.com.np or visit https://kolab.com.np/. If we removed your content or restricted your account and you believe it was a mistake, reply to our notice or email info@kolab.com.np with the details and we will review it. If someone is in immediate danger, contact local emergency services first.',
  },
];

async function main() {
  let created = 0;
  for (const s of SECTIONS) {
    const exists = await prisma.legalSection.findUnique({ where: { id: s.id }, select: { id: true } });
    if (exists) continue;
    await prisma.legalSection.create({ data: { ...s, type: 'GUIDELINES', published: false } });
    created++;
  }
  console.log(`Safety guidelines: ${created} draft section(s) created (unpublished — review & publish in Admin → Legal).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
