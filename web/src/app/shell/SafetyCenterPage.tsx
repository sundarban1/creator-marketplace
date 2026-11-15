import { useState } from 'react';
import { Ban, ExternalLink, FileText, Flag, Globe, Mail, Scale, ShieldCheck, Undo2 } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { blocksApi, SUPPORT_EMAIL, SUPPORT_WEBSITE, type BlockedUser } from '../api/safety';
import { publishLive } from '../lib/liveUpdates';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

/**
 * Help & Safety — one place for: Kolab's published contact details, the
 * policies, how report/block/review/appeal work, and the Blocked Users list.
 * Same content as mobile's help-safety + blocked-users screens.
 */
export function SafetyCenterPage() {
  const t = useT();
  const toast = useToast();
  const blocked = useAsync(() => blocksApi.list(), []);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  async function unblock(u: BlockedUser) {
    setBusy(u.userId);
    try {
      await blocksApi.unblock(u.userId);
      setRemoved((prev) => new Set(prev).add(u.userId));
      publishLive('campaigns', 'conversations');
      toast.success(t('safety.unblocked', { name: u.name }));
    } catch {
      toast.error(t('safety.blockFailed'));
    } finally {
      setBusy(null);
    }
  }

  const list = (blocked.data ?? []).filter((u) => !removed.has(u.userId));
  const link = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink hover:bg-surface-dim';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t('safety.centerTitle')} description={t('safety.centerSubtitle')} />

      <Card>
        <CardHeader title={t('safety.contactTitle')} />
        <p className="text-[13.5px] text-ink-soft mb-3">{t('safety.contactBody')}</p>
        <div className="grid gap-1 sm:grid-cols-2">
          <a className={link} href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail size={17} className="text-brand" />
            <span className="min-w-0"><span className="block text-[12px] text-ink-soft">{t('safety.email')}</span>{SUPPORT_EMAIL}</span>
          </a>
          <a className={link} href={SUPPORT_WEBSITE} target="_blank" rel="noreferrer">
            <Globe size={17} className="text-brand" />
            <span className="min-w-0"><span className="block text-[12px] text-ink-soft">{t('safety.website')}</span>kolab.com.np</span>
          </a>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('safety.howTitle')} />
        <ul className="space-y-3 text-[13.5px] leading-relaxed text-ink-soft">
          <li className="flex gap-3"><Flag size={16} className="mt-0.5 flex-shrink-0 text-ink" />{t('safety.howReport')}</li>
          <li className="flex gap-3"><Ban size={16} className="mt-0.5 flex-shrink-0 text-ink" />{t('safety.howBlock')}</li>
          <li className="flex gap-3"><ShieldCheck size={16} className="mt-0.5 flex-shrink-0 text-ink" />{t('safety.howReview')}</li>
          <li className="flex gap-3"><Undo2 size={16} className="mt-0.5 flex-shrink-0 text-ink" />{t('safety.howAppeal')}</li>
        </ul>
      </Card>

      <Card>
        <CardHeader title={t('safety.policiesTitle')} />
        <div className="grid gap-1 sm:grid-cols-3">
          <a className={link} href="/community-guidelines" target="_blank" rel="noreferrer"><ShieldCheck size={16} className="text-brand" />{t('safety.guidelines')}<ExternalLink size={12} className="ml-auto text-ink-soft" /></a>
          <a className={link} href="/terms" target="_blank" rel="noreferrer"><Scale size={16} className="text-brand" />{t('safety.terms')}<ExternalLink size={12} className="ml-auto text-ink-soft" /></a>
          <a className={link} href="/privacy" target="_blank" rel="noreferrer"><FileText size={16} className="text-brand" />{t('safety.privacy')}<ExternalLink size={12} className="ml-auto text-ink-soft" /></a>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('safety.blockedTitle')} />
        {blocked.loading ? (
          <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : list.length === 0 ? (
          <EmptyState icon={<Ban size={22} />} title={t('safety.blockedEmpty')} />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((u) => (
              <li key={u.userId} className="flex items-center gap-3 py-3">
                <Avatar name={u.name} src={u.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{u.name}</p>
                  <p className="text-[12px] text-ink-soft">{t('safety.blockedOn', { date: new Date(u.blockedAt).toLocaleDateString() })}</p>
                </div>
                <Button size="sm" variant="secondary" loading={busy === u.userId} onClick={() => unblock(u)}>{t('safety.unblock')}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
