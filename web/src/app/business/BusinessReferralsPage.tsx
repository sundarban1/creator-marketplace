import { useState, type FormEvent } from 'react';
import { Check, Copy, RotateCcw, Share2, Users } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useToast } from '../ui/Toast';
import { fetchBusinessReferralOverview, applyBusinessReferralCode, resendBusinessReferral } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
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

export function BusinessReferralsPage() {
  const t = useT();
  const toast = useToast();
  const overview = useAsync((s) => fetchBusinessReferralOverview(s), []);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const o = overview.data;

  async function copyCode() {
    if (!o) return;
    await navigator.clipboard.writeText(o.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareCode() {
    if (!o) return;
    const message = t('bizReferrals.shareMessage', { code: o.code });
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
      await applyBusinessReferralCode(code.trim());
      toast.success(t('bizReferrals.applyCodeSuccess'));
      setCode('');
      overview.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setApplying(false);
    }
  }

  async function resend(id: string) {
    setResendingId(id);
    try {
      await resendBusinessReferral(id);
      toast.success(t('bizReferrals.resendSuccess'));
      overview.reload();
    } catch {
      toast.error(t('bizReferrals.resendError'));
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('bizReferrals.title')} description={o ? t('bizReferrals.subtitle', { amount: o.rewardAmount }) : undefined} />

      {overview.loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : overview.error || !o ? (
        <EmptyState variant="error" title={t('bizReferrals.loadError')} action={{ label: t('common.retry'), onClick: overview.reload }} />
      ) : (
        <>
          {/* Your code */}
          <Card>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('bizReferrals.yourCodeLabel')}</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-brand px-5 py-4">
              <span className="font-mono text-[22px] font-bold tracking-[0.2em] text-white">{o.code}</span>
              <Share2 size={18} className="flex-shrink-0 cursor-pointer text-white/90" onClick={shareCode} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" fullWidth onClick={copyCode}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t('bizReferrals.copied') : t('bizReferrals.copyCode')}
              </Button>
              <Button size="sm" fullWidth onClick={shareCode}>
                <Share2 size={14} />
                {t('bizReferrals.share')}
              </Button>
            </div>
          </Card>

          {/* How it works */}
          <Card className="mt-6">
            <CardHeader title={t('bizReferrals.howItWorksHeading')} />
            <ol className="space-y-1.5 text-[13.5px] text-ink-soft">
              {(['step1', 'step2', 'step3', 'step4', 'step5'] as const).map((key, i) => (
                <li key={key} className="flex gap-2">
                  <span className="flex-shrink-0 font-semibold text-violet-dark">{i + 1}.</span>
                  {t(`bizReferrals.${key}`)}
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-xl bg-violet/[0.06] px-3 py-2.5 text-[12.5px] font-medium text-violet-dark">
              {t('bizReferrals.conditionNote', { amount: o.rewardAmount })}
            </p>
          </Card>

          {/* Referred by / apply a code */}
          {o.referredBy ? (
            <Card className="mt-6">
              <p className="text-[13.5px] text-ink">{t('bizReferrals.referredByLabel', { name: o.referredBy.name ?? '' })}</p>
            </Card>
          ) : (
            <Card className="mt-6">
              <CardHeader title={t('bizReferrals.applyCodeHeading')} />
              <form onSubmit={submitCode} className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t('bizReferrals.applyCodePlaceholder')}
                  className="h-11 flex-1 min-w-0 rounded-xl border border-line-strong px-3.5 font-mono text-[14px] uppercase tracking-wide text-ink focus:border-violet/40 focus:outline-none focus:ring-2 focus:ring-violet/20"
                />
                <Button type="submit" loading={applying} disabled={!code.trim()}>
                  {t('bizReferrals.applyCodeButton')}
                </Button>
              </form>
            </Card>
          )}

          {/* History */}
          <Card className="mt-6">
            <CardHeader title={t('bizReferrals.historyHeading')} />
            {o.referrals.length === 0 ? (
              <EmptyState
                variant="empty"
                icon={<Users size={26} strokeWidth={1.75} />}
                size="sm"
                title={t('bizReferrals.noReferralsYet')}
                description={t('bizReferrals.noReferralsHint')}
              />
            ) : (
              <div className="divide-y divide-line">
                {o.referrals.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <Avatar name={r.referredName} src={r.referredLogoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{r.referredName}</p>
                      <p className="truncate text-[12px] text-ink-soft">
                        {t('bizReferrals.joinedOn', {
                          date: new Date(r.linkedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                        })}
                      </p>
                    </div>
                    {r.status === 'EXPIRED' && (
                      <Button variant="secondary" size="sm" loading={resendingId === r.id} onClick={() => resend(r.id)}>
                        <RotateCcw size={13} />
                        {t('bizReferrals.resend')}
                      </Button>
                    )}
                    <StatusBadge label={t(`bizReferrals.status${r.status.charAt(0)}${r.status.slice(1).toLowerCase()}`)} tone={STATUS_TONE[r.status] ?? 'neutral'} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
