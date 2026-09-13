import { Pause, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { useT } from '../i18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge, type BadgeTone } from '../ui/StatusBadge';
import type { ManagedPromotion, PromotionStatus } from '../api/promotion';

const STATUS_TONE: Record<PromotionStatus, BadgeTone> = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  PAUSED: 'warning',
  EXPIRED: 'neutral',
};

const EDITABLE_STATUSES: PromotionStatus[] = ['DRAFT', 'PAUSED'];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function BizPromotionCard({
  promotion,
  pausing,
  publishing,
  deleting,
  onPause,
  onPublish,
  onEdit,
  onDelete,
}: {
  promotion: ManagedPromotion;
  pausing: boolean;
  publishing: boolean;
  deleting: boolean;
  onPause: () => void;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const discount = promotion.discountType === 'PERCENTAGE'
    ? `${promotion.discountValue}% OFF`
    : `Rs. ${promotion.discountValue.toLocaleString()} OFF`;

  const busy = pausing || publishing || deleting;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[18px] font-extrabold text-violet-dark">{discount}</p>
          <p className="mt-0.5 truncate text-[14px] font-medium text-ink">{promotion.title}</p>
        </div>
        <StatusBadge label={t(`biz.promotionTab${promotion.status[0]}${promotion.status.slice(1).toLowerCase()}`)} tone={STATUS_TONE[promotion.status]} dot={false} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium text-ink-soft">
        <span>{t('biz.promotionRedemptions', { count: promotion.redemptions })}</span>
        <span>{t('biz.promotionCreditsEarned', { amount: promotion.creditsEarned.toLocaleString() })}</span>
        {promotion.status !== 'DRAFT' && <span>{t('biz.promotionEnds', { date: formatDate(promotion.validUntil) })}</span>}
      </div>

      {(promotion.status === 'ACTIVE' || EDITABLE_STATUSES.includes(promotion.status)) && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {promotion.status === 'ACTIVE' ? (
            <Button variant="secondary" size="sm" disabled={busy} loading={pausing} onClick={onPause}>
              <Pause size={12} />
              {t('biz.pausePromotion')}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled={busy} loading={publishing} onClick={onPublish}>
              <Megaphone size={12} />
              {t('biz.publishPromotion')}
            </Button>
          )}

          {(EDITABLE_STATUSES.includes(promotion.status) || promotion.status === 'ACTIVE') && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={onEdit}>
              <Pencil size={12} />
              {t('common.edit')}
            </Button>
          )}
          {EDITABLE_STATUSES.includes(promotion.status) && (
            <Button variant="danger" size="sm" disabled={busy} loading={deleting} onClick={onDelete}>
              <Trash2 size={12} />
              {t('common.delete')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
