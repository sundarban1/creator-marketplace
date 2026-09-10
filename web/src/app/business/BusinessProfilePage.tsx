import { useState, type FormEvent } from 'react';
import { Camera, ExternalLink } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchBusinessProfile, updateBusinessProfile, uploadBusinessLogo } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { TextField } from '../ui/TextField';
import { Textarea } from '../ui/Textarea';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

export function BusinessProfilePage() {
  const t = useT();
  const profile = useAsync((s) => fetchBusinessProfile(s), []);
  const p = profile.data;

  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [about, setAbout] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');

  const openEdit = () => {
    if (!p) return;
    setBusinessName(p.businessName ?? '');
    setAbout(p.about ?? '');
    setIndustry(p.industry ?? '');
    setWebsite(p.website ?? '');
    setLocation(p.location ?? '');
    setEditing(true);
    setError('');
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateBusinessProfile({
        businessName: businessName.trim() || undefined,
        about: about.trim() || null,
        industry: industry.trim() || null,
        website: website.trim() || null,
        location: location.trim() || null,
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

  const onLogo = async (file: File) => {
    try {
      await uploadBusinessLogo(file);
      profile.reload();
      setFlash(t('profile.saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    }
  };

  if (profile.loading && !p) {
    return (
      <>
        <PageHeader title={t('biz.profileTitle')} />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </>
    );
  }
  if (profile.error || !p) {
    return <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: profile.reload }} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('biz.profileTitle')} />

      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative w-fit">
            <Avatar name={p.businessName ?? 'Business'} src={p.logoUrl} size="xl" className="h-20 w-20 rounded-xl" />
            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-sm hover:text-ink">
              <Camera size={14} />
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onLogo(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-ink">{p.businessName ?? '—'}</h2>
            {p.industry && <p className="text-[13px] text-ink-soft">{p.industry}</p>}
            {p.location && <p className="mt-0.5 text-[13px] text-ink-soft">{p.location}</p>}
            <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink">
              {p.about || <span className="text-ink-soft">{t('profile.noBio')}</span>}
            </p>
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
                {p.website.replace(/^https?:\/\//, '')}
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={openEdit}>
            {t('profile.edit')}
          </Button>
        </div>
      </Card>

      <Modal open={editing} onClose={() => setEditing(false)} title={t('profile.edit')} size="lg">
        <form onSubmit={save} className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <TextField label={t('biz.businessName')} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <Textarea label={t('biz.about')} rows={4} value={about} onChange={(e) => setAbout(e.target.value)} />
          <TextField label={t('biz.industry')} value={industry} onChange={(e) => setIndustry(e.target.value)} />
          <TextField label={t('biz.website')} type="url" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <TextField label={t('biz.location')} value={location} onChange={(e) => setLocation(e.target.value)} />
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
    </div>
  );
}
