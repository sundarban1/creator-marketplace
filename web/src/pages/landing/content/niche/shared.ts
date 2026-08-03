import { Compass, Handshake, MessageSquare, ShieldCheck } from 'lucide-react';
import type { BenefitItem } from '../../components/ContentBlocks';
import type { FAQItem } from '../../components/FAQAccordion';
import type { RelatedLink } from '../ContentPageLayout';

// Parametrized building blocks reused across the industry/city niche pages
// (see NichePage.tsx) — the brand-facing mechanics of Kolab (discover,
// message, pay via escrow) are identical regardless of niche, so only the
// wording plugs in the niche label rather than being rewritten per page.

export function defaultBenefits(label: string): BenefitItem[] {
  return [
    { icon: Compass, title: 'Discover by niche & location', desc: `Filter creator profiles by category and city to find ${label} who already make content close to your brief.` },
    { icon: Handshake, title: 'Post a campaign or event', desc: 'Set a budget and deliverables for a paid campaign, or offer a free open event in exchange for content and exposure.' },
    { icon: MessageSquare, title: 'Message directly', desc: 'Once a creator applies, align on the brief, timeline, and creative direction in-app — no scattered DMs.' },
    { icon: ShieldCheck, title: 'Pay with escrow protection', desc: 'Campaign budgets are held in escrow and released once you approve the finished work.' },
  ];
}

export function defaultSteps(label: string): string[] {
  return [
    'Create a business account on Kolab and post a paid campaign or a free open event.',
    `Set your category, platform, budget or offer, and target ${label} anywhere in Nepal.`,
    'Browse creator profiles directly, or review the proposals creators submit to your campaign.',
    'Message shortlisted creators in-app to align on the brief, deliverables, and timeline.',
    'Approve the finished content and release payment through Kolab’s escrow-protected system.',
    'Leave a review once the collaboration wraps up, building a track record for future campaigns.',
  ];
}

export function defaultFaqs(label: string, extra: FAQItem[] = []): FAQItem[] {
  return [
    {
      question: `How do I find ${label} on Kolab?`,
      answer: `Browse creator profiles on Kolab and filter by category, platform, and location to find ${label}. Each profile shows the creator’s niche and connected platforms so you can judge fit before reaching out or posting a campaign.`,
    },
    ...extra,
    {
      question: 'Are creators on Kolab verified?',
      answer: 'Creator accounts go through identity verification, including citizenship-document checks alongside email and phone verification, so businesses know they’re dealing with a real, verifiable creator before collaborating.',
    },
    {
      question: 'How does payment work?',
      answer: 'Paid campaigns use escrow-protected payments — the budget you set is held securely and released to the creator once you approve the completed work, so neither side is left waiting or exposed.',
    },
    {
      question: 'Is Kolab free to use?',
      answer: 'Kolab is a free download on iOS and Android. Creators build a profile and apply to campaigns at no cost. Businesses create an account and set their own campaign budgets when posting a paid campaign or open event.',
    },
  ];
}

export const CORE_RELATED: RelatedLink[] = [
  { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
  { label: 'For Brands', path: '/brands', description: 'Post campaigns and hire verified creators across Nepal.' },
  { label: 'For Content Creators', path: '/content-creators', description: 'Build a profile and apply to paid campaigns.' },
  { label: 'Browse Influencers', path: '/influencers', description: 'See how Kolab connects businesses with Nepali influencers.' },
];
