import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useT } from '../i18n';
import { suggestEventDescription } from '../api/campaigns';

/**
 * "Suggest" — AI-drafts the event description from what's already filled in.
 * Web twin of mobile create-campaign.tsx's suggestDescription; sits in the
 * description Textarea's labelAccessory slot.
 */
export function SuggestDescriptionButton({
  input,
  onSuggested,
  onError,
}: {
  input: { title?: string; category?: string; platform?: string; deliverables?: string };
  onSuggested: (description: string) => void;
  onError: (message: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const hasContext = Boolean(input.title?.trim() || input.category || input.deliverables?.trim());

  async function suggest() {
    setBusy(true);
    try {
      onSuggested(
        await suggestEventDescription({
          title: input.title?.trim() || undefined,
          category: input.category || undefined,
          platform: input.platform || undefined,
          deliverables: input.deliverables?.trim() || undefined,
        }),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : t('eventExtras.suggestFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={suggest}
      disabled={busy || !hasContext}
      title={hasContext ? undefined : t('eventExtras.suggestNeedsTitle')}
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-violet-dark hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
      {t('eventExtras.suggestDescription')}
    </button>
  );
}
