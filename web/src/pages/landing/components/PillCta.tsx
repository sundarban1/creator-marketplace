import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// The landing page's CTA (similarweb.com-style): a rounded pill in one of a
// few fills. `gradient` (brinjal → saffron, the brand run) is the headline
// action, `brinjal` the solid primary, `green` for business-side actions
// (the app's business colour), `white` / `outline-white` for dark sections
// and `outline` for light ones.
type Tone = 'gradient' | 'brinjal' | 'green' | 'white' | 'outline-white' | 'outline';

const TONES: Record<Tone, string> = {
  gradient:
    'bg-gradient-to-r from-lp-brinjal via-[#8B5CF6] to-lp-orange text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.7)] hover:brightness-110',
  brinjal: 'bg-lp-brinjal text-white shadow-[0_10px_30px_-12px_rgba(79,70,229,0.8)] hover:bg-[#5B52F0]',
  green: 'bg-lp-green text-white hover:bg-lp-green-dark',
  white: 'bg-white text-lp-black hover:bg-white/90',
  'outline-white': 'border border-white/50 text-white hover:border-white hover:bg-white/10',
  outline:
    'border border-lp-black/20 text-lp-black hover:border-lp-brinjal hover:text-lp-brinjal dark:border-white/30 dark:text-white dark:hover:border-white',
};

export function pillCtaClass(tone: Tone = 'brinjal', size: 'md' | 'lg' = 'md') {
  return `inline-flex items-center justify-center gap-2 rounded-full font-body font-medium tracking-[0.01em] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-glow ${
    size === 'lg' ? 'h-12 px-7 text-[15px]' : 'h-10 px-5 text-sm'
  } ${TONES[tone]}`;
}

export function PillCta({
  to,
  children,
  tone = 'brinjal',
  size = 'md',
  rel,
  className = '',
}: {
  to: string;
  children: ReactNode;
  tone?: Tone;
  size?: 'md' | 'lg';
  rel?: string;
  className?: string;
}) {
  return (
    <Link to={to} rel={rel} className={`${pillCtaClass(tone, size)} ${className}`}>
      {children}
    </Link>
  );
}
