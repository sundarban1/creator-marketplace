import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import {
  createPromotion,
  fetchPromotion,
  updatePromotion,
  publishPromotion,
  type ManagedPromotion,
  type PromotionDiscountType,
} from '../api/promotion';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Alert } from '../ui/Alert';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ApiError } from '../lib/apiClient';

export function BusinessPromotionFormPage() {
  const t = useT();
  const { id } = useParams();
  const isEditing = !!id;

  const promotion = useAsync((s) => (id ? fetchPromotion(id, s) : Promise.resolve(null)), [id]);

  if (isEditing && promotion.loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-2/3" />
        <SkeletonText lines={3} className="mt-4" />
      </div>
    );
  }
  if (isEditing && (promotion.error || !promotion.data)) {
    const nf = promotion.error instanceof ApiError && promotion.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant={nf ? 'not-found' : 'error'}
          title={t('common.somethingWrong')}
          action={{ label: t('biz.promotionsTitle'), href: '/business/promotions' }}
        />
      </div>
    );
  }

  return <PromotionForm key={id ?? 'create'} id={id} initial={promotion.data ?? null} />;
}

function PromotionForm({ id, initial }: { id?: string; initial: ManagedPromotion | null }) {
  const t = useT();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [discountType, setDiscountType] = useState<PromotionDiscountType>(initial?.discountType ?? 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(initial ? String(initial.discountValue) : '');
  const [minSpend, setMinSpend] = useState(initial?.minSpend ? String(initial.minSpend) : '');
  const [maxDiscountCap, setMaxDiscountCap] = useState(initial?.maxDiscountCap ? String(initial.maxDiscountCap) : '');
  const [validFrom, setValidFrom] = useState(initial?.validFrom ? initial.validFrom.slice(0, 10) : '');
  const [validUntil, setValidUntil] = useState(initial?.validUntil ? initial.validUntil.slice(0, 10) : '');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState<'draft' | 'publish' | 'save' | null>(null);

  const discountNum = Number(discountValue) || 0;
  const previewDiscount = discountType === 'PERCENTAGE'
    ? `${discountNum || 0}% OFF`
    : `Rs. ${(discountNum || 0).toLocaleString()} OFF`;

  function validate(): string {
    if (title.trim().length < 3) return t('biz.promotionValidationTitleRequired');
    if (!discountValue || discountNum <= 0) return t('biz.promotionValidationDiscountRequired');
    if (!validFrom || !validUntil) return t('biz.promotionValidationDatesRequired');
    return '';
  }

  async function handleSave(e: FormEvent, mode: 'draft' | 'publish' | 'save') {
    e.preventDefault();
    const err = validate();
    if (err) return setError(err);
    setError('');
    setSaving(mode);
    try {
      const payload = {
        title: title.trim(),
        discountType,
        discountValue: discountNum,
        minSpend: minSpend ? Number(minSpend) : undefined,
        maxDiscountCap: maxDiscountCap ? Number(maxDiscountCap) : undefined,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
      };
      if (isEditing) {
        await updatePromotion(id!, payload);
      } else {
        const created = await createPromotion(payload);
        if (mode === 'publish') await publishPromotion(created.id);
      }
      navigate('/business/promotions');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={isEditing ? t('biz.editPromotion') : t('biz.newPromotion')} />

      {error && <Alert tone="error" className="mb-5">{error}</Alert>}
      {isEditing && initial?.status === 'ACTIVE' && (
        <Alert tone="warning" className="mb-5">{t('biz.editActiveWillPauseNote')}</Alert>
      )}

      <form onSubmit={(e) => handleSave(e, isEditing ? 'save' : 'publish')} className="space-y-4">
        <Card>
          <TextField
            label={t('biz.promotionTitleField')}
            placeholder={t('biz.promotionTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
        </Card>

        <Card className="space-y-3">
          <p className="text-[13px] font-semibold text-ink">{t('biz.discountTypeLabel')}</p>
          <SegmentedControl<PromotionDiscountType>
            ariaLabel={t('biz.discountTypeLabel')}
            value={discountType}
            onChange={setDiscountType}
            options={[
              { value: 'PERCENTAGE', label: t('biz.discountTypePercentage') },
              { value: 'FIXED', label: t('biz.discountTypeFixed') },
            ]}
          />
          <TextField
            label={t('biz.discountValueLabel')}
            type="number"
            placeholder={discountType === 'PERCENTAGE' ? '10' : '500'}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </Card>

        <Card className="grid grid-cols-2 gap-3">
          <TextField label={t('biz.minSpendLabel')} type="number" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
          <TextField
            label={`${t('biz.maxDiscountLabel')} (${t('biz.optionalHint')})`}
            type="number"
            value={maxDiscountCap}
            onChange={(e) => setMaxDiscountCap(e.target.value)}
          />
        </Card>

        <Card className="grid grid-cols-2 gap-3">
          <TextField label={t('biz.validFromLabel')} type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
          <TextField label={t('biz.validUntilLabel')} type="date" value={validUntil} min={validFrom || undefined} onChange={(e) => setValidUntil(e.target.value)} />
        </Card>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t('biz.promotionPreviewTitle')}</p>
          <Card>
            <p className="text-[20px] font-extrabold text-violet-dark">{previewDiscount}</p>
            <p className="mt-0.5 text-[14px] font-semibold text-ink-soft">{t('biz.forCreators')}</p>
            {!!title && <p className="mt-1 text-[14px] text-ink">{title}</p>}
          </Card>
        </div>

        <div className="flex gap-2 pt-2">
          {isEditing ? (
            <>
              <Button type="submit" size="lg" loading={saving === 'save'} disabled={!!saving}>
                {t('biz.saveChangesButton')}
              </Button>
              <Button type="button" size="lg" variant="secondary" disabled={!!saving} onClick={() => navigate('/business/promotions')}>
                {t('common.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button type="submit" size="lg" loading={saving === 'publish'} disabled={!!saving}>
                {t('biz.publishNowButton')}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                disabled={!!saving}
                loading={saving === 'draft'}
                onClick={(e) => handleSave(e as unknown as FormEvent, 'draft')}
              >
                {t('biz.saveDraftButton')}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
