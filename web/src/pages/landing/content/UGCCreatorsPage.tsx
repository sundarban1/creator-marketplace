import { Compass, MessageSquare, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';

const UGC_FORMATS = ['Unboxings', 'Product reviews', 'Testimonials', 'Before & after', 'Day-in-the-life', 'Tutorials & how-tos'];

export function UGCCreatorsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'UGC Creators in Nepal | Hire UGC Content Creators',
        description: 'Hire UGC creators in Nepal on Kolab. Get authentic, ad-ready reviews, unboxings, and testimonials from verified creators for your brand — no large following required.',
        path: '/ugc-creators-nepal',
        keywords: ['UGC creators Nepal', 'hire UGC creators Nepal', 'UGC content Nepal', 'user generated content Nepal', 'UGC vs influencer marketing', 'authentic content creators Nepal', 'UGC content creator Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/ugc-creators-nepal', title: 'UGC Creators in Nepal | Kolab', description: 'Hire UGC creators in Nepal on Kolab for authentic, ad-ready content.' })],
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'UGC Creators', path: '/ugc-creators-nepal' }]}
      icon={Sparkles}
      eyebrow="UGC Creators"
      heading="Hire UGC Creators in Nepal"
      intro="User-generated content — an honest unboxing, a real review, a quick testimonial — often converts better than a polished ad, precisely because it doesn't look like one. Kolab connects brands with Nepali creators who make exactly this kind of content, whether or not they have a large following of their own."
      faqs={[
        {
          question: 'What is UGC, and how is it different from influencer marketing?',
          answer: "UGC (user-generated content) is authentic, native-feeling content — reviews, unboxings, testimonials — made to be used in your own ads, website, or social channels. Influencer marketing is about reaching a creator's own audience through their account. On Kolab, the same creator profiles can do either: post a campaign asking for UGC-style deliverables if that's what you need, or a standard collaboration if you want the content to go out on the creator's own page.",
        },
        {
          question: 'Do UGC creators need a large following?',
          answer: "No. Since UGC is meant for your channels, not the creator's, follower count matters far less than content quality, delivery, and fit with your brand. This makes UGC a practical way to work with skilled creators on Kolab regardless of audience size.",
        },
        {
          question: 'How do I hire a UGC creator on Kolab?',
          answer: "Post a paid campaign describing the UGC format you need — an unboxing, a testimonial, a demo — along with your budget and any script or talking points. Creators who fit apply with a proposal, and you review profiles and pick who to work with.",
        },
        {
          question: 'Can I reuse UGC content in my own ads?',
          answer: "Usage rights aren't a fixed platform setting — agree on exactly how the content can be used (organic posting only, vs. paid ads, vs. website use) directly with the creator as part of your campaign brief before work starts, so both sides are clear upfront.",
        },
        {
          question: 'How is payment handled for UGC work?',
          answer: 'The same escrow-protected system used for every campaign on Kolab applies to UGC work — your budget is held securely and released to the creator once you approve the delivered content.',
        },
        {
          question: 'What kind of UGC content can I request?',
          answer: `Common formats brands request include ${UGC_FORMATS.slice(0, 4).join(', ')}, and more — describe the format and length you need in your campaign brief so creators can pitch accordingly.`,
        },
      ]}
      related={[
        { label: 'For Brands', path: '/brands', description: 'Post a campaign and hire creators for your next project.' },
        { label: 'Paid Collaborations', path: '/paid-collaborations-nepal', description: 'How paid campaigns and brand deals work on Kolab.' },
        { label: 'Content Creators', path: '/content-creators', description: 'For creators looking to make UGC and other paid content.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
      ]}
      cta={{ heading: 'Ready to Get Authentic Content for Your Brand?', sub: 'Download Kolab and post a UGC campaign in minutes.' }}
    >
      <ContentSection heading="Why brands in Nepal are turning to UGC">
        <p>
          Audiences have gotten good at scrolling past anything that looks like an ad. Content that looks like it
          came from a real person — a shaky unboxing, an honest opinion, a quick before-and-after — earns attention
          precisely because it doesn't feel staged. That's the core appeal of UGC: it borrows the credibility of a
          real customer's voice, even when it's commissioned and paid for.
        </p>
        <p>
          Kolab makes it possible to source that kind of content deliberately, from creators who already know how
          to make it feel native to a phone screen, instead of waiting for it to happen organically or guessing at
          who can deliver it.
        </p>
      </ContentSection>

      <ContentSection heading="What brands get from UGC creators on Kolab">
        <BenefitGrid
          items={[
            { icon: Compass, title: 'Find the right fit', desc: 'Browse creator profiles by category and location to find creators whose style suits an authentic, unscripted format.' },
            { icon: Video, title: 'Brief the exact format', desc: 'Describe the UGC format you need — unboxing, testimonial, demo — in your campaign so creators pitch accordingly.' },
            { icon: MessageSquare, title: 'Coordinate in-app', desc: 'Share scripts, talking points, and revisions directly with the creator through Kolab’s messaging, no scattered DMs.' },
            { icon: ShieldCheck, title: 'Pay with escrow protection', desc: 'Your budget is held securely and released only once you approve the delivered content.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Common UGC formats requested on Kolab">
        <p>
          Brands typically request formats like {UGC_FORMATS.join(', ')}. None of these require a creator with a
          large audience — they require someone who can deliver a believable, well-shot piece of content on a
          brief, which is exactly what a UGC-focused campaign is built to source.
        </p>
      </ContentSection>

      <ContentSection heading="How to hire a UGC creator in Nepal">
        <ContentList
          items={[
            'Create a business account on Kolab and post a paid campaign.',
            'Describe the UGC format, script or talking points, and deliverable length in your brief.',
            'Set your budget and location targeting anywhere in Nepal, and review creator proposals as they come in.',
            'Message the creator you choose to align on shot list, timing, and how the final content can be used.',
            'Approve the delivered content and release payment through Kolab’s escrow-protected system.',
            'Leave a review once the collaboration wraps up — helpful for future UGC campaigns on both sides.',
          ]}
        />
      </ContentSection>
    </ContentPageLayout>
  );
}
