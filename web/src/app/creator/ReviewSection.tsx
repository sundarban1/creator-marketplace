import { useState } from 'react';
import { Star } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { submitReview, getMyReview, getReviewReceived } from '../api/creator';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { cn } from '../ui/cn';

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < rating ? 'fill-warning text-warning' : 'text-line-strong'} />
      ))}
    </div>
  );
}

/**
 * Post-completion rating, shared by both the creator work-detail page and the
 * business event-detail page — same `POST .../review` endpoint accepts either
 * role (see campaign.routes.ts), so this fetches/submits directly rather than
 * taking role-specific callbacks as props.
 */
export function ReviewSection({ appId, revieweeName }: { appId: string; revieweeName: string }) {
  const t = useT();
  const mine = useAsync((s) => getMyReview(appId, s), [appId]);
  const received = useAsync((s) => getReviewReceived(appId, s), [appId]);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justSubmitted, setJustSubmitted] = useState<{ rating: number; comment: string | null } | null>(null);

  const myReview = justSubmitted ?? mine.data;

  async function onSubmit() {
    if (rating < 1) return;
    setBusy(true);
    setError('');
    try {
      const review = await submitReview(appId, rating, comment.trim() || undefined);
      setJustSubmitted(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  if (mine.loading) return null;

  return (
    <Card className="mt-4">
      <CardHeader title={t('review.heading')} />

      {myReview ? (
        <div>
          <StarRow rating={myReview.rating} size={16} />
          {myReview.comment && <p className="mt-2 text-[13px] text-ink-soft">{myReview.comment}</p>}
        </div>
      ) : (
        <div>
          <p className="mb-2 text-[13px] text-ink-soft">{t('review.prompt', { name: revieweeName })}</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const idx = i + 1;
              const active = idx <= (hoverRating || rating);
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`${idx} star`}
                  onMouseEnter={() => setHoverRating(idx)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(idx)}
                  className="p-0.5"
                >
                  <Star size={22} className={cn(active ? 'fill-warning text-warning' : 'text-line-strong')} />
                </button>
              );
            })}
          </div>
          <Textarea className="mt-3" label={t('review.commentLabel')} rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
          {error && <p className="mt-2 text-[12px] font-medium text-danger">{error}</p>}
          <Button className="mt-3" size="sm" loading={busy} disabled={rating < 1} onClick={onSubmit}>
            {t('review.submit')}
          </Button>
        </div>
      )}

      {received.data && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-ink">
            {t('review.receivedHeading', { name: received.data.from.name ?? '' })}
          </p>
          <StarRow rating={received.data.rating} />
          {received.data.comment && <p className="mt-1 text-[13px] text-ink-soft">{received.data.comment}</p>}
        </div>
      )}
    </Card>
  );
}
