import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUp } from '../lib/motion';

export interface FAQItem {
  question: string;
  answer: string;
}

// Same accordion pattern as SupportPage's FAQ list, generalized so the new
// SEO content pages can reuse it without depending on the API-driven
// HelpArticle shape SupportPage uses.
function FAQAccordionItem({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="border-b border-ink/10 py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span className="font-serif text-lg text-ink">{item.question}</span>
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
            <p className="whitespace-pre-wrap pt-3 text-[15px] leading-relaxed text-ink-soft">{item.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div className="border-t border-ink/10">
      {items.map((item, i) => (
        <FAQAccordionItem key={i} item={item} />
      ))}
    </div>
  );
}
