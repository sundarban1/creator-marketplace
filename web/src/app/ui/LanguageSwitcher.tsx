import { useAppLanguage, type Lang } from '../i18n';
import { cn } from './cn';

const TARGET_LABELS: Record<Lang, string> = { en: 'EN', ne: 'ने' };
const TARGET_NAMES: Record<Lang, string> = { en: 'English', ne: 'नेपाली' };

/**
 * Single-button language toggle, matching the landing page's compact
 * LanguageSwitch (a pill showing only the language you'll *switch to*, not a
 * two-option segmented control) so the header stays out of the way on mobile.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useAppLanguage();
  const target = language === 'en' ? 'ne' : 'en';

  return (
    <button
      type="button"
      onClick={() => setLanguage(target)}
      aria-label={`Switch to ${TARGET_NAMES[target]}`}
      className={cn(
        'flex h-8 min-w-8 items-center justify-center rounded-full border border-line-strong bg-surface px-2 text-[12px] font-semibold uppercase tracking-wide text-ink-soft transition-colors hover:text-ink',
        className,
      )}
    >
      {TARGET_LABELS[target]}
    </button>
  );
}
