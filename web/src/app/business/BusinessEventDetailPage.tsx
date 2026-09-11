import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees, perCreatorBudget } from '../lib/format';
import {
  fetchCampaign,
  fetchBusinessApplications,
  acceptApplication,
  rejectApplication,
  payForApplication,
  type BusinessApplication,
} from '../api/business';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { EngagementBadge } from '../creator/EngagementBadge';

export function BusinessEventDetailPage() {
  const t = useT();
  const { id = '' } = useParams();
  const campaign = useAsync((s) => fetchCampaign(id, s), [id]);
  const apps = useAsync((s) => fetchBusinessApplications({ limit: 100 }, s), []);

  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const { applicants, accepted } = useMemo(() => {
    const mine = (apps.data?.items ?? []).filter((a) => a.campaignId === id);
    return {
      applicants: mine.filter((a) => a.engagementState === 'PROPOSAL_PENDING'),
      accepted: mine.filter((a) => a.engagementState !== 'PROPOSAL_PENDING' && a.status !== 'REJECTED'),
    };
  }, [apps.data, id]);

  const act = async (fn: () => Promise<unknown>, appId: string, msg: string) => {
    setBusyId(appId);
    setError('');
    try {
      await fn();
      setFlash(msg);
      apps.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusyId('');
    }
  };

  if (campaign.loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-8 w-2/3" />
        <SkeletonText lines={3} className="mt-4" />
      </div>
    );
  }
  if (campaign.error || !campaign.data) {
    const nf = campaign.error instanceof ApiError && campaign.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant={nf ? 'not-found' : 'error'}
          title={t('public.eventNotFoundTitle')}
          action={{ label: t('biz.eventsTitle'), href: '/business/events' }}
        />
      </div>
    );
  }

  const c = campaign.data;
  const budget = perCreatorBudget(c);
  const isPaid = c.campaignType !== 'OPEN_EVENT';

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/business/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {t('biz.eventsTitle')}
      </Link>

      <PageHeader
        eyebrow={t('biz.eyebrowEvents')}
        title={c.title}
        description={`${c.category} · ${t('public.budgetPerCreator', { amount: budget.amount })}`}
      />

      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      {/* Applicants */}
      <Card>
        <CardHeader title={`${t('biz.applicantsHeading')} (${applicants.length})`} />
        {apps.loading ? (
          <Skeleton className="h-24 w-full" />
        ) : applicants.length === 0 ? (
          <p className="text-[13px] text-ink-soft">{t('biz.noApplicants')}</p>
        ) : (
          <ul className="space-y-3">
            {applicants.map((a) => (
              <ApplicantRow
                key={a.id}
                a={a}
                busy={busyId === a.id}
                onAccept={() => act(() => acceptApplication(id, a.id), a.id, t('biz.proposalAccepted'))}
                onReject={() => {
                  if (!window.confirm(t('biz.confirmReject'))) return;
                  act(() => rejectApplication(id, a.id), a.id, t('biz.rejected'));
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Working on this */}
      <Card className="mt-6">
        <CardHeader title={`${t('biz.acceptedHeading')} (${accepted.length})`} />
        {accepted.length === 0 ? (
          <p className="text-[13px] text-ink-soft">—</p>
        ) : (
          <ul className="space-y-3">
            {accepted.map((a) => {
              const needsPay = isPaid && a.engagementState === 'CREATOR_SELECTED';
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                  <Avatar name={a.creator?.fullName ?? 'Creator'} src={a.creator?.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{a.creator?.fullName}</p>
                    <p className="text-[12px] text-ink-soft">{rupees(a.proposedRate)}</p>
                    <div className="mt-1.5">
                      <EngagementBadge state={a.engagementState} />
                    </div>
                  </div>
                  {needsPay && (
                    <Button
                      size="sm"
                      loading={busyId === a.id}
                      onClick={() => act(() => payForApplication(a.id), a.id, t('biz.paid'))}
                    >
                      {t('biz.payNow')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title={t('public.eventAboutHeading')} />
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{c.description}</p>
        {c.deliverables && (
          <>
            <p className="mt-4 text-[13px] font-semibold text-ink">{t('public.deliverablesHeading')}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{c.deliverables}</p>
          </>
        )}
      </Card>
    </div>
  );
}

function ApplicantRow({
  a,
  busy,
  onAccept,
  onReject,
}: {
  a: BusinessApplication;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar name={a.creator?.fullName ?? 'Creator'} src={a.creator?.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-semibold text-ink">{a.creator?.fullName ?? 'Creator'}</p>
            <span className="flex-shrink-0 text-[13px] font-semibold text-ink">{rupees(a.proposedRate)}</span>
          </div>
          {a.creator?.location && <p className="text-[12px] text-ink-soft">{a.creator.location}</p>}
          <p className={expanded ? 'mt-2 text-[13px] leading-relaxed text-ink-soft' : 'mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-soft'}>
            {a.coverLetter}
          </p>
          {a.coverLetter.length > 140 && (
            <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-[12px] font-semibold text-violet-dark hover:underline">
              {expanded ? '−' : '+'} {t('biz.coverLetter')}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" loading={busy} onClick={onAccept}>
          {t('biz.accept')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
          {t('biz.reject')}
        </Button>
        {a.creator?.id && (
          <Link to={`/business/creators/${a.creator.id}`} className="ml-auto self-center text-[12px] font-semibold text-violet-dark hover:underline">
            {t('biz.reviewProfile')}
          </Link>
        )}
      </div>
    </li>
  );
}
