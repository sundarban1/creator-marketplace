import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MapPin, Star, ExternalLink, Bookmark } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { compactNumber, totalFollowers } from '../lib/format';
import {
  getBusinessCreator,
  toggleSaveCreator,
  fetchSavedCreatorIds,
  fetchMyCampaigns,
  inviteCreators,
} from '../api/business';
import { fetchCategories } from '../api/catalog';
import { ApiError } from '../lib/apiClient';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { PlatformIcon, platformMeta } from '../ui/PlatformIcon';
import { CategoryPill } from '../public/CategoryPill';
import { makeCategoryLookup } from '../public/categoryLookup';
import { PortfolioGrid } from '../public/PortfolioGrid';

export function BusinessCreatorDetailPage() {
  const t = useT();
  const { id = '' } = useParams();
  const creator = useAsync((s) => getBusinessCreator(id, s), [id]);
  const savedIds = useAsync((s) => fetchSavedCreatorIds(s), []);
  const categories = useAsync((s) => fetchCategories(s), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories.data ?? []), [categories.data]);

  const [saved, setSaved] = useState<boolean | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [flash, setFlash] = useState('');

  const isSaved = saved ?? (savedIds.data ?? []).includes(id);

  if (creator.loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-6 w-24" />
        <div className="mt-5 flex gap-5">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2 pt-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <SkeletonText lines={4} className="mt-6" />
      </div>
    );
  }

  if (creator.error || !creator.data || creator.data.isPrivate) {
    const notFound = creator.error instanceof ApiError && creator.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant={notFound || creator.data?.isPrivate ? 'not-found' : 'error'}
          title={t('public.profileNotFoundTitle')}
          description={t('public.profileNotFoundBody')}
          action={{ label: t('biz.findTitle'), href: '/business/creators' }}
        />
      </div>
    );
  }

  const c = creator.data;
  const name = c.fullName ?? 'Creator';
  const followers = totalFollowers(c.socialAccounts);

  const onToggleSave = async () => {
    setSaved(!isSaved);
    try {
      await toggleSaveCreator(id);
    } catch {
      savedIds.reload();
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/business/creators" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {t('biz.findTitle')}
      </Link>

      {flash && <Alert tone="success" className="mt-5">{flash}</Alert>}

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar name={name} src={c.avatarUrl} size="xl" className="h-20 w-20 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">{name}</h1>
            {c.fullyVerified && <BadgeCheck size={19} className="text-brand" />}
          </div>
          {c.location && (
            <p className="mt-1 flex items-center gap-1 text-[14px] text-ink-soft">
              <MapPin size={13} />
              {c.location}
            </p>
          )}
          {c.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.categories.map((cat) => (
                <CategoryPill key={cat} label={cat} meta={categoryMeta(cat)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => setInviteOpen(true)}>{t('biz.invite')}</Button>
        <Button variant="secondary" onClick={onToggleSave}>
          <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
          {isSaved ? t('biz.saved') : t('biz.save')}
        </Button>
      </div>

      {(followers > 0 || c.stats) && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {followers > 0 && <Stat label={t('public.followers')} value={compactNumber(followers)} />}
          {c.stats && c.stats.reviewCount > 0 && (
            <Stat
              label={t('public.avgRating')}
              value={
                <span className="inline-flex items-center gap-1">
                  {c.stats.averageRating.toFixed(1)}
                  <Star size={13} className="fill-warning text-warning" />
                </span>
              }
            />
          )}
          {c.stats && c.stats.completionRate > 0 && (
            <Stat label={t('public.completionRate')} value={`${c.stats.completionRate}%`} />
          )}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title={t('public.aboutHeading')} />
        <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{c.bio || t('public.noBio')}</p>
      </Card>

      {c.socialAccounts.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={t('public.socialHeading')} />
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {c.socialAccounts.map((a) => (
              <li key={a.platform}>
                <a
                  href={a.profileUrl || undefined}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-violet/30"
                >
                  <PlatformIcon platform={a.platform} size={18} />
                  <span className="flex-1">
                    <span className="block text-[13px] font-semibold text-ink">{platformMeta(a.platform).label}</span>
                    {a.followers > 0 && (
                      <span className="text-[12px] text-ink-soft">{compactNumber(a.followers)} {t('public.followers')}</span>
                    )}
                  </span>
                  {a.profileUrl && <ExternalLink size={13} className="text-ink-soft" />}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(c.portfolioItems.length > 0 || c.portfolioLinks.length > 0) && (
        <Card className="mt-6">
          <CardHeader title={t('public.portfolioHeading')} />
          <PortfolioGrid items={c.portfolioItems} links={c.portfolioLinks} />
        </Card>
      )}

      {c.reviews.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={t('public.reviewsHeading')} />
          <ul className="space-y-3">
            {c.reviews.slice(0, 6).map((r) => (
              <Card key={r.id} as="li" className="!p-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className={i < r.rating ? 'fill-warning text-warning' : 'text-line-strong'} />
                  ))}
                </div>
                {r.comment && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{r.comment}</p>}
                {r.reviewer?.name && (
                  <p className="mt-2 text-[12px] font-medium text-ink-soft">— {r.reviewer.name}</p>
                )}
              </Card>
            ))}
          </ul>
        </Card>
      )}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        creatorId={id}
        creatorName={name}
        onSent={() => {
          setInviteOpen(false);
          setFlash(t('biz.inviteSent'));
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3.5 text-center">
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet/60 to-brand-orange/50" />
      <p className="font-serif text-[20px] font-medium leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[12px] text-ink-soft">{label}</p>
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  creatorId,
  creatorName,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  onSent: () => void;
}) {
  const t = useT();
  const campaigns = useAsync((s) => fetchMyCampaigns({ status: 'ACTIVE', limit: 50 }, s), []);
  const [campaignId, setCampaignId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const list = campaigns.data?.items ?? [];
  const selected = campaignId || list[0]?.id || '';

  return (
    <Modal open={open} onClose={onClose} title={t('biz.inviteTitle', { name: creatorName })}>
      {error && <Alert tone="error" className="mb-3">{error}</Alert>}
      {campaigns.loading ? (
        <Skeleton className="h-11 w-full" />
      ) : list.length === 0 ? (
        <EmptyState size="sm" variant="empty" title={t('biz.noEventsTitle')} action={{ label: t('biz.newEvent'), href: '/business/events/create' }} />
      ) : (
        <div className="space-y-4">
          <Select
            label={t('biz.inviteChooseEvent')}
            value={selected}
            onChange={(e) => setCampaignId(e.target.value)}
            options={list.map((c) => ({ value: c.id, label: c.title }))}
          />
          <Button
            fullWidth
            loading={busy}
            disabled={!selected}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await inviteCreators(selected, [creatorId]);
                onSent();
              } catch (err) {
                setError(err instanceof Error ? err.message : t('common.somethingWrong'));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('biz.inviteSend')}
          </Button>
        </div>
      )}
    </Modal>
  );
}
