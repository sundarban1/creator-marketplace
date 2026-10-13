import { useState, type FormEvent } from 'react';
import { MessageCircleQuestion, Pencil, Send, Trophy } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useLiveRefresh } from '../lib/liveUpdates';
import { ApiError } from '../lib/apiClient';
import { answerEventQuestion, askEventQuestion, fetchEventQuestions, type EventQuestion } from '../api/campaigns';
import { DashCard, DashCardHeader } from '../creator/dash-ui/DashCard';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';

const QUESTION_MAX = 1000;
const ANSWER_MAX = 2000;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Free-event Q&A ("Ask Organizer") — the web twin of mobile's
 * event-questions.tsx. A free event (OPEN_EVENT) never opens a chat, so this
 * shared page is how the organizer and accepted creators communicate. Same
 * panel for both roles: accepted creators ask, the owning business answers.
 * Render only for an OPEN_EVENT where the viewer is the owner or accepted —
 * anyone else gets a 403, shown as the no-access note.
 */
export function EventQuestionsPanel({
  campaignId,
  variant,
  celebrate = false,
}: {
  campaignId: string;
  variant: 'creator' | 'business';
  /** Adds the "You're invited" banner on top — the accepted creator's confirmation. */
  celebrate?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const isBusiness = variant === 'business';
  const questions = useAsync((s) => fetchEventQuestions(campaignId, s), [campaignId]);
  useLiveRefresh([`campaign:${campaignId}`], questions.refresh);

  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [answerTarget, setAnswerTarget] = useState<EventQuestion | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [savingAnswer, setSavingAnswer] = useState(false);

  const noAccess = questions.error instanceof ApiError && questions.error.status === 403;
  const list = questions.data ?? [];

  async function submitQuestion(e: FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    if (q.length > QUESTION_MAX) {
      toast.error(t('eventQuestions.questionTooLong'));
      return;
    }
    setPosting(true);
    try {
      await askEventQuestion(campaignId, q);
      setDraft('');
      toast.success(t('eventQuestions.askedToast'));
      questions.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setPosting(false);
    }
  }

  function openAnswer(q: EventQuestion) {
    setAnswerTarget(q);
    setAnswerDraft(q.answer ?? '');
  }

  async function saveAnswer() {
    if (!answerTarget) return;
    const a = answerDraft.trim();
    if (!a) return;
    if (a.length > ANSWER_MAX) {
      toast.error(t('eventQuestions.answerTooLong'));
      return;
    }
    setSavingAnswer(true);
    try {
      await answerEventQuestion(campaignId, answerTarget.id, a);
      toast.success(t('eventQuestions.answeredToast'));
      setAnswerTarget(null);
      questions.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSavingAnswer(false);
    }
  }

  return (
    <DashCard className="mt-6">
      {celebrate && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft/50 px-4 py-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <Trophy size={16} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-ink">{t('eventQuestions.invitedTitle')}</p>
            <p className="text-[12.5px] text-ink-soft">{t('eventQuestions.invitedSub')}</p>
          </div>
        </div>
      )}

      <DashCardHeader title={isBusiness ? t('eventQuestions.viewQuestions') : t('eventQuestions.title')} />
      <p className="-mt-2 mb-4 text-[13px] text-ink-soft">
        {isBusiness ? t('eventQuestions.headerBusiness') : t('eventQuestions.headerCreator')}
      </p>

      {questions.loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : noAccess ? (
        <p className="rounded-xl bg-surface-dim px-4 py-3 text-[13px] text-ink-soft">{t('eventQuestions.noAccess')}</p>
      ) : questions.error ? (
        <EmptyState
          variant="error"
          size="sm"
          title={t('eventQuestions.loadError')}
          action={{ label: t('common.retry'), onClick: questions.reload }}
        />
      ) : list.length === 0 ? (
        <EmptyState
          variant="empty"
          size="sm"
          icon={<MessageCircleQuestion size={24} strokeWidth={1.75} />}
          title={t('eventQuestions.empty')}
          description={isBusiness ? undefined : t('eventQuestions.emptyCreatorHint')}
        />
      ) : (
        <ul className="space-y-3">
          {list.map((q) => (
            <li key={q.id} className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">
                {q.isMine
                  ? t('eventQuestions.youAsked')
                  : isBusiness && q.askerName
                    ? q.askerName
                    : t('eventQuestions.aCreatorAsked')}
                <span className="ml-2 font-normal normal-case tracking-normal">{fmtDate(q.createdAt)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink">{q.question}</p>

              {q.answer ? (
                <div className="mt-3 rounded-lg bg-violet/[0.06] px-3 py-2.5">
                  <p className="text-[11.5px] font-semibold text-violet-dark">{t('eventQuestions.organizerAnswer')}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-ink">{q.answer}</p>
                </div>
              ) : (
                !isBusiness && <p className="mt-2 text-[12.5px] italic text-ink-soft">{t('eventQuestions.notAnsweredYet')}</p>
              )}

              {isBusiness && (
                <Button variant={q.answer ? 'ghost' : 'secondary'} size="sm" className="mt-3" onClick={() => openAnswer(q)}>
                  <Pencil size={13} />
                  {q.answer ? t('eventQuestions.editAnswer') : t('eventQuestions.answerThis')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isBusiness && !noAccess && !questions.loading && !questions.error && (
        <form onSubmit={submitQuestion} className="mt-4 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={QUESTION_MAX}
            rows={2}
            placeholder={t('eventQuestions.composerPlaceholder')}
            aria-label={t('eventQuestions.composerPlaceholder')}
            className="min-h-[44px] flex-1 resize-y rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink focus:border-violet/40 focus:outline-none focus:ring-2 focus:ring-violet/20"
          />
          <Button type="submit" loading={posting} disabled={!draft.trim()}>
            <Send size={14} />
            {t('eventQuestions.send')}
          </Button>
        </form>
      )}

      <Modal
        open={!!answerTarget}
        onClose={() => (savingAnswer ? null : setAnswerTarget(null))}
        title={t('eventQuestions.answerModalTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAnswerTarget(null)} disabled={savingAnswer}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveAnswer} loading={savingAnswer} disabled={!answerDraft.trim()}>
              {t('eventQuestions.submitAnswer')}
            </Button>
          </div>
        }
      >
        {answerTarget && (
          <div className="space-y-3">
            <p className="whitespace-pre-wrap rounded-xl bg-surface-dim px-3.5 py-2.5 text-[13.5px] text-ink">
              {answerTarget.question}
            </p>
            <Textarea
              label={t('eventQuestions.organizerAnswer')}
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              maxLength={ANSWER_MAX}
              showCount
              rows={5}
              placeholder={t('eventQuestions.answerPlaceholder')}
            />
          </div>
        )}
      </Modal>
    </DashCard>
  );
}
