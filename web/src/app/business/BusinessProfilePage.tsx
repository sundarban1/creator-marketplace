import { useMemo, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Bookmark,
  Camera,
  CalendarDays,
  Clock,
  Globe,
  Heart,
  Mail,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useAppAuth } from '../auth/AppAuthContext';
import { isPhonePlaceholderEmail } from '../lib/identity';
import { useToast } from '../ui/Toast';
import { compactNumber } from '../lib/format';
import { requestYoutubeAccessToken } from '../lib/googleAuth';
import { requestFacebookAccessToken } from '../lib/facebookAuth';
import { openOAuthPopup } from '../lib/oauthPopup';
import { fetchPlatformFlags, type PlatformFlags } from '../api/platformFlags';
import {
  fetchBusinessProfile,
  updateBusinessProfile,
  uploadBusinessLogo,
  uploadBusinessCover,
  fetchMyCampaigns,
  fetchSavedCreatorIds,
  fetchBusinessSocialAccounts,
  deleteBusinessSocialAccount,
  connectBusinessYoutubeAccount,
  getBusinessTiktokAuthorizeUrl,
  getBusinessFacebookPages,
  connectBusinessFacebookPage,
  connectBusinessInstagramAccount,
  type BusinessSocialAccount,
} from '../api/business';
import type { FacebookPageOption } from '../api/creator';
import { fetchCategories, type Category } from '../api/catalog';
import { makeCategoryLookup } from '../public/categoryLookup';
import { CategoryPill } from '../public/CategoryPill';
import { RingAvatar, LinkRow } from '../public/detailKit';
import { LocationAutocomplete } from '../public/LocationAutocomplete';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { ImageCropModal } from '../ui/ImageCropModal';
import { PlatformIcon, platformMeta } from '../ui/PlatformIcon';

const MAX_INDUSTRIES = 5;
const CONNECTABLE_PLATFORMS = ['tiktok', 'youtube', 'instagram', 'facebook'] as const;

/** Same copy generator as the mobile edit-profile screen — keeps the "Regenerate"
 * button producing identical text on both platforms. */
function generateBusinessDescription(name: string, cats: string[]): string {
  if (cats.length === 0) return '';
  const catStr =
    cats.length === 1 ? cats[0] : cats.slice(0, -1).join(', ') + ' and ' + cats[cats.length - 1];
  const catLower = catStr.toLowerCase();
  const brandName = name.trim() || 'We';
  return `${brandName} is a ${catStr} business passionate about delivering quality products and experiences that make a real difference for our customers.\n\nWe love partnering with creators who share our values and help us connect with the right audience through authentic, engaging content. If you create content around ${catLower}, we would love to collaborate with you!`;
}

export function BusinessProfilePage() {
  const t = useT();
  const toast = useToast();
  const { user, updateUser } = useAppAuth();
  const profile = useAsync((s) => fetchBusinessProfile(s), []);
  const categories = useAsync((s) => fetchCategories(s, 'BUSINESS'), []);
  const campaigns = useAsync((s) => fetchMyCampaigns({ limit: 100 }, s), []);
  const savedCreators = useAsync((s) => fetchSavedCreatorIds(s), []);
  const socials = useAsync((s) => fetchBusinessSocialAccounts(s), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories.data ?? []), [categories.data]);
  const p = profile.data;

  const [editing, setEditing] = useState(false);
  const [socialModal, setSocialModal] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState<string | null>(null);
  const [coverCropSrc, setCoverCropSrc] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [about, setAbout] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');

  const openEdit = () => {
    if (!p) return;
    setBusinessName(p.businessName ?? '');
    setAbout(p.description ?? '');
    setWebsite(p.website ?? '');
    setLocation(p.location ?? '');
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateBusinessProfile({
        businessName: businessName.trim() || undefined,
        description: about.trim() || null,
        website: website.trim() || null,
        location: location.trim() || null,
      });
      setEditing(false);
      toast.success(t('profile.saved'));
      profile.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSaving(false);
    }
  };

  const pickLogo = (file: File) => setLogoCropSrc(URL.createObjectURL(file));
  const closeLogoCrop = () => {
    if (logoCropSrc) URL.revokeObjectURL(logoCropSrc);
    setLogoCropSrc(null);
  };
  const onLogoCropped = async (blob: Blob) => {
    setLogoUploading(true);
    try {
      const { logoUrl } = await uploadBusinessLogo(new File([blob], 'logo.jpg', { type: 'image/jpeg' }));
      updateUser({ avatar: logoUrl });
      profile.reload();
      toast.success(t('profile.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profile.uploadFailed'));
    } finally {
      setLogoUploading(false);
      closeLogoCrop();
    }
  };

  const pickCover = (file: File) => setCoverCropSrc(URL.createObjectURL(file));
  const closeCoverCrop = () => {
    if (coverCropSrc) URL.revokeObjectURL(coverCropSrc);
    setCoverCropSrc(null);
  };
  const onCoverCropped = async (blob: Blob) => {
    setCoverUploading(true);
    try {
      await uploadBusinessCover(new File([blob], 'cover.jpg', { type: 'image/jpeg' }));
      profile.reload();
      toast.success(t('profile.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('profile.uploadFailed'));
    } finally {
      setCoverUploading(false);
      closeCoverCrop();
    }
  };

  if (profile.loading && !p) {
    return (
      <>
        <PageHeader title={t('biz.profileTitle')} />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="mt-5 h-32 w-full rounded-2xl" />
      </>
    );
  }
  if (profile.error || !p) {
    return <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: profile.reload }} />;
  }

  const activeEvents = (campaigns.data?.items ?? []).filter((c) => c.status === 'ACTIVE').length;
  const catList = p.categories ?? [];

  return (
    <div>
      <PageHeader title={t('biz.profileTitle')} />

      {/* Identity — cover band + overlapping ringed avatar, editorial style */}
      <Card padded={false} className="overflow-hidden">
        <div className="relative h-32 sm:h-40">
          {p.coverImageUrl ? (
            <img src={p.coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-violet via-violet-dark to-dash-pink-dark">
              <span aria-hidden className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-brand-orange/25 blur-3xl" />
              <span aria-hidden className="pointer-events-none absolute -bottom-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </div>
          )}
          <label
            className={`absolute right-4 top-4 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50 ${coverUploading ? 'pointer-events-none opacity-70' : ''}`}
            aria-label={t('biz.changeCoverPhoto')}
          >
            {coverUploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            ) : (
              <Camera size={15} />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              disabled={coverUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickCover(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        <div className="px-5 pb-5 sm:px-7 sm:pb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="-mt-10 flex flex-col gap-3 sm:-mt-12 sm:flex-row sm:items-end">
              <div className="relative w-fit">
                <RingAvatar>
                  <Avatar name={p.businessName ?? 'Business'} src={p.logoUrl} size="xl" className="h-20 w-20 sm:h-24 sm:w-24" />
                </RingAvatar>
                <label
                  className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-sm hover:text-ink ${logoUploading ? 'pointer-events-none opacity-70' : ''}`}
                  aria-label={t('biz.changeLogo')}
                >
                  {logoUploading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-soft border-t-transparent" aria-hidden />
                  ) : (
                    <Camera size={14} />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    disabled={logoUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) pickLogo(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">{p.businessName ?? '—'}</h2>
                  {p.fullyVerified && <BadgeCheck size={18} className="flex-shrink-0 text-brand" aria-label={t('profile.verified')} />}
                </div>
                {p.location && <p className="mt-0.5 text-[13px] text-ink-soft">{p.location}</p>}
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <Button variant="secondary" size="sm" onClick={openEdit}>{t('profile.edit')}</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <StatCard label={t('biz.activeEvents')} compact value={campaigns.loading ? undefined : activeEvents} icon={CalendarDays} />
        <StatCard label={t('biz.statSavedCreators')} compact value={savedCreators.loading ? undefined : (savedCreators.data ?? []).length} icon={Bookmark} />
        <StatCard label={t('biz.statFavoritedBy')} compact value={p.favoritedByCount} icon={Heart} />
      </div>

      {/* Details — a 2-column grid once there's room (matches the Dashboard /
          Find Creators pages' full-width layout), single column on mobile. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* About */}
        <Card accent>
          <CardHeader
            title={t('biz.about')}
            action={p.description ? (
              <button onClick={openEdit} className="text-[13px] font-semibold text-violet-dark hover:underline">
                {t('common.edit')}
              </button>
            ) : undefined}
          />
          {p.description ? (
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{p.description}</p>
          ) : (
            <AddFieldButton label={t('biz.addDescription')} onClick={openEdit} />
          )}
        </Card>

        {/* Contact */}
        <Card accent>
          <CardHeader title={t('biz.contactHeading')} />
          <div className="space-y-2">
            {user?.email && !isPhonePlaceholderEmail(user.email) && <InfoRow icon={Mail}>{user.email}</InfoRow>}
            {(p.phone ?? user?.phone) && <InfoRow icon={Phone}>{p.phone ?? user?.phone}</InfoRow>}
          </div>
        </Card>

        {/* Website */}
        <Card accent>
          <CardHeader
            title={t('biz.website')}
            action={p.website ? (
              <button onClick={openEdit} className="text-[13px] font-semibold text-violet-dark hover:underline">
                {t('common.edit')}
              </button>
            ) : undefined}
          />
          {p.website ? (
            <LinkRow href={p.website}>
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                <Globe size={14} className="flex-shrink-0 text-ink-soft" />
                {p.website.replace(/^https?:\/\//, '')}
              </span>
            </LinkRow>
          ) : (
            <AddFieldButton label={t('biz.addWebsite')} onClick={openEdit} />
          )}
        </Card>

        {/* Industries */}
        <Card accent>
          <CardHeader
            title={t('biz.industriesHeading')}
            action={catList.length > 0 ? (
              <button onClick={() => setIndustriesOpen(true)} className="text-[13px] font-semibold text-violet-dark hover:underline">
                {t('profile.change')}
              </button>
            ) : undefined}
          />
          {catList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {catList.map((c) => (
                <CategoryPill key={c} label={c} meta={categoryMeta(c)} />
              ))}
            </div>
          ) : (
            <AddFieldButton label={t('biz.addIndustries')} onClick={() => setIndustriesOpen(true)} />
          )}
        </Card>

        {/* Social accounts */}
        <Card accent>
          <CardHeader
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
            <AddFieldButton label={t('profile.addSocial')} onClick={() => setSocialModal(true)} />
          ) : (
            <ul className="space-y-2">
              {socials.data!.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-xl bg-black/[0.02] px-3 py-2.5">
                  <PlatformIcon platform={s.platform} size={18} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink">{platformMeta(s.platform).label}</p>
                    <p className="truncate text-[12px] text-ink-soft">{compactNumber(s.followers)} {t('profile.followers')}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(t('profile.confirmRemove'))) return;
                      await deleteBusinessSocialAccount(s.id);
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
        </Card>
      </div>

      <ConnectSocialModal
        open={socialModal}
        accounts={socials.data ?? []}
        onClose={() => setSocialModal(false)}
        onChange={() => socials.reload()}
      />

      {/* Edit profile modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title={t('profile.edit')} size="lg">
        <form onSubmit={save} className="space-y-4">
          <TextField label={t('biz.businessName')} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <Textarea
            label={t('biz.about')}
            rows={5}
            maxLength={600}
            showCount
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            labelAccessory={
              catList.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setAbout(generateBusinessDescription(businessName, catList))}
                  className="text-[12.5px] font-semibold text-violet-dark hover:underline"
                >
                  {t('profile.regenerate')}
                </button>
              ) : undefined
            }
          />
          <TextField label={t('biz.website')} type="url" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <div className="w-full">
            <label className="mb-1.5 block text-[13px] font-semibold text-ink">{t('biz.location')}</label>
            <LocationAutocomplete value={location} onChange={setLocation} placeholder={t('biz.location')} />
          </div>
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

      <IndustriesModal
        open={industriesOpen}
        current={catList}
        categories={categories.data ?? []}
        loading={categories.loading}
        onClose={() => setIndustriesOpen(false)}
        onDone={() => {
          setIndustriesOpen(false);
          profile.reload();
        }}
      />
      <ImageCropModal
        open={!!logoCropSrc}
        imageSrc={logoCropSrc}
        aspect={1}
        cropShape="round"
        title={t('profile.cropTitle')}
        onCancel={closeLogoCrop}
        onConfirm={onLogoCropped}
      />
      <ImageCropModal
        open={!!coverCropSrc}
        imageSrc={coverCropSrc}
        aspect={3}
        cropShape="rect"
        title={t('biz.cropCoverTitle')}
        onCancel={closeCoverCrop}
        onConfirm={onCoverCropped}
      />
    </div>
  );
}

function AddFieldButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center rounded-xl border border-dashed border-line-strong px-4 py-3 text-[13px] font-medium text-ink-soft transition-colors hover:border-violet/40 hover:text-violet-dark"
    >
      {label}
    </button>
  );
}

function InfoRow({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-dim/50 px-4 py-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet/10 text-violet-dark">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{children}</span>
    </div>
  );
}

function IndustriesModal({
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
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(current);
  const [busy, setBusy] = useState(false);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories), [categories]);

  // Reset the selection each time the modal (re)opens — same render-time
  // pattern as CreatorProfilePage's NicheModal.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(current);
  }

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : prev.length >= MAX_INDUSTRIES ? prev : [...prev, name],
    );
  };

  const save = async () => {
    setBusy(true);
    try {
      await updateBusinessProfile({ categories: selected });
      toast.success(t('profile.saved'));
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  // "Other" is a catch-all — keep it pinned last, matching the mobile picker.
  const sorted = [...categories].sort((a, b) => (a.name === 'Other' ? 1 : b.name === 'Other' ? -1 : 0));

  return (
    <Modal open={open} onClose={onClose} title={t('biz.selectIndustries')}>
      <div className="space-y-4">
        <p className="text-[13px] text-ink-soft">
          {t('profile.selectUpTo', { max: MAX_INDUSTRIES })} · {selected.length}/{MAX_INDUSTRIES}
        </p>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {sorted.map((c) => {
              const isSelected = selected.includes(c.name);
              const disabled = !isSelected && selected.length >= MAX_INDUSTRIES;
              const { Icon, color } = categoryMeta(c.name);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(c.name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${disabled && !isSelected ? 'cursor-not-allowed opacity-40' : ''}`}
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

type ConnectablePlatform = (typeof CONNECTABLE_PLATFORMS)[number];
type PagePickerMode = 'facebook' | 'instagram';

/**
 * Mirrors CreatorProfilePage's ConnectSocialModal — one row per platform
 * (icon + name + follower count/hint on the left, Connect/disconnect on the
 * right). Connecting pulls the profile link and live follower/subscriber
 * count straight from each platform via OAuth; see lib/googleAuth.ts,
 * lib/facebookAuth.ts and lib/oauthPopup.ts for the three underlying flows.
 */
function ConnectSocialModal({
  open,
  accounts,
  onClose,
  onChange,
}: {
  open: boolean;
  accounts: BusinessSocialAccount[];
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
      await connectBusinessFacebookPage(accessToken, pageId);
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
      await connectBusinessInstagramAccount(accessToken, pageId);
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
      await connectBusinessYoutubeAccount(accessToken);
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
      const url = await getBusinessTiktokAuthorizeUrl();
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
      const pages = await getBusinessFacebookPages(accessToken);
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
    await deleteBusinessSocialAccount(id);
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
                onClick={() =>
                  pagePicker.mode === 'facebook'
                    ? void finishFacebook(pagePicker.accessToken, page.id)
                    : void finishInstagram(pagePicker.accessToken, page.id)
                }
                className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left hover:bg-black/[0.02]"
              >
                <span className="text-[13px] font-semibold text-ink">
                  {pagePicker.mode === 'instagram' ? `@${page.instagramUsername ?? page.name}` : page.name}
                </span>
                {pagePicker.mode === 'facebook' && (
                  <span className="text-[12px] text-ink-soft">{compactNumber(page.fanCount)} {t('profile.followers')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </Modal>
  );
}
