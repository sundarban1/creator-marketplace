import { Banknote, Compass, Handshake, Megaphone, ShieldCheck, Users } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { webPageSchema } from '../../../lib/seo/schema';

export function PaidCollaborationsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Paid Collaborations & Brand Deals in Nepal | Kolab',
        description: 'Get paid collaborations and brand deals in Nepal on Kolab. Sponsorship opportunities and paid promotion work for TikTok, Instagram, and YouTube creators.',
        path: '/paid-collaborations-nepal',
        keywords: [
          'paid collaborations Nepal', 'brand deals Nepal', 'sponsorship opportunities Nepal', 'get brand deals Nepal',
          'earn from social media Nepal', 'influencer jobs Nepal', 'TikTok earning Nepal', 'Instagram earning Nepal',
          'YouTube sponsorship Nepal', 'paid promotion Nepal', 'creator community Nepal', 'creator network Nepal',
        ],
        jsonLd: webPageSchema({
          path: '/paid-collaborations-nepal',
          title: 'Paid Collaborations & Brand Deals in Nepal | Kolab',
          description: 'Get paid collaborations and brand deals in Nepal on Kolab.',
        }),
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Paid Collaborations', path: '/paid-collaborations-nepal' }]}
      icon={Banknote}
      eyebrow="Paid Collaborations Nepal"
      heading="Get Paid Brand Deals in Nepal"
      intro="Whether you're posting on TikTok, Instagram, YouTube, or Facebook, Kolab is where Nepali creators turn a following into real, paid work — with visible budgets, direct brand contact, and payment protected until the job is done."
      faqs={[
        {
          question: 'How do I get brand deals in Nepal?',
          answer: 'Create a creator profile on Kolab with your categories and connected platforms, then browse open paid campaigns and apply with a proposal. Brands also discover creators directly by browsing profiles, so a complete, well-categorized profile increases your chances of being approached.',
        },
        {
          question: 'How much can I earn from sponsorships on Kolab?',
          answer: 'Every paid campaign shows its budget before you apply, so earnings vary by brand and deliverables — but you always know what a collaboration pays before committing your time.',
        },
        {
          question: 'Can I get paid for TikTok, Instagram, or YouTube content specifically?',
          answer: 'Yes. Campaigns on Kolab specify which platform they need — TikTok, Instagram, YouTube, Facebook, and others — so you can filter for sponsorship opportunities that match where your audience actually is.',
        },
        {
          question: 'What if a brand doesn\'t pay after I deliver the work?',
          answer: 'Paid campaigns on Kolab use escrow — the brand\'s budget is held securely from the start and only released to you once they approve the completed work, so you\'re not left chasing payment after a deal.',
        },
        {
          question: 'Do I need a large following to land paid promotions?',
          answer: 'No strict minimum applies. Brands evaluate creators by niche, content quality, and audience fit for a specific campaign, so creators with smaller but engaged followings regularly land paid deals.',
        },
        {
          question: 'Is joining Kolab as a creator free?',
          answer: 'Yes — Kolab is a free download, and building a profile and applying to paid campaigns costs nothing.',
        },
      ]}
      related={[
        { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
        { label: 'Find Campaigns', path: '/find-campaigns', description: 'Browse open paid campaigns and free events right now.' },
        { label: 'TikTok Creators', path: '/tiktok-creators', description: 'TikTok-specific creator opportunities.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
      ]}
      cta={{ heading: 'Start Landing Paid Collaborations', sub: 'Download Kolab and build your creator profile in minutes.' }}
    >
      <ContentSection heading="Where paid collaborations actually come from">
        <p>
          Most creators in Nepal still land their first brand deal through a DM, a mutual connection, or pure luck —
          which also means most brands never see them at all. Kolab replaces that with a structured pipeline: brands
          post campaigns with a real budget attached, and creators who fit the niche, platform, and audience can
          apply directly, or get discovered by browsing their profile.
        </p>
        <p>
          That structure works in your favor. Instead of negotiating rates from scratch over DM, you see the budget
          before you apply. Instead of hoping a brand pays on time, the money is already held in escrow before the
          work even starts.
        </p>
      </ContentSection>

      <ContentSection heading="What you get as a creator on Kolab">
        <BenefitGrid
          items={[
            { icon: Compass, title: 'Get discovered', desc: 'Brands browse creator profiles by category, platform, and location — a complete profile puts you in front of relevant deals.' },
            { icon: Megaphone, title: 'See the budget upfront', desc: 'Every paid campaign lists its budget and deliverables before you apply, so there\'s no guessing or awkward rate negotiation.' },
            { icon: ShieldCheck, title: 'Escrow-protected payment', desc: 'Campaign budgets are held securely and released to you once your work is approved — payment is never dependent on a brand\'s goodwill.' },
            { icon: Handshake, title: 'Direct brand contact', desc: 'Message brands in-app once matched to align on deliverables, timelines, and creative direction — no scattered, unpaid DMs.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="How to start earning from brand deals">
        <ContentList
          items={[
            'Download Kolab and create a creator profile with your niche and connected platforms (TikTok, Instagram, YouTube, Facebook, and more).',
            'Complete identity verification so brands can trust who they\'re working with.',
            'Browse open paid campaigns and free events, filtered by category, platform, and location.',
            'Apply with a proposal to campaigns that fit your content — budgets are visible before you commit.',
            'Message the brand directly once matched, and deliver the agreed content.',
            'Get paid through escrow once the brand approves your work, and build a public review history for future deals.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Join a growing creator network">
        <p className="flex items-start gap-2.5">
          <Users size={18} className="mt-0.5 flex-shrink-0 text-brand-orange" />
          <span>
            Kolab's creator community spans every major platform and category across Nepal — the more active the
            network, the more campaigns brands post, and the more sponsorship opportunities show up for creators at
            every follower size.
          </span>
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
