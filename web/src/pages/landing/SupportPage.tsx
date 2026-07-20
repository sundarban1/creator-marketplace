import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LifeBuoy } from 'lucide-react';
import { StandalonePageShell } from './StandalonePageShell';
import { useLandingLanguage } from './context/LanguageContext';
import { fadeUp, stagger } from './lib/motion';
import { ContactForm } from './components/ContactForm';
import { api, type HelpArticle } from '../../lib/api';
import { SEO } from '../../lib/seo/SEO';
import { faqSchema, webPageSchema } from '../../lib/seo/schema';

function FaqAccordionItem({ faq }: { faq: HelpArticle }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="border-b border-ink/10 py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="font-serif text-lg text-ink">{faq.question}</span>
        <ChevronDown size={18} className={`flex-shrink-0 text-ink-soft transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="whitespace-pre-wrap pt-3 text-[15px] leading-relaxed text-ink-soft">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SupportContent() {
  const { d } = useLandingLanguage();
  const [faqs, setFaqs] = useState<HelpArticle[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public.faqs()
      .then((res) => { if (!cancelled) setFaqs(res.data); })
      .catch(() => { if (!cancelled) setFaqs([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.div initial="hidden" animate="show" variants={stagger()}>
      <SEO
        title="Support & FAQs"
        description="Get help with Kolab, Nepal's creator marketplace. Find answers to common questions or contact our support team directly."
        path="/support"
        jsonLd={[
          webPageSchema({ path: '/support', title: 'Support & FAQs | Kolab', description: 'Help and frequently asked questions for Kolab users.' }),
          ...(faqs && faqs.length > 0 ? [faqSchema(faqs.map((f) => ({ question: f.question, answer: f.answer })))] : []),
        ]}
      />
      <motion.p variants={fadeUp} className="font-serif text-sm italic text-ink-soft">
        <a href="/" className="hover:text-ink">{d.legalPages.backToHome}</a>
      </motion.p>

      <motion.div variants={fadeUp} className="mt-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet/10 text-violet">
          <LifeBuoy size={18} />
        </span>
        <h1 className="text-balance font-serif text-4xl font-medium tracking-tight text-ink sm:text-5xl">
          {d.supportPage.title}
        </h1>
      </motion.div>
      <motion.p variants={fadeUp} className="mt-4 max-w-lg text-ink-soft">
        {d.supportPage.subtitle}
      </motion.p>

      <motion.h2 variants={fadeUp} className="mt-14 font-serif text-sm italic text-ink-soft">
        {d.supportPage.faqHeading}
      </motion.h2>

      <div className="mt-2 border-t border-ink/10">
        {faqs === null ? (
          <div className="space-y-6 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 w-2/3 rounded bg-ink/10" />
              </div>
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <motion.p variants={fadeUp} className="py-8 text-sm text-ink-soft">{d.supportPage.faqEmpty}</motion.p>
        ) : (
          faqs.map((faq) => <FaqAccordionItem key={faq.id} faq={faq} />)
        )}
      </div>

      <motion.div variants={fadeUp} className="mt-16 rounded-3xl bg-ink px-6 py-10 text-white sm:px-10">
        <h2 className="font-serif text-2xl italic text-white/90">{d.supportPage.contactHeading}</h2>
        <p className="mt-2 text-sm text-white/50">{d.supportPage.contactSub}</p>
        <div className="mt-8">
          <ContactForm />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SupportPage() {
  return (
    <StandalonePageShell>
      <SupportContent />
    </StandalonePageShell>
  );
}
