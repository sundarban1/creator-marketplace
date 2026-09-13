import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Send } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchFaqs, submitSupportContact, type FaqItem } from '../api/support';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';

const TOPIC_MAX_LEN = 80;

function FaqAccordionItem({ faq }: { faq: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[14px] font-medium text-ink">{faq.question}</span>
        <ChevronDown size={16} className={`flex-shrink-0 text-ink-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="whitespace-pre-wrap pt-2 text-[13.5px] leading-relaxed text-ink-soft">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HelpSupportPage() {
  const t = useT();
  const faqs = useAsync((s) => fetchFaqs(s), []);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError(t('helpSupport.errorMessageRequired'));
      return;
    }
    if (trimmed.length < 10) {
      setError(t('helpSupport.errorMessageTooShort'));
      return;
    }
    setError(null);
    setStatus('sending');
    try {
      const topic = trimmed.length > TOPIC_MAX_LEN ? `${trimmed.slice(0, TOPIC_MAX_LEN)}…` : trimmed;
      await submitSupportContact(topic, trimmed);
      setStatus('sent');
      setMessage('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('helpSupport.title')} description={t('helpSupport.subtitle')} />

      <Card>
        <CardHeader title={t('helpSupport.faqHeading')} />
        {faqs.loading ? (
          <Skeleton className="h-32 w-full" />
        ) : faqs.error ? (
          <EmptyState variant="error" title={t('helpSupport.loadError')} action={{ label: t('common.retry'), onClick: faqs.reload }} />
        ) : !faqs.data || faqs.data.length === 0 ? (
          <p className="py-2 text-[13.5px] text-ink-soft">{t('helpSupport.faqEmpty')}</p>
        ) : (
          <div>
            {faqs.data.map((faq) => (
              <FaqAccordionItem key={faq.id} faq={faq} />
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title={t('helpSupport.contactHeading')} />
        <p className="-mt-2 mb-4 text-[13px] text-ink-soft">{t('helpSupport.contactSub')}</p>

        {status === 'sent' ? (
          <Alert tone="success">
            <span className="block font-semibold">{t('helpSupport.sendSuccessTitle')}</span>
            <span className="block text-[12.5px] font-normal">{t('helpSupport.sendSuccessBody')}</span>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              label={t('helpSupport.messageLabel')}
              placeholder={t('helpSupport.messagePlaceholder')}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              error={error ?? undefined}
              rows={4}
            />
            {status === 'error' && <Alert tone="error">{t('helpSupport.sendError')}</Alert>}
            <Button type="submit" loading={status === 'sending'}>
              <Send size={14} />
              {status === 'sending' ? t('helpSupport.sendingButton') : t('helpSupport.sendButton')}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
