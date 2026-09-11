import { Search } from 'lucide-react';
import { cn } from './cn';

/**
 * Pill search field for the authed list pages (find creators, events,
 * applications…). Mirrors the public `BrowseHero` search — rounded-full, soft
 * shadow, violet focus ring — so browsing feels the same on both sides of login.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className="h-12 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-[15px] text-ink shadow-[0_10px_28px_-18px_rgba(20,17,16,0.28)] outline-none transition-colors placeholder:text-ink-soft/55 focus:border-violet/60"
      />
    </div>
  );
}
