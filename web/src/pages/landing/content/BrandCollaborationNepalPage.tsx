import { ClipboardList, MessagesSquare, ScrollText, ShieldCheck, Star, Target } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

export function BrandCollaborationNepalPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Brand Collaboration Platform Nepal',
        description: "Kolab is Nepal's brand collaboration platform — connect with verified content creators, agree on deliverables, and pay securely through escrow-protected campaigns.",
        path: '/brand-collaboration-nepal',
        keywords: ['brand collaboration Nepal', 'creator collaboration', 'brand campaign Nepal', 'creator marketplace Nepal'],
        jsonLd: webPageSchema({ path: '/brand-collaboration-nepal', title: 'Brand Collaboration Platform Nepal | Kolab', description: "How brand collaborations work end to end on Kolab." }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Brand Collaboration Nepal', path: '/brand-collaboration-nepal' }]}
      icon={Target}
      eyebrow="Brand Collaboration Nepal"
      heading="How Brand Collaborations Work on Kolab"
      intro="A brand collaboration is only as good as the process behind it. Kolab structures every step — from posting a campaign to the final review — so Nepali brands and creators know exactly what to expect at each stage."
      faqs={[
        {
          question: 'What counts as a brand collaboration on Kolab?',
          answer: 'Any paid campaign or free open event a business posts, and a creator applies to and completes — from a single sponsored post to an ongoing content partnership.',
        },
        {
          question: 'How long does a typical collaboration take from posting to payment?',
          answer: "It depends on the campaign's deadline and deliverables, which the brand sets when posting. Because proposals, messaging, and approval all happen in-app, there's no added delay waiting on emails or separate payment transfers once the work is approved.",
        },
        {
          question: 'What happens if the delivered content does not match the brief?',
          answer: 'Payment is escrow-protected and only released once the brand reviews and approves the completed work, so brands and creators are expected to align on deliverables clearly during the messaging stage before work begins.',
        },
        {
          question: 'Can a collaboration involve more than one creator?',
          answer: 'Yes — a brand can post a single campaign or open event and review proposals from multiple creators, then work with as many as fit the budget and reach they need.',
        },
        {
          question: 'Is there a contract involved?',
          answer: "The campaign details — budget, deliverables, deadline — set by the brand when posting, plus the proposal a creator submits, form the terms both sides agree to when a collaboration is matched.",
        },
      ]}
      related={[
        { label: 'For Brands', path: '/brands', description: 'Post a campaign and hire verified creators.' },
        { label: 'Influencer Marketing in Nepal', path: '/influencer-marketing-nepal', description: 'A guide to running influencer campaigns in Nepal.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'Find Campaigns', path: '/find-campaigns', description: 'See how creators discover and apply to campaigns.' },
      ]}
      cta={{ heading: 'Start a Brand Collaboration Today', sub: 'Download Kolab and post your first campaign.' }}
    >
      <ContentSection heading="The collaboration process, step by step">
        <BenefitGrid
          items={[
            { icon: ClipboardList, title: '1. Post the campaign', desc: 'Set a budget, category, platform, and deadline for a paid campaign — or post a free open event instead.' },
            { icon: Target, title: '2. Review proposals', desc: 'Creators who fit the brief apply directly, so every proposal is already relevant to what you posted.' },
            { icon: MessagesSquare, title: '3. Align in messages', desc: 'Message the creator directly in-app to confirm deliverables, timeline, and any specifics before work starts.' },
            { icon: ShieldCheck, title: '4. Approve & pay via escrow', desc: 'Once the work is delivered, review it and approve — payment releases from escrow only at that point.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Why a structured process matters">
        <p>
          Most brand-creator collaborations in Nepal still happen informally — a DM, a verbal agreement on price, a
          bank transfer, and hope that the content shows up as discussed. That works fine until it doesn't: a
          creator disappears after being paid upfront, a brand delays payment after content is delivered, or neither
          side is ever quite sure what the "agreement" actually was.
        </p>
        <p>
          Structuring the collaboration doesn't mean adding bureaucracy — it means the budget, deliverables, and
          deadline are visible before anyone applies, the messaging thread that follows is tied to that specific
          campaign, and the payment only moves once both sides have something concrete to point to: approved,
          delivered work.
        </p>
      </ContentSection>

      <ContentSection heading="What a good collaboration brief includes">
        <ContentList
          items={[
            'A clear budget — either a fixed paid-campaign amount or a defined open-event exchange (product, experience, exposure).',
            'The platform the content is for — Instagram, TikTok, YouTube, Facebook, or another supported platform.',
            'The category or niche the campaign fits (fashion, food, tech, fitness, travel, and more).',
            'A realistic deadline, so creators applying already know the timeline they are committing to.',
            'Any specific deliverables — post count, format, usage rights — stated up front rather than negotiated after matching.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Trust on both sides">
        <p>
          A collaboration platform only works if both sides can trust it. On Kolab, creator identity is confirmed
          through citizenship-document verification alongside email and phone checks, paid-campaign budgets sit in
          escrow until the brand approves the finished work, and every completed collaboration — for both the brand
          and the creator — ends with a transparent review.
        </p>
        <p className="flex items-start gap-2.5">
          <Star size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>
            That review history is what makes repeat collaboration easier over time — a brand can see a creator's
            track record, and a creator can point to a real history of completed, paid work instead of screenshots
            of past posts.
          </span>
        </p>
      </ContentSection>

      <ContentSection heading="Where to start">
        <p className="flex items-start gap-2.5">
          <ScrollText size={18} className="mt-0.5 flex-shrink-0 text-violet" />
          <span>
            If you're a brand ready to post your first campaign, head to the <a href="/brands" className="font-medium text-violet hover:underline">for brands</a> page.
            If you want the broader picture of how Kolab's creator marketplace works, start with{' '}
            <a href="/creator-marketplace-nepal" className="font-medium text-violet hover:underline">Nepal's creator marketplace</a> overview.
          </span>
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
