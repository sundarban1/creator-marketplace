import { MapPin, MessageSquare, Newspaper, Users } from 'lucide-react';
import { ContentPageLayout } from './ContentPageLayout';
import { ContentSection, BenefitGrid, ContentList } from '../components/ContentBlocks';
import { organizationSchema, webPageSchema } from '../../../lib/seo/schema';

export function FacebookCreatorsPage() {
  return (
    <ContentPageLayout
      seo={{
        title: 'Facebook Creators in Nepal | Hire Facebook Influencers',
        description: 'Find Facebook creators and page owners in Nepal on Kolab. Connect with verified Facebook influencers for paid campaigns and collaborations.',
        path: '/facebook-creators',
        keywords: ['Facebook creator Nepal', 'Facebook Nepal', 'hire Facebook influencer Nepal'],
        jsonLd: [organizationSchema(), webPageSchema({ path: '/facebook-creators', title: 'Facebook Creators in Nepal | Kolab', description: 'Find and hire verified Facebook creators and page owners in Nepal.' })],
      }}
      breadcrumb={[{ name: 'Home', path: '/' }, { name: 'Facebook Creators', path: '/facebook-creators' }]}
      icon={Users}
      eyebrow="Facebook Creators"
      heading="Hire Facebook Creators in Nepal"
      intro="Facebook is still where a huge share of Nepal's online communities actually live — local groups, city pages, and family networks that trust a familiar face more than a stranger's ad. Kolab connects brands with the Facebook creators and page owners driving those communities, for paid campaigns and collaborations across the country."
      faqs={[
        {
          question: 'Why hire a Facebook creator instead of just running Facebook ads?',
          answer: "Facebook ads reach people who don't know your brand; a Facebook creator's post reaches people who already trust the page or profile it's coming from. In Nepal, where local Facebook groups and community pages still drive a lot of buying decisions, that trust is hard to replicate with an ad alone.",
        },
        {
          question: 'What kind of Facebook creators are on Kolab?',
          answer: 'Personal-profile creators, local community and city pages, niche interest pages (food, travel, tech, and more), and small-business-adjacent pages that post regularly and have an engaged local following.',
        },
        {
          question: 'Can I filter for Facebook specifically when browsing creators?',
          answer: 'Yes — creator profiles list every platform they use, so you can filter the marketplace to creators active on Facebook, then narrow further by category and location anywhere in Nepal.',
        },
        {
          question: 'Do Facebook creators on Kolab do paid posts, or only free collaborations?',
          answer: 'Both. You can post a paid campaign with a set budget and deliverables, or a free open event where a creator covers or attends in exchange for content and exposure.',
        },
        {
          question: 'How is payment handled for a Facebook campaign?',
          answer: 'Paid campaigns use escrow-protected payments — your budget is held by Kolab and released to the creator only once you approve the completed post or deliverable.',
        },
        {
          question: 'Are Facebook creators on Kolab verified?',
          answer: "Yes. Every creator's identity is confirmed through citizenship-document verification, along with email and phone checks, before their profile is active on the marketplace.",
        },
      ]}
      related={[
        { label: 'For Content Creators', path: '/content-creators', description: 'Build your creator profile on Kolab.' },
        { label: 'YouTube Creators', path: '/youtube-creators', description: 'Browse YouTube creators in Nepal.' },
        { label: 'Creator Marketplace Nepal', path: '/creator-marketplace-nepal', description: "Kolab's full creator marketplace overview." },
        { label: 'For Brands', path: '/brands', description: 'Hire creators for your next campaign.' },
      ]}
      cta={{ heading: 'Connect with Facebook Creators in Nepal', sub: 'Download Kolab to browse profiles and post campaigns.' }}
    >
      <ContentSection heading="Facebook still runs Nepal's local conversation">
        <p>
          While newer platforms chase short-form video, Facebook remains the backbone of local community life in
          Nepal — city and neighborhood groups, alumni networks, buy-and-sell pages, and family circles that check
          Facebook out of habit more than any other app. A lot of that activity is anchored by individual creators
          and page owners who've spent years building a specific, local audience rather than a broad national one.
        </p>
        <p>
          That's exactly the kind of reach that's hard to buy with an ad and easy to underestimate: a well-run
          Facebook page in Pokhara or Biratnagar can move more local foot traffic than a generic campaign aimed at
          all of Nepal. Kolab exists to connect brands with these creators directly, instead of leaving that reach
          scattered across DMs and comment sections.
        </p>
      </ContentSection>

      <ContentSection heading="What Facebook creators bring to a campaign">
        <BenefitGrid
          items={[
            { icon: MapPin, title: 'Hyper-local reach', desc: 'City and neighborhood pages with audiences that trust local recommendations over national ads.' },
            { icon: Newspaper, title: 'Longer-format content', desc: "Facebook's format still rewards detailed posts, photo albums, and community updates that other platforms cut short." },
            { icon: Users, title: 'Community trust', desc: 'Group admins and long-running pages carry credibility built over years, not just follower counts.' },
            { icon: MessageSquare, title: 'Direct engagement', desc: 'Comments and shares on Facebook still drive real conversation — and real word-of-mouth — around a brand.' },
          ]}
        />
      </ContentSection>

      <ContentSection heading="Finding the right Facebook creator on Kolab">
        <p>
          Browse the marketplace filtered by platform, category, and location, and every Facebook-active creator
          profile shows what kind of page or presence they run — personal profile, community page, or niche content
          page — along with their category focus, whether that's food, travel, fashion, tech, or any of Kolab's
          other supported categories.
        </p>
        <ContentList
          items={[
            'Filter creator profiles to those active on Facebook alongside other platforms.',
            'Narrow by category so a Facebook post reaches an audience that already cares about your niche.',
            'Filter by city — Kathmandu, Pokhara, Lalitpur, Bhaktapur, Butwal, Biratnagar, Dharan, Chitwan, Nepalgunj, and beyond.',
            'Post a paid campaign with a clear budget and deliverable, or a free open event for creators to cover.',
            'Review proposals and message the creator directly in-app once you find the right fit.',
          ]}
        />
      </ContentSection>

      <ContentSection heading="Same protections as every campaign on Kolab">
        <p>
          A Facebook collaboration on Kolab works under the same trust layer as every other campaign on the
          platform. Creator identity is confirmed with citizenship-document verification, plus email and phone
          checks, so you know who you're actually working with. Paid campaigns are escrow-protected — your budget
          is held safely and released only once you approve the finished post — and every collaboration wraps with
          a transparent review from both sides, so a Facebook creator's track record on Kolab means something.
        </p>
      </ContentSection>
    </ContentPageLayout>
  );
}
