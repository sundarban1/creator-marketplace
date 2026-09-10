import { useAppLanguage, type Lang } from '../i18n';
import { cn } from './cn';

const LABELS: Record<Lang, string> = { en: 'EN', ne: 'नेपाली' };

/** Compact EN / नेपाली toggle. Persists via AppLanguageProvider (spec §44–45). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useAppLanguage();

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-line-strong bg-surface p-0.5',
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {(Object.keys(LABELS) as Lang[]).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={language === lang}
          className={cn(
            'rounded-full px-3 py-1 text-[13px] font-semibold transition-colors',
            language === lang ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink',
          )}
        >
          {LABELS[lang]}
        </button>
      ))}
    </div>
  );
}
