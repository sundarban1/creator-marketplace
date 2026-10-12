import { useLandingLanguage } from '../context/LanguageContext';
import { LogoMarquee, type LogoMarqueeItem } from '../components/LogoMarquee';
import { usePartners } from '../hooks/usePartners';
import { band } from '../lib/surfaces';
import type { PublicCreatorLite } from '../../../lib/api';

/**
 * Slim band under the hero. Shows the partner logos an admin has published
 * (admin → Partners); until there are any, it shows real creators from the
 * landing showcase (all have an avatar, filtered server-side). If that fails
 * or comes back empty too, it shows the generic creator *types* already used
 * as the marketplace fallback — never invented people or brand logos. While
 * loading, the row's height is held so nothing below jumps.
 */
export function CreatorCommunity({
  creators,
  status,
}: {
  creators: PublicCreatorLite[] | null;
  status: 'loading' | 'ready' | 'error';
}) {
  const { d } = useLandingLanguage();
  const { status: partnersStatus, partners } = usePartners();
  const c = d.creatorCommunity;

  if (partnersStatus === 'loading' || (status === 'loading' && !partners.length)) {
    return (
      <div className={`${band('navy')} py-10 sm:py-14`}>
        {/* Same footprint as the loaded row (heading + chip track). */}
        <div aria-hidden className="h-[4.5rem] sm:h-[5.25rem]" />
      </div>
    );
  }

  if (partners.length) {
    const items: LogoMarqueeItem[] = partners.map((p) => ({ id: p.id, label: p.name, imageUrl: p.logoUrl }));
    return <LogoMarquee heading={c.partnersHeading} items={items} variant="logo" className={`${band('navy')} py-10 sm:py-14`} />;
  }

  const real: LogoMarqueeItem[] = (creators ?? [])
    .filter((cr) => cr.avatarUrl && (cr.fullName || cr.username))
    .map((cr) => ({
      id: cr.id,
      label: cr.fullName || cr.username!,
      caption: cr.categories[0],
      imageUrl: cr.avatarUrl,
      verified: cr.isVerified,
    }));
  const items: LogoMarqueeItem[] = real.length
    ? real
    : d.marketplace.creators.fallback.map((f) => ({ id: f.name, label: f.name, caption: f.category }));

  return <LogoMarquee heading={c.heading} items={items} className={`${band('navy')} py-10 sm:py-14`} />;
}
