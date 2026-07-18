import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useLandingLanguage } from '../context/LanguageContext';
import { api } from '../../../lib/api';

type ContactField = 'name' | 'email' | 'topic' | 'message';
type ContactErrors = Partial<Record<ContactField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared between the landing footer and the standalone Support page — same
// public /api/support/contact-public endpoint, same validation. `dark` picks
// the color variant: true for use on a dark surface (Support page's ink
// card), false for a light surface (the now-light footer).
export function ContactForm({ dark = true }: { dark?: boolean }) {
  const { d } = useLandingLanguage();
  const t = d.footer.contactForm;
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): ContactErrors {
    const next: ContactErrors = {};
    if (!form.name.trim()) next.name = t.errorNameRequired;
    if (!form.email.trim()) next.email = t.errorEmailRequired;
    else if (!EMAIL_RE.test(form.email.trim())) next.email = t.errorEmailInvalid;
    if (!form.topic.trim()) next.topic = t.errorTopicRequired;
    if (!form.message.trim()) next.message = t.errorMessageRequired;
    else if (form.message.trim().length < 10) next.message = t.errorMessageTooShort;
    return next;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus('submitting');
    try {
      await api.support.submitPublicContact(form);
      setStatus('success');
      setForm({ name: '', email: '', topic: '', message: '' });
      setErrors({});
    } catch {
      setStatus('error');
    }
  }

  const errorTextClass = dark ? 'text-red-400' : 'text-red-600';

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${dark ? 'border-white/10 bg-white/5' : 'border-ink/10 bg-ink/5'}`}>
        <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-400" />
        <div>
          <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-ink'}`}>{t.successTitle}</p>
          <p className={`text-xs ${dark ? 'text-white/50' : 'text-ink-soft'}`}>{t.successSub}</p>
        </div>
      </div>
    );
  }

  function fieldClass(field: ContactField) {
    return `w-full border-b bg-transparent px-0.5 py-2.5 text-sm focus-visible:outline-none ${
      dark ? 'text-white placeholder:text-white/30' : 'text-ink placeholder:text-ink-soft/60'
    } ${
      errors[field]
        ? 'border-red-400'
        : dark
          ? 'border-white/20 focus:border-white focus-visible:border-violet'
          : 'border-ink/20 focus:border-ink focus-visible:border-violet'
    }`;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={t.namePlaceholder} className={fieldClass('name')} />
        {errors.name && <p className={`mt-1 text-xs ${errorTextClass}`}>{errors.name}</p>}
      </div>
      <div>
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder={t.emailPlaceholder} className={fieldClass('email')} />
        {errors.email && <p className={`mt-1 text-xs ${errorTextClass}`}>{errors.email}</p>}
      </div>
      <div className="sm:col-span-2">
        <input value={form.topic} onChange={(e) => update('topic', e.target.value)} placeholder={t.topicPlaceholder} className={fieldClass('topic')} />
        {errors.topic && <p className={`mt-1 text-xs ${errorTextClass}`}>{errors.topic}</p>}
      </div>
      <div className="sm:col-span-2">
        <textarea
          rows={2}
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          placeholder={t.messagePlaceholder}
          className={`resize-none ${fieldClass('message')}`}
        />
        {errors.message && <p className={`mt-1 text-xs ${errorTextClass}`}>{errors.message}</p>}
      </div>
      {status === 'error' && <p className={`text-xs ${errorTextClass} sm:col-span-2`}>{t.errorGeneric}</p>}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className={`mt-2 flex items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:opacity-60 sm:col-span-2 ${
          dark ? 'border-white/30 text-white hover:border-white' : 'border-ink/30 text-ink hover:border-ink'
        }`}
      >
        <Send size={13} />
        {status === 'submitting' ? t.submittingBtn : t.submitBtn}
      </button>
    </form>
  );
}
