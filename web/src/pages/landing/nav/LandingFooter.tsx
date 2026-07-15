import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Send } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { api } from '../../../lib/api';

function ContactForm() {
  const { d } = useLandingLanguage();
  const t = d.footer.contactForm;
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    try {
      await api.support.submitPublicContact(form);
      setStatus('success');
      setForm({ name: '', email: '', topic: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-white">{t.successTitle}</p>
          <p className="text-xs text-white/50">{t.successSub}</p>
        </div>
      </div>
    );
  }

  const fieldClass = 'border-b border-white/20 bg-transparent px-0.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none';

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={t.namePlaceholder} className={fieldClass} />
      <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder={t.emailPlaceholder} className={fieldClass} />
      <input required value={form.topic} onChange={(e) => update('topic', e.target.value)} placeholder={t.topicPlaceholder} className={`sm:col-span-2 ${fieldClass}`} />
      <textarea
        required
        minLength={10}
        rows={2}
        value={form.message}
        onChange={(e) => update('message', e.target.value)}
        placeholder={t.messagePlaceholder}
        className={`resize-none sm:col-span-2 ${fieldClass}`}
      />
      {status === 'error' && <p className="text-xs text-red-400 sm:col-span-2">{t.errorGeneric}</p>}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-2 flex items-center justify-center gap-2 rounded-md border border-white/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:border-white disabled:opacity-60 sm:col-span-2"
      >
        <Send size={13} />
        {status === 'submitting' ? t.submittingBtn : t.submitBtn}
      </button>
    </form>
  );
}

export function LandingFooter() {
  const { d } = useLandingLanguage();

  return (
    <footer id={SECTION_IDS.contact} className="relative bg-ink py-16 text-white">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="mx-auto max-w-5xl px-5">
        <div className="grid gap-12 md:grid-cols-2">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
            <motion.div variants={fadeUp} className="mb-3 flex w-fit items-center rounded-full bg-white py-2 pl-3 pr-4">
              <img src="/logo.png" alt="kolab" className="h-5 w-auto object-contain" />
            </motion.div>
            <motion.p variants={fadeUp} className="max-w-xs text-sm leading-relaxed text-white/50">
              {d.footer.tagline}
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
              <a href="/legal/privacy" className="transition-colors hover:text-white">{d.footer.privacy}</a>
              <a href="/legal/terms" className="transition-colors hover:text-white">{d.footer.terms}</a>
              <a href="/help-center" className="transition-colors hover:text-white">{d.footer.support}</a>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp}>
            <h3 className="mb-5 font-serif text-lg italic text-white/70">{d.footer.contactForm.heading}</h3>
            <ContactForm />
          </motion.div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 md:flex-row">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} kolab. {d.footer.rights}</p>
          <p className="text-xs text-white/40">{d.footer.madeIn} 🇳🇵</p>
        </div>
      </div>
    </footer>
  );
}
