import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees } from '../lib/format';
import { fetchBusinessApplications, approveWork, requestRevision, type BusinessApplication } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { DeliverableStrip } from '../ui/DeliverableGallery';

const TABS = ['review', 'approved'] as const;
type Tab = (typeof TABS)[number];

export function BusinessDeliverablesPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'review') as Tab;

  const apps = useAsync((s) => fetchBusinessApplications({ limit: 200 }, s), []);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [revisionFor, setRevisionFor] = useState<BusinessApplication | null>(null);

  const buckets = useMemo(() => {
    const list = apps.data?.items ?? [];
    return {
      review: list.filter((a) => a.engagementState === 'BUSINESS_REVIEW'),
      approved: list.filter(
        (a) => a.engagementState === 'PAYMENT_RELEASE_PENDING' || a.engagementState === 'PAYMENT_RELEASED' || a.engagementState === 'COMPLETED',
      ),
    };
  }, [apps.data]);

  const list = buckets[tab];

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

  return (
    <>
      <PageHeader eyebrow={t('biz.eyebrowDeliv')} title={t('biz.delivTitle')} description={t('biz.delivSubtitle')} />

      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'review' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((v) => ({
          value: v,
          label: t(`biz.delivTab${v[0].toUpperCase()}${v.slice(1)}`),
          count: apps.loading ? undefined : buckets[v].length,
        }))}
      />

      <div className="mt-6 space-y-4">
        {apps.loading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
        ) : list.length === 0 ? (
          <EmptyState variant="empty" title={t('biz.noDeliverables')} />
        ) : (
          list.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center gap-3">
                <Avatar name={a.creator?.fullName ?? 'Creator'} src={a.creator?.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{a.creator?.fullName}</p>
                  <p className="text-[12px] text-ink-soft">
                    {a.campaign?.title} · {rupees(a.proposedRate)}
                  </p>
                </div>
                <Link to={`/business/events/${a.campaignId}`} className="text-[12px] font-semibold text-violet-dark hover:underline">
                  {a.campaign?.title ? t('biz.manageEvent') : ''}
                </Link>
              </div>

              {((a.deliverableFiles ?? []).length > 0 || (a.deliverableVideos ?? []).length > 0) && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[12px] font-semibold text-ink-soft">{t('biz.submittedFiles')}</p>
                  <DeliverableStrip files={a.deliverableFiles} videos={a.deliverableVideos} />
                </div>
              )}

              {tab === 'review' && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    loading={busyId === a.id}
                    onClick={() => {
                      if (!window.confirm(t('biz.approveConfirm'))) return;
                      act(() => approveWork(a.id), a.id, t('biz.workApproved'));
                    }}
                  >
                    {t('biz.approve')}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busyId === a.id} onClick={() => setRevisionFor(a)}>
                    {t('biz.requestChanges')}
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <Modal open={!!revisionFor} onClose={() => setRevisionFor(null)} title={t('biz.requestChanges')}>
        <RevisionForm
          onCancel={() => setRevisionFor(null)}
          onSubmit={async (note) => {
            if (!revisionFor) return;
            await act(() => requestRevision(revisionFor.id, note), revisionFor.id, t('biz.revisionSent'));
            setRevisionFor(null);
          }}
        />
      </Modal>
    </>
  );
}

function RevisionForm({ onSubmit, onCancel }: { onSubmit: (note: string) => Promise<void>; onCancel: () => void }) {
  const t = useT();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <Textarea label={t('biz.revisionNote')} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button
          loading={busy}
          disabled={note.trim().length < 5}
          onClick={async () => {
            setBusy(true);
            try {
              await onSubmit(note.trim());
            } finally {
              setBusy(false);
            }
          }}
        >
          {t('biz.requestChanges')}
        </Button>
      </div>
    </div>
  );
}
