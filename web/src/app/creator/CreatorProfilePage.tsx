import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ExternalLink, Camera, Plus, Trash2 } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { compactNumber } from '../lib/format';
import {
  fetchCreatorFullProfile,
  updateCreatorProfile,
  uploadAvatar,
  fetchSocialAccounts,
  addSocialAccount,
  deleteSocialAccount,
  addPortfolioLink,
  deletePortfolioLink,
  type CreatorFullProfile,
} from '../api/creator';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { PlatformIcon, platformMeta } from '../ui/PlatformIcon';

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook'];

export function CreatorProfilePage() {
  const t = useT();
  const profile = useAsync((s) => fetchCreatorFullProfile(s), []);
  const socials = useAsync((s) => fetchSocialAccounts(s), []);

  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [socialModal, setSocialModal] = useState(false);
  const [portfolioModal, setPortfolioModal] = useState(false);

  const p = profile.data;

  // edit form
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');

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

  const onAvatar = async (file: File) => {
    try {
      await uploadAvatar(file);
      profile.reload();
      setFlash(t('profile.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    }
  };

  const togglePrivacy = async (key: 'showPublicProfile' | 'hideSocialLinks', value: boolean) => {
    try {
      await updateCreatorProfile({ [key]: value });
      profile.reload();
    } catch {
      /* revert visually on reload */
    }
  };

  if (profile.loading && !p) {
    return (
      <>
        <PageHeader eyebrow={t('profile.eyebrow')} title={t('profile.title')} />
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
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.subtitle')}
        actions={
          p.username || p.id ? (
            <Link to={`/creators/${p.username ?? p.id}`}>
              <Button variant="secondary" size="sm">
                {t('profile.viewPublic')}
              </Button>
            </Link>
          ) : undefined
        }
      />

      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      {/* Identity card */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative w-fit">
            <span className="inline-flex rounded-full bg-gradient-to-br from-violet/25 to-brand-orange/20 p-[3px]">
              <span className="rounded-full bg-surface p-0.5">
                <Avatar name={p.fullName ?? 'Creator'} src={p.avatarUrl} size="xl" className="h-20 w-20" />
              </span>
            </span>
            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-sm hover:text-ink">
              <Camera size={14} />
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAvatar(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-medium tracking-tight text-ink">{p.fullName ?? '—'}</h2>
              {p.fullyVerified && <BadgeCheck size={17} className="text-brand" />}
            </div>
            {p.username && <p className="text-[13px] text-ink-soft">@{p.username}</p>}
            {p.location && <p className="mt-0.5 text-[13px] text-ink-soft">{p.location}</p>}
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink">
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
            {p.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.categories.map((c) => (
                  <span key={c} className="rounded-full bg-surface-dim px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={openEdit}>
            {t('profile.edit')}
          </Button>
        </div>
      </Card>

      {/* Social accounts */}
      <Card className="mt-6">
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
          <p className="text-[13px] text-ink-soft">—</p>
        ) : (
          <ul className="space-y-2">
            {socials.data!.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                <PlatformIcon platform={s.platform} size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">{platformMeta(s.platform).label}</p>
                  <p className="truncate text-[12px] text-ink-soft">{compactNumber(s.followers)} {t('profile.followers')}</p>
                </div>
                {!s.connectedViaOAuth && (
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
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Portfolio */}
      <Card className="mt-6">
        <CardHeader
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
        {p.portfolioLinks.length === 0 ? (
          <p className="text-[13px] text-ink-soft">—</p>
        ) : (
          <ul className="space-y-2">
            {p.portfolioLinks.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                <a href={l.url} target="_blank" rel="noreferrer nofollow" className="min-w-0 flex-1 truncate text-[13px] font-medium text-violet-dark hover:underline">
                  {l.label}
                </a>
                <button
                  onClick={async () => {
                    if (!window.confirm(t('profile.confirmRemove'))) return;
                    await deletePortfolioLink(l.id);
                    profile.reload();
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

      {/* Privacy */}
      <Card className="mt-6">
        <CardHeader title={t('profile.privacyHeading')} />
        <Toggle
          label={t('profile.showPublic')}
          hint={t('profile.showPublicHint')}
          checked={p.showPublicProfile}
          onChange={(v) => togglePrivacy('showPublicProfile', v)}
        />
        <div className="mt-3 border-t border-line pt-3">
          <Toggle
            label={t('profile.hideSocials')}
            checked={p.hideSocialLinks}
            onChange={(v) => togglePrivacy('hideSocialLinks', v)}
          />
        </div>
      </Card>

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
          />
          <TextField label={t('profile.location')} value={location} onChange={(e) => setLocation(e.target.value)} />
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

      <AddSocialModal
        open={socialModal}
        onClose={() => setSocialModal(false)}
        onDone={() => {
          setSocialModal(false);
          socials.reload();
        }}
      />
      <AddPortfolioModal
        open={portfolioModal}
        onClose={() => setPortfolioModal(false)}
        onDone={() => {
          setPortfolioModal(false);
          profile.reload();
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[14px] font-medium text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] text-ink-soft">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-violet' : 'bg-line-strong'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}

function AddSocialModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [platform, setPlatform] = useState('instagram');
  const [url, setUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={t('profile.addSocial')}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await addSocialAccount({ platform, profileUrl: url.trim(), followers: Number(followers) || 0 });
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.somethingWrong'));
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-4"
      >
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">{t('profile.platform')}</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((pl) => (
              <button
                key={pl}
                type="button"
                onClick={() => setPlatform(pl)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium ${
                  platform === pl ? 'border-violet/40 bg-violet/[0.06] text-violet-dark' : 'border-line-strong text-ink-soft'
                }`}
              >
                <PlatformIcon platform={pl} size={14} />
                {platformMeta(pl).label}
              </button>
            ))}
          </div>
        </div>
        <TextField label={t('profile.profileUrl')} type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        <TextField label={t('profile.followers')} type="number" inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('profile.addSocial')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddPortfolioModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Modal open={open} onClose={onClose} title={t('profile.addPortfolio')}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await addPortfolioLink({ label: label.trim(), url: url.trim() });
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : t('common.somethingWrong'));
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-4"
      >
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label={t('profile.linkLabel')} value={label} onChange={(e) => setLabel(e.target.value)} />
        <TextField label={t('profile.linkUrl')} type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={busy}>
            {t('profile.addPortfolio')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export type { CreatorFullProfile };
