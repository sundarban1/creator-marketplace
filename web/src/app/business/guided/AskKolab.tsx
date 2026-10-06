import { useRef, useState } from 'react';
import { Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { Textarea } from '../../ui/Textarea';
import { Alert } from '../../ui/Alert';
import { askKolab } from '../../api/business';
import { toAiContext, type GuidedForm, type GuidedStep } from './guidedModel';

// "✨ Ask Kolab" (UX spec §17) — a quiet co-pilot, not a chatbot: one
// question, one answer about THIS campaign, with a few starter questions that
// fit the step the business is on.

const SUGGESTION_STEPS = ['basics', 'creators', 'content', 'budget', 'requirements', 'review'] as const;

function suggestionsFor(step: GuidedStep): string[] {
  const key = (SUGGESTION_STEPS as readonly string[]).includes(step) ? step : 'basics';
  return [1, 2, 3].map((n) => `guided.askQ_${key}_${n}`);
}

export function AskKolabButton({ step, form }: { step: GuidedStep; form: GuidedForm }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ q: string; text: string; fallback: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Ignore an answer that arrives after the panel was closed or re-asked.
  const seq = useRef(0);

  const ask = async (q: string) => {
    const text = q.trim();
    if (text.length < 3 || busy) return;
    const id = ++seq.current;
    setBusy(true); setError(''); setQuestion(text);
    try {
      const r = await askKolab(text, step, toAiContext(form));
      if (id === seq.current) setAnswer({ q: text, text: r.answer, fallback: r.fallback });
    } catch {
      if (id === seq.current) setError(t('guided.askError'));
    } finally {
      if (id === seq.current) setBusy(false);
    }
  };

  const close = () => { seq.current++; setBusy(false); setOpen(false); };
  const reset = () => { setAnswer(null); setQuestion(''); setError(''); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-full border border-violet/25 bg-violet/[0.06] px-3 text-[13px] font-semibold text-violet-dark transition-colors hover:bg-violet/[0.12]"
      >
        <Sparkles size={14} />
        {t('guided.askKolab')}
      </button>
      <Modal open={open} onClose={close} title={t('guided.askKolab')}>
        {answer ? (
          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-ink-soft">{answer.q}</p>
            <div className="rounded-2xl border border-violet/20 bg-violet/[0.05] px-4 py-3">
              <p className="flex gap-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">
                <Sparkles size={15} className="mt-1 flex-shrink-0 text-violet" />
                <span>{answer.text}</span>
              </p>
            </div>
            <p className="text-[12px] text-ink-soft">{answer.fallback ? t('guided.askFallbackNote') : t('guided.askDisclaimer')}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={reset}><RotateCcw size={14} />{t('guided.askAnother')}</Button>
              <Button type="button" onClick={close}>{t('guided.done')}</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void ask(question); }}>
            <p className="text-[14px] text-ink-soft">{t('guided.askIntro')}</p>
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{t('guided.askTryThese')}</p>
              <div className="flex flex-wrap gap-2">
                {suggestionsFor(step).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={busy}
                    onClick={() => void ask(t(k))}
                    className="min-h-[36px] rounded-full border border-line px-3 text-left text-[13px] text-ink transition-colors hover:border-violet/40 hover:bg-violet/[0.04] disabled:opacity-60"
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              label=""
              aria-label={t('guided.askKolab')}
              rows={2}
              maxLength={500}
              value={question}
              placeholder={t('guided.askPlaceholder')}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(question); } }}
            />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex items-center justify-end gap-3">
              {busy && <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft"><Loader2 size={14} className="animate-spin" />{t('guided.askThinking')}</span>}
              <Button type="submit" loading={busy} disabled={question.trim().length < 3}>{t('guided.askSend')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
