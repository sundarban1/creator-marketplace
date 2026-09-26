import { useMemo, useState, type FormEvent } from 'react';
import { BadgeCheck, Bookmark, CheckCircle2, ExternalLink, Camera, Heart, Plus, Trash2, Sparkles, Image as ImageIcon, Link2, X, Clock } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useAppAuth } from '../auth/AppAuthContext';
import { compactNumber } from '../lib/format';
import { requestYoutubeAccessToken } from '../lib/googleAuth';
import { requestFacebookAccessToken } from '../lib/facebookAuth';
import { openOAuthPopup } from '../lib/oauthPopup';
import { fetchPlatformFlags, type PlatformFlags } from '../api/platformFlags';
import {
  fetchCreatorFullProfile,
  updateCreatorProfile,
  uploadAvatar,
  fetchSocialAccounts,
  deleteSocialAccount,
  connectYoutubeAccount,
  getTiktokAuthorizeUrl,
  getFacebookPages,
  connectFacebookPage,
  connectInstagramAccount,
  generateBio,
  fetchFavoriteBusinessIds,
  fetchMyApplications,
  fetchPortfolioItems,
  uploadPortfolioMedia,
  createPortfolioItem,
  deletePortfolioItem,
  type CreatorFullProfile,
  type CreatorSocialAccount,
  type FacebookPageOption,
} from '../api/creator';
import { fetchCategories, type Category } from '../api/catalog';
import { makeCategoryLookup } from '../public/categoryLookup';
import { CategoryPill } from '../public/CategoryPill';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { StatCard } from '../ui/StatCard';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { ImageCropModal } from '../ui/ImageCropModal';
import { PlatformIcon, platformMeta } from '../ui/PlatformIcon';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { cn } from '../ui/cn';

const CONNECTABLE_PLATFORMS = ['tiktok', 'youtube', 'instagram', 'facebook'] as const;
const MAX_NICHE = 5;

export function CreatorProfilePage() {
  const t = useT();
  const { updateUser } = useAppAuth();
  const profile = useAsync((s) => fetchCreatorFullProfile(s), []);
  const socials = useAsync((s) => fetchSocialAccounts(s), []);
  const portfolioItems = useAsync((s) => fetchPortfolioItems(s), []);
  const niches = useAsync((s) => fetchCategories(s, 'BOTH'), []);
  const applications = useAsync((s) => fetchMyApplications({ status: 'ACCEPTED', limit: 50 }, s), []);
  const favoriteBusinesses = useAsync((s) => fetchFavoriteBusinessIds(s), []);
  const completedEvents = (applications.data?.items ?? []).filter(
    (a) => a.workStatus === 'COMPLETED' && a.paymentStatus === 'RELEASED',
  ).length;

  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [socialModal, setSocialModal] = useState(false);
  const [portfolioModal, setPortfolioModal] = useState(false);
  const [nicheModal, setNicheModal] = useState(false);
  const [bioGenerating, setBioGenerating] = useState(false);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);

  const p = profile.data;
  const categoryMeta = useMemo(() => makeCategoryLookup(niches.data ?? []), [niches.data]);

  // edit form
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');

  const regenerateBio = async () => {
    setBioGenerating(true);
    setError('');
    try {
      setBio(await generateBio());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.bioGenerateFailed'));
    } finally {
      setBioGenerating(false);
    }
  };

  const openEdit = () => {
    if (!p) return;
    setFullName(p.fullName ?? '');
    setBio(p.bio ?? '');
    setLocation(p.location ?? '');
    setWebsite(p.website ?? '');
    setEditing(true);
    setError('');
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateCreatorProfile({
        fullName: fullName.trim() || undefined,
        bio: bio.trim(),
        location: location.trim() || null,
        website: website.trim() || null,
      });
      setEditing(false);
      setFlash(t('profile.saved'));
      profile.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = (file: File) => {
    setAvatarCropSrc(URL.createObjectURL(file));
  };

  const closeAvatarCrop = () => {
    if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc);
    setAvatarCropSrc(null);
  };

  const onAvatarCropped = async (blob: Blob) => {
    try {
      const { avatarUrl } = await uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      updateUser({ avatar: avatarUrl });
      profile.reload();
      setFlash(t('profile.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      closeAvatarCrop();
    }
  };

  if (profile.loading && !p) {
    return (
      <>
        <DashPageHeader title={t('profile.title')} />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </>
    );
  }

  if (profile.error || !p) {
    return (
      <EmptyState
        variant="error"
        title={t('common.somethingWrong')}
        action={{ label: t('common.retry'), onClick: profile.reload }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      {/* Identity — gradient cover band + overlapping avatar */}
      <div className="overflow-hidden rounded-3xl bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04),0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-ink/[0.04]">
        <div className="relative h-28 bg-gradient-to-br from-violet via-violet-dark to-dash-pink-dark sm:h-32">
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-dash-pink/30 blur-3xl" />
        </div>
        <div className="px-5 pb-5 sm:px-7 sm:pb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-10 flex flex-col gap-3 sm:-mt-5 sm:flex-row sm:items-end">
              <div className="relative w-fit">
                <span className="inline-flex rounded-full bg-surface p-1 shadow-sm">
                  <Avatar name={p.fullName ?? 'Creator'} src={p.avatarUrl} size="xl" className="h-20 w-20 sm:h-24 sm:w-24" />
                </span>
                <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface text-ink-soft shadow-sm ring-1 ring-ink/[0.06] hover:text-ink">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) pickAvatar(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-bold tracking-tight text-ink">{p.fullName ?? '—'}</h2>
                  {p.fullyVerified && <BadgeCheck size={17} className="text-brand" />}
                </div>
                {p.username && <p className="text-[13px] text-ink-soft">@{p.username}</p>}
                {p.location && <p className="mt-0.5 text-[13px] text-ink-soft">{p.location}</p>}
              </div>
            </div>

            <Button variant="secondary" size="sm" onClick={openEdit} className="flex-shrink-0">
              {t('profile.edit')}
            </Button>
          </div>

          <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-ink">
            {p.bio || <span className="text-ink-soft">{t('profile.noBio')}</span>}
          </p>
          {p.website && (
            <a
              href={p.website}
              target="_blank"
              rel="noreferrer nofollow"
              className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-violet-dark hover:underline"
            >
              {p.website.replace(/^https?:\/\//, '')}
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <StatCard label={t('profile.statCompleted')} compact value={applications.loading ? undefined : completedEvents} icon={CheckCircle2} />
        <StatCard label={t('profile.statFavoriteBusinesses')} compact value={favoriteBusinesses.loading ? undefined : favoriteBusinesses.data?.length ?? 0} icon={Heart} />
        <StatCard label={t('profile.statSavedByBusinesses')} compact value={p.savedByBusinessCount} icon={Bookmark} />
      </div>

      {/* My niche */}
      <DashCard className="mt-6">
        <DashCardHeader
          title={t('profile.nicheHeading')}
          action={
            <button
              onClick={() => setNicheModal(true)}
              className="text-[13px] font-semibold text-violet-dark hover:underline"
            >
              {t('profile.change')}
            </button>
          }
        />
        {p.categories.length === 0 ? (
          <p className="text-[13px] text-ink-soft">{t('profile.noNiche')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {p.categories.map((c) => (
              <CategoryPill key={c} label={c} meta={categoryMeta(c)} />
            ))}
          </div>
        )}
      </DashCard>

      {/* Social accounts */}
      <DashCard className="mt-6">
        <DashCardHeader
          title={t('profile.socialHeading')}
          action={
            <button
              onClick={() => setSocialModal(true)}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet-dark hover:underline"
            >
              <Plus size={13} />
              {t('profile.addSocial')}
            </button>
          }
        />
        {socials.loading ? (
          <Skeleton className="h-10 w-full" />
        ) : (socials.data ?? []).length === 0 ? (
          <p className="text-[13px] text-ink-soft">—</p>
        ) : (
          <ul className="space-y-2">
            {socials.data!.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-ink/[0.02] px-3 py-2.5">
                <PlatformIcon platform={s.platform} size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">{platformMeta(s.platform).label}</p>
                  <p className="truncate text-[12px] text-ink-soft">{compactNumber(s.followers)} {t('profile.followers')}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm(t('profile.confirmRemove'))) return;
                    await deleteSocialAccount(s.id);
                    socials.reload();
                  }}
                  className="rounded-lg p-1.5 text-ink-soft hover:text-danger"
                  aria-label={t('profile.remove')}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      {/* Portfolio */}
      <DashCard className="mt-6">
        <DashCardHeader
          title={t('profile.portfolioHeading')}
          action={
            <button
              onClick={() => setPortfolioModal(true)}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet-dark hover:underline"
            >
              <Plus size={13} />
              {t('profile.addPortfolio')}
            </button>
          }
        />
        {portfolioItems.loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (portfolioItems.data ?? []).length === 0 ? (
          <p className="text-[13px] text-ink-soft">—</p>
        ) : (
          <ul className="space-y-2">
            {portfolioItems.data!.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl bg-ink/[0.02] px-3 py-2.5">
                {item.mediaUrl ? (
                  <img src={item.mediaUrl} alt="" className="h-11 w-11 flex-shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-ink/[0.04] text-ink-soft">
                    <Link2 size={16} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {item.description && (
                    <p className="line-clamp-2 text-[13px] text-ink">{item.description}</p>
                  )}
                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="inline-flex max-w-full items-center gap-1 truncate text-[12.5px] font-medium text-violet-dark hover:underline"
                    >
                      {item.externalUrl.replace(/^https?:\/\//, '')}
                      <ExternalLink size={10} className="flex-shrink-0" />
                    </a>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm(t('profile.confirmRemove'))) return;
                    await deletePortfolioItem(item.id);
                    portfolioItems.reload();
                  }}
                  className="rounded-lg p-1.5 text-ink-soft hover:text-danger"
                  aria-label={t('profile.remove')}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title={t('profile.edit')} size="lg">
        <form onSubmit={saveEdit} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <TextField label={t('profile.fullName')} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Textarea
            label={t('profile.bio')}
            rows={4}
            maxLength={500}
            showCount
            placeholder={t('profile.bioPlaceholder')}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            labelAccessory={
              <button
                type="button"
                onClick={regenerateBio}
                disabled={bioGenerating}
                className="inline-flex flex-shrink-0 items-center gap-1 text-[12.5px] font-semibold text-violet-dark hover:underline disabled:opacity-50"
              >
                <Sparkles size={12} />
                {bioGenerating ? t('profile.regenerating') : t('profile.regenerate')}
              </button>
            }
          />
          <div className="w-full">
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">{t('profile.location')}</label>
            <LocationAutocomplete value={location} onChange={setLocation} placeholder={t('profile.location')} />
          </div>
          <TextField
            label={t('profile.website')}
            type="url"
            placeholder="https://"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {t('profile.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConnectSocialModal
        open={socialModal}
        accounts={socials.data ?? []}
        onClose={() => setSocialModal(false)}
        onChange={() => socials.reload()}
      />
      <AddPortfolioModal
        open={portfolioModal}
        onClose={() => setPortfolioModal(false)}
        onDone={() => {
          setPortfolioModal(false);
          portfolioItems.reload();
        }}
      />
      <NicheModal
        open={nicheModal}
        current={p.categories}
        categories={niches.data ?? []}
        loading={niches.loading}
        onClose={() => setNicheModal(false)}
        onDone={() => {
          setNicheModal(false);
          profile.reload();
        }}
      />
      <ImageCropModal
        open={!!avatarCropSrc}
        imageSrc={avatarCropSrc}
        aspect={1}
        cropShape="round"
        title={t('profile.cropTitle')}
        onCancel={closeAvatarCrop}
        onConfirm={onAvatarCropped}
      />
    </div>
  );
}

type ConnectablePlatform = (typeof CONNECTABLE_PLATFORMS)[number];
type PagePickerMode = 'facebook' | 'instagram';

/**
 * Mirrors mobile's settings.tsx renderSocialAccounts() — one row per platform
 * (icon + name + follower count/hint on the left, Connect/disconnect on the
 * right) instead of the old manual URL+followers entry form. Connecting pulls
 * the profile link and live follower/subscriber count straight from each
 * platform via OAuth; see lib/googleAuth.ts, lib/facebookAuth.ts and
 * lib/oauthPopup.ts for the three underlying flows (Google token client,
 * Facebook JS SDK, and a backend-mediated popup redirect for TikTok).
 */
function ConnectSocialModal({
  open,
  accounts,
  onClose,
  onChange,
}: {
  open: boolean;
  accounts: CreatorSocialAccount[];
  onClose: () => void;
  onChange: () => void;
}) {
  const t = useT();
  const [connecting, setConnecting] = useState<ConnectablePlatform | null>(null);
  const [error, setError] = useState('');
  const [pagePicker, setPagePicker] = useState<{
    mode: PagePickerMode;
    accessToken: string;
    pages: FacebookPageOption[];
  } | null>(null);
  // Per-platform admin switches (Settings → Social Accounts) — same flags
  // mobile reads via PlatformSettingsContext. Re-fetched (uncached) every
  // time this modal opens, so an admin-side change is picked up without a
  // full page reload. Fails open (true) so a flags-fetch hiccup never
  // blocks connecting.
  const platformFlags = useAsync((s) => fetchPlatformFlags(s), [open]);
  const SOCIAL_ENABLED_FLAG: Record<ConnectablePlatform, keyof PlatformFlags> = {
    tiktok: 'socialAccountsTiktokEnabled',
    facebook: 'socialAccountsFacebookEnabled',
    instagram: 'socialAccountsInstagramEnabled',
    youtube: 'socialAccountsYoutubeEnabled',
  };
  const isSocialPlatformEnabled = (id: ConnectablePlatform) =>
    (platformFlags.data?.[SOCIAL_ENABLED_FLAG[id]] ?? true) as boolean;
  const anySocialPlatformEnabled = CONNECTABLE_PLATFORMS.some(isSocialPlatformEnabled);

  const byPlatform = new Map(accounts.map((a) => [a.platform, a]));

  const finishFacebook = async (accessToken: string, pageId: string) => {
    setConnecting('facebook');
    setError('');
    try {
      await connectFacebookPage(accessToken, pageId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setConnecting(null);
      setPagePicker(null);
    }
  };

  const finishInstagram = async (accessToken: string, pageId: string) => {
    setConnecting('instagram');
    setError('');
    try {
      await connectInstagramAccount(accessToken, pageId);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setConnecting(null);
      setPagePicker(null);
    }
  };

  const connectYoutube = async () => {
    setConnecting('youtube');
    setError('');
    try {
      const accessToken = await requestYoutubeAccessToken();
      await connectYoutubeAccount(accessToken);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setConnecting(null);
    }
  };

  const connectTiktok = async () => {
    setConnecting('tiktok');
    setError('');
    try {
      const url = await getTiktokAuthorizeUrl();
      const result = await openOAuthPopup(url, 'tiktok');
      if (result.success) onChange();
      else setError(result.error ?? t('common.somethingWrong'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setConnecting(null);
    }
  };

  // Facebook only exposes follower counts for Pages (never personal profiles), and an
  // Instagram Business account's stats are only reachable via the Facebook Page it's
  // linked to — so both buttons share this one Facebook login + Page-listing step, and
  // just differ in which pages qualify and which fields get saved.
  const connectViaFacebook = async (mode: PagePickerMode) => {
    setConnecting(mode);
    setError('');
    try {
      const accessToken = await requestFacebookAccessToken(['pages_show_list', 'pages_read_engagement', 'instagram_basic']);
      const pages = await getFacebookPages(accessToken);
      const qualifying = mode === 'instagram' ? pages.filter((p) => p.hasInstagram) : pages;
      if (qualifying.length === 0) {
        setError(mode === 'instagram' ? t('profile.noInstagramPages') : t('profile.noFacebookPages'));
        setConnecting(null);
        return;
      }
      if (qualifying.length === 1) {
        if (mode === 'facebook') await finishFacebook(accessToken, qualifying[0].id);
        else await finishInstagram(accessToken, qualifying[0].id);
        return;
      }
      setPagePicker({ mode, accessToken, pages: qualifying });
      setConnecting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
      setConnecting(null);
    }
  };

  // Instagram business stats are only reachable via a linked Facebook Page
  // (see comment on connectViaFacebook above), so it shares that flow too.
  const CONNECT_HANDLERS: Record<ConnectablePlatform, () => void> = {
    tiktok: () => void connectTiktok(),
    youtube: () => void connectYoutube(),
    instagram: () => void connectViaFacebook('instagram'),
    facebook: () => void connectViaFacebook('facebook'),
  };

  const disconnect = async (id: string) => {
    if (!window.confirm(t('profile.confirmRemove'))) return;
    await deleteSocialAccount(id);
    onChange();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('profile.connectAccounts')}
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <ul className="space-y-2">
          {CONNECTABLE_PLATFORMS.map((id) => {
            const acct = byPlatform.get(id);
            const meta = platformMeta(id);
            return (
              <li key={id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                <span
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${meta.color}18` }}
                >
                  <PlatformIcon platform={id} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">{meta.label}</p>
                  {acct ? (
                    <p className="truncate text-[12px] text-ink-soft">
                      {id === 'tiktok' && acct.followers === 0
                        ? t('profile.connected')
                        : `${compactNumber(acct.followers)} ${t('profile.followers')}`}
                    </p>
                  ) : isSocialPlatformEnabled(id) ? (
                    <p className="truncate text-[12px] text-ink-soft">{t('profile.connectHint')}</p>
                  ) : null}
                </div>
                {acct ? (
                  <button
                    onClick={() => disconnect(acct.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-ink-soft hover:text-danger"
                    aria-label={t('profile.remove')}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-shrink-0"
                    onClick={CONNECT_HANDLERS[id]}
                    disabled={!isSocialPlatformEnabled(id)}
                  >
                    {t('profile.connectBtn')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {!anySocialPlatformEnabled && (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-5 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Clock size={16} />
            </span>
            <p className="text-[13px] font-semibold text-ink">{t('profile.socialComingSoonTitle')}</p>
            <p className="text-[12px] text-ink-soft">{t('profile.socialComingSoonSub')}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>

      <Modal
        open={!!pagePicker}
        onClose={() => setPagePicker(null)}
        title={pagePicker?.mode === 'instagram' ? t('profile.pickInstagramPage') : t('profile.pickFacebookPage')}
      >
        <ul className="divide-y divide-line">
          {pagePicker?.pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                disabled={connecting !== null}
                onClick={() => {
                  if (!pagePicker) return;
                  if (pagePicker.mode === 'facebook') void finishFacebook(pagePicker.accessToken, page.id);
                  else void finishInstagram(pagePicker.accessToken, page.id);
                }}
                className="flex w-full items-center justify-between py-3 text-left disabled:opacity-50"
              >
                <span className="text-[13px] font-semibold text-ink">
                  {pagePicker.mode === 'instagram' ? `@${page.instagramUsername ?? page.name}` : page.name}
                </span>
                {pagePicker.mode === 'facebook' && (
                  <span className="text-[12px] text-ink-soft">
                    {compactNumber(page.fanCount)} {t('profile.followers')}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </Modal>
  );
}

type PortfolioTab = 'photo' | 'link';

/** Photo OR link + description — same shape as the mobile portfolio-item form. */
function AddPortfolioModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<PortfolioTab>('photo');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Reset the form each time the modal is (re)opened for a fresh add — this
  // component stays mounted across opens, so the reset happens during render
  // (React's documented pattern for "adjust state on prop change") rather
  // than in an effect, which would cause an extra render pass.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab('photo');
      setMediaUrl('');
      setExternalUrl('');
      setDescription('');
      setError('');
    }
  }

  const onPickFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const { imageUrl } = await uploadPortfolioMedia(file);
      setMediaUrl(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mediaUrl && !externalUrl.trim()) {
      setError(t('profile.portfolioPhotoOrLinkRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createPortfolioItem({
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaUrl ? 'IMAGE' : undefined,
        externalUrl: externalUrl.trim() || undefined,
        description: description.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('profile.addPortfolio')}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex gap-2">
          {(['photo', 'link'] as const).map((tb) => (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-medium',
                tab === tb ? 'border-violet/40 bg-violet/[0.06] text-violet-dark' : 'border-line-strong text-ink-soft',
              )}
            >
              {tb === 'photo' ? <ImageIcon size={14} /> : <Link2 size={14} />}
              {tb === 'photo' ? t('profile.portfolioPhoto') : t('profile.portfolioLink')}
            </button>
          ))}
        </div>

        {tab === 'photo' ? (
          <div>
            {mediaUrl ? (
              <div className="relative w-fit">
                <img src={mediaUrl} alt="" className="h-32 w-32 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-sm hover:text-danger"
                  aria-label={t('profile.remove')}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong text-ink-soft hover:border-violet/40 hover:text-violet-dark">
                {uploading ? (
                  <span className="text-[12px]">{t('profile.uploading')}</span>
                ) : (
                  <>
                    <ImageIcon size={20} />
                    <span className="text-[12px]">{t('profile.portfolioMediaHint')}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        ) : (
          <TextField
            label={t('profile.portfolioLink')}
            type="url"
            placeholder={t('profile.portfolioLinkPlaceholder')}
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
          />
        )}

        <Textarea
          label={t('profile.portfolioDescription')}
          rows={3}
          maxLength={1000}
          placeholder={t('profile.portfolioDescriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={busy} disabled={uploading}>
            {t('profile.addPortfolio')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function NicheModal({
  open,
  current,
  categories,
  loading,
  onClose,
  onDone,
}: {
  open: boolean;
  current: string[];
  categories: Category[];
  loading: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState<string[]>(current);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories), [categories]);

  // Same render-time reset pattern as AddPortfolioModal above.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(current);
      setError('');
    }
  }

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : prev.length >= MAX_NICHE ? prev : [...prev, name],
    );
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updateCreatorProfile({ categories: selected });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  // "Other" is a catch-all — keep it pinned last in the picker like everywhere else.
  const sorted = [...categories].sort((a, b) =>
    a.name === 'Other' ? 1 : b.name === 'Other' ? -1 : 0,
  );

  return (
    <Modal open={open} onClose={onClose} title={t('profile.selectNiche')}>
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-[13px] text-ink-soft">
          {t('profile.selectUpTo', { max: MAX_NICHE })} · {selected.length}/{MAX_NICHE}
        </p>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {sorted.map((c) => {
              const isSelected = selected.includes(c.name);
              const disabled = !isSelected && selected.length >= MAX_NICHE;
              const { Icon, color } = categoryMeta(c.name);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(c.name)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
                    disabled && !isSelected ? 'cursor-not-allowed opacity-40' : '',
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: `${color}14`, borderColor: `${color}55`, color }
                      : { borderColor: 'var(--color-line-strong)' }
                  }
                >
                  <Icon size={13} style={{ color: isSelected ? color : undefined }} className={isSelected ? '' : 'text-ink-soft'} />
                  <span className={isSelected ? '' : 'text-ink-soft'}>{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={save} loading={busy}>
            {t('profile.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export type { CreatorFullProfile };
