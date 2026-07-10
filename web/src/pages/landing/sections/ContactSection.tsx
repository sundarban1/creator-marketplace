import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Send } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { api } from '../../../lib/api';

export function ContactSection() {
  const { d } = useLandingLanguage();
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <section id={SECTION_IDS.contact} className="py-24 bg-gray-50">
      <div className="max-w-2xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-12">
          <motion.span variants={fadeUp} className="text-brand-indigo font-bold text-xs uppercase tracking-widest">{d.contact.eyebrow}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-3 mb-4">{d.contact.heading}</motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-base">{d.contact.sub}</motion.p>
        </motion.div>

        {status === 'success' ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-emerald-200 rounded-3xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{d.contact.successTitle}</h3>
            <p className="text-gray-500 text-sm">{d.contact.successSub}</p>
          </motion.div>
        ) : (
          <motion.form
            initial="hidden" whileInView="show" viewport={VP} variants={fadeUp}
            onSubmit={handleSubmit}
            className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{d.contact.nameLabel}</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder={d.contact.namePlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 focus:border-brand-indigo"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{d.contact.emailLabel}</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder={d.contact.emailPlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 focus:border-brand-indigo"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{d.contact.topicLabel}</label>
              <input
                required
                value={form.topic}
                onChange={(e) => update('topic', e.target.value)}
                placeholder={d.contact.topicPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 focus:border-brand-indigo"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{d.contact.messageLabel}</label>
              <textarea
                required
                minLength={10}
                rows={5}
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                placeholder={d.contact.messagePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 focus:border-brand-indigo"
              />
            </div>
            {status === 'error' && (
              <p className="text-red-600 text-sm">{d.contact.errorGeneric}</p>
            )}
            <motion.button
              type="submit"
              disabled={status === 'submitting'}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-indigo text-white font-bold text-sm disabled:opacity-60"
            >
              <Send size={15} />
              {status === 'submitting' ? d.contact.submittingBtn : d.contact.submitBtn}
            </motion.button>
          </motion.form>
        )}
      </div>
    </section>
  );
}
