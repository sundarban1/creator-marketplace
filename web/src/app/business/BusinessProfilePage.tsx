import { useMemo, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Bookmark,
  Camera,
  CalendarDays,
  Globe,
  Heart,
  Mail,
  Phone,
} from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useAppAuth } from '../auth/AppAuthContext';
import { isPhonePlaceholderEmail } from '../lib/identity';
import { useToast } from '../ui/Toast';
import {
  fetchBusinessProfile,
  updateBusinessProfile,
  uploadBusinessLogo,
  uploadBusinessCover,
  fetchMyCampaigns,
  fetchSavedCreatorIds,
} from '../api/business';
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
import { Modal } from '../ui/Modal';
import { ImageCropModal } from '../ui/ImageCropModal';

const MAX_INDUSTRIES = 5;

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
  const { user } = useAppAuth();
  const profile = useAsync((s) => fetchBusinessProfile(s), []);
  const categories = useAsync((s) => fetchCategories(s, 'BUSINESS'), []);
  const campaigns = useAsync((s) => fetchMyCampaigns({ limit: 100 }, s), []);
  const savedCreators = useAsync((s) => fetchSavedCreatorIds(s), []);
  const categoryMeta = useMemo(() => makeCategoryLookup(categories.data ?? []), [categories.data]);
  const p = profile.data;

  const [editing, setEditing] = useState(false);
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
      await uploadBusinessLogo(new File([blob], 'logo.jpg', { type: 'image/jpeg' }));
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
      </div>

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
