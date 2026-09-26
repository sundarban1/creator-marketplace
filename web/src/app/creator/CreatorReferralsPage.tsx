import { useState, type FormEvent } from 'react';
import { Check, Copy, Share2, Users } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../ui/Toast';
import { fetchReferralOverview, applyReferralCode } from '../api/creator';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge, type BadgeTone } from '../ui/StatusBadge';

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  EXPIRED: 'neutral',
};

export function CreatorReferralsPage() {
  const t = useT();
  const toast = useToast();
  const overview = useAsync((s) => fetchReferralOverview(s), []);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const o = overview.data;

  async function copyCode() {
    if (!o) return;
    await navigator.clipboard.writeText(o.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareCode() {
    if (!o) return;
    const message = t('referrals.shareMessage', { code: o.code });
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        /* user dismissed the share sheet */
      }
    } else {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setApplying(true);
    try {
      await applyReferralCode(code.trim());
      toast.success(t('referrals.applyCodeSuccess'));
      setCode('');
      overview.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <DashPageHeader title={t('referrals.title')} description={o ? t('referrals.subtitle', { amount: o.rewardAmount }) : undefined} />

      {overview.loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : overview.error || !o ? (
        <EmptyState variant="error" title={t('referrals.loadError')} action={{ label: t('common.retry'), onClick: overview.reload }} />
      ) : (
        <>
          {/* Your code */}
          <DashCard>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('referrals.yourCodeLabel')}</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-violet to-dash-pink px-5 py-4">
              <span className="font-mono text-[22px] font-bold tracking-[0.2em] text-white">{o.code}</span>
              <Share2 size={18} className="flex-shrink-0 cursor-pointer text-white/90" onClick={shareCode} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" fullWidth onClick={copyCode}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('referrals.copied') : t('referrals.copyCode')}
              </Button>
              <Button size="sm" fullWidth onClick={shareCode}>
                <Share2 size={14} />
                {t('referrals.share')}
              </Button>
            </div>
          </DashCard>

          {/* How it works */}
          <DashCard className="mt-6">
            <DashCardHeader title={t('referrals.howItWorksHeading')} />
            <ol className="space-y-1.5 text-[13.5px] text-ink-soft">
              {(['step1', 'step2', 'step3', 'step4', 'step5'] as const).map((key, i) => (
                <li key={key} className="flex gap-2">
                  <span className="flex-shrink-0 font-semibold text-violet-dark">{i + 1}.</span>
                  {t(`referrals.${key}`)}
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-xl bg-violet/[0.06] px-3 py-2.5 text-[12.5px] font-medium text-violet-dark">
              {t('referrals.conditionNote', { amount: o.rewardAmount })}
            </p>
          </DashCard>

          {/* Referred by / apply a code */}
          {o.referredBy ? (
            <DashCard className="mt-6">
              <p className="text-[13.5px] text-ink">
                {t('referrals.referredByLabel', { name: o.referredBy.name ?? '' })}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-soft">{t('referrals.referredBonusHint')}</p>
            </DashCard>
          ) : (
            <DashCard className="mt-6">
              <DashCardHeader title={t('referrals.applyCodeHeading')} />
              <form onSubmit={submitCode} className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t('referrals.applyCodePlaceholder')}
                  className="h-11 flex-1 min-w-0 rounded-xl border border-line-strong px-3.5 font-mono text-[14px] uppercase tracking-wide text-ink focus:border-violet/40 focus:outline-none focus:ring-2 focus:ring-violet/20"
                />
                <Button type="submit" loading={applying} disabled={!code.trim()}>
                  {t('referrals.applyCodeButton')}
                </Button>
              </form>
            </DashCard>
          )}

          {/* History */}
          <DashCard className="mt-6">
            <DashCardHeader title={t('referrals.historyHeading')} />
            {o.referrals.length === 0 ? (
              <EmptyState
                variant="empty"
                icon={<Users size={26} strokeWidth={1.75} />}
                size="sm"
                title={t('referrals.noReferralsYet')}
                description={t('referrals.noReferralsHint')}
              />
            ) : (
              <div className="divide-y divide-ink/[0.05]">
                {o.referrals.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <Avatar name={r.referredName} src={r.referredAvatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{r.referredName}</p>
                      <p className="truncate text-[12px] text-ink-soft">
                        {t('referrals.joinedOn', {
                          date: new Date(r.linkedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                        })}
                      </p>
                    </div>
                    <StatusBadge label={t(`referrals.status${r.status.charAt(0)}${r.status.slice(1).toLowerCase()}`)} tone={STATUS_TONE[r.status] ?? 'neutral'} />
                  </div>
                ))}
              </div>
            )}
          </DashCard>
        </>
      )}
    </div>
  );
}
