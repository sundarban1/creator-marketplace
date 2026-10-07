import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useT } from '../i18n';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { useAsync } from '../lib/useAsync';
import { deleteCampaign, fetchMyCampaigns, type MyCampaign } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { BizEventCard } from './BizEventCard';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const TABS = ['active', 'draft', 'closed'] as const;
type Tab = (typeof TABS)[number];

const MATCH: Record<Tab, (s: string) => boolean> = {
  active: (s) => s === 'ACTIVE' || s === 'PENDING_APPROVAL' || s === 'PAUSED',
  draft: (s) => s === 'DRAFT',
  closed: (s) => s === 'CLOSED' || s === 'CANCELLED' || s === 'EXPIRED',
};

export function BusinessEventsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'active') as Tab;

  const campaigns = useAsync((s) => fetchMyCampaigns({ limit: 100 }, s), []);
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<MyCampaign | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDeleteDraft() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteCampaign(deleteTarget.id);
      toast.success(t('biz.draftDeleted'));
      setDeleteTarget(null);
      campaigns.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('biz.draftDeleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  const buckets = useMemo(() => {
    const list = campaigns.data?.items ?? [];
    return {
      active: list.filter((c) => MATCH.active(c.status)),
      // "Continue where you left off" — most recently edited draft first.
      draft: list.filter((c) => MATCH.draft(c.status))
        .sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt) - Date.parse(a.updatedAt ?? a.createdAt)),
      closed: list.filter((c) => MATCH.closed(c.status)),
    };
  }, [campaigns.data]);

  const list = buckets[tab];
  const flash = (useLocation().state as { flash?: string } | null)?.flash;

  return (
    <>
      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      <PageHeader
        title={t('biz.eventsTitle')}
        description={t('biz.eventsSubtitle')}
        actions={
          <Link to="/business/events/create">
            <Button size="sm">
              <Plus size={15} />
              {t('biz.newEvent')}
            </Button>
          </Link>
        }
      />

      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'active' ? {} : { tab: v }, { replace: true })}
        tabs={TABS.map((v) => ({
          value: v,
          label: t(`biz.eventTab${v[0].toUpperCase()}${v.slice(1)}`),
          count: campaigns.loading ? undefined : buckets[v].length,
        }))}
      />

      <div className="mt-6">
        {campaigns.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : campaigns.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: campaigns.reload }} />
        ) : list.length === 0 ? (
          <EmptyState
            variant="no-events"
            title={t('biz.noEventsTitle')}
            description={t('biz.noEventsBody')}
            action={{ label: t('biz.newEvent'), href: '/business/events/create' }}
          />
        ) : (
          <motion.div
            key={tab}
            initial="hidden"
            animate="show"
            variants={stagger(0.05)}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {list.map((c) => (
              <motion.div key={c.id} variants={fadeUp} className="min-w-0">
                <BizEventCard event={c} onDelete={setDeleteTarget} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title={t('biz.deleteDraftTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t('biz.deleteDraftCancel')}
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDeleteDraft}>
              {t('biz.deleteDraftConfirm')}
            </Button>
          </div>
        }
      >
        <p className="text-[14px] text-ink-soft">{t('biz.deleteDraftBody')}</p>
      </Modal>
    </>
  );
}
