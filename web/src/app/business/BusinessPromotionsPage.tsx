import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import {
  fetchMyPromotions,
  publishPromotion,
  pausePromotion,
  deletePromotion,
  type ManagedPromotion,
  type PromotionStatus,
} from '../api/promotion';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { BizPromotionCard } from './BizPromotionCard';

const STATUSES: PromotionStatus[] = ['ACTIVE', 'DRAFT', 'PAUSED', 'EXPIRED'];

function tabLabelKey(status: PromotionStatus): string {
  return `biz.promotionTab${status[0]}${status.slice(1).toLowerCase()}`;
}

export function BusinessPromotionsPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (STATUSES.includes(params.get('tab') as PromotionStatus) ? params.get('tab') : 'ACTIVE') as PromotionStatus;

  const promotions = useAsync((s) => fetchMyPromotions(s), []);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const buckets = useMemo(() => {
    const list = promotions.data ?? [];
    return {
      ACTIVE: list.filter((p) => p.status === 'ACTIVE'),
      DRAFT: list.filter((p) => p.status === 'DRAFT'),
      PAUSED: list.filter((p) => p.status === 'PAUSED'),
      EXPIRED: list.filter((p) => p.status === 'EXPIRED'),
    } satisfies Record<PromotionStatus, ManagedPromotion[]>;
  }, [promotions.data]);

  const list = buckets[tab];

  async function handlePause(p: ManagedPromotion) {
    setPausingId(p.id);
    setError('');
    try {
      await pausePromotion(p.id);
      promotions.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('biz.pausePromotionError'));
    } finally {
      setPausingId(null);
    }
  }

  async function handlePublish(p: ManagedPromotion) {
    setPublishingId(p.id);
    setError('');
    try {
      await publishPromotion(p.id);
      setFlash(t('biz.publishPromotionSuccess'));
      promotions.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('biz.publishPromotionError'));
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDelete(p: ManagedPromotion) {
    if (!window.confirm(t('biz.deletePromotionConfirmBody'))) return;
    setDeletingId(p.id);
    setError('');
    try {
      await deletePromotion(p.id);
      setFlash(t('biz.deletePromotionSuccess'));
      promotions.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('biz.deletePromotionError'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title={t('biz.promotionsTitle')}
        description={t('biz.promotionsSubtitle')}
        actions={
          <Link to="/business/promotions/create">
            <Button size="sm">
              <Plus size={15} />
              {t('biz.newPromotion')}
            </Button>
          </Link>
        }
      />

      {error && <Alert tone="error" className="mb-5">{error}</Alert>}
      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}

      <Tabs
        value={tab}
        onChange={(v) => setParams(v === 'ACTIVE' ? {} : { tab: v }, { replace: true })}
        tabs={STATUSES.map((s) => ({
          value: s,
          label: t(tabLabelKey(s)),
          count: promotions.loading ? undefined : buckets[s].length,
        }))}
      />

      <div className="mt-6">
        {promotions.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : promotions.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: promotions.reload }} />
        ) : list.length === 0 ? (
          <EmptyState
            variant="empty"
            title={t('biz.noPromotionsTitle')}
            description={t('biz.noPromotionsBody')}
            action={{ label: t('biz.newPromotion'), href: '/business/promotions/create' }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <BizPromotionCard
                key={p.id}
                promotion={p}
                pausing={pausingId === p.id}
                publishing={publishingId === p.id}
                deleting={deletingId === p.id}
                onPause={() => handlePause(p)}
                onPublish={() => handlePublish(p)}
                onEdit={() => navigate(`/business/promotions/${p.id}/edit`)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
