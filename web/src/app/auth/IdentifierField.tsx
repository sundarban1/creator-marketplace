import { useState, type ComponentProps, type KeyboardEvent } from 'react';
import { TextField } from '../ui/TextField';
import { cn } from '../ui/cn';

// Same list as mobile's login screen (mobile/src/app/(auth)/login.tsx).
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com'];

type IdentifierFieldProps = Omit<ComponentProps<typeof TextField>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (v: string) => void;
};

/**
 * Email/phone TextField with an email-domain autocomplete dropdown: once the
 * user types "@", common domains matching what follows it are offered.
 * Arrow keys + Enter/Tab pick a suggestion, Escape dismisses.
 */
export function IdentifierField({ value, onValueChange, onFocus, onBlur, onKeyDown, ...rest }: IdentifierFieldProps) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(0);

  const atIndex = value.indexOf('@');
  const localPart = value.slice(0, atIndex);
  const domainPart = value.slice(atIndex + 1).toLowerCase();
  const suggestions =
    focused && !dismissed && atIndex > 0 && !domainPart.includes('.')
      ? EMAIL_DOMAINS.filter((d) => d.startsWith(domainPart))
      : [];

  function pick(domain: string) {
    onValueChange(`${localPart}@${domain}`);
    setDismissed(true);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        pick(suggestions[Math.min(active, suggestions.length - 1)]);
        return;
      }
      if (e.key === 'Escape') {
        setDismissed(true);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <TextField
        {...rest}
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setDismissed(false);
          setActive(0);
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-autocomplete="list"
      />
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-lg"
        >
          {suggestions.map((domain, i) => (
            <li
              key={domain}
              role="option"
              aria-selected={i === active}
              // mousedown + preventDefault so the input doesn't blur (and unmount the list) before the pick.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(domain);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'cursor-pointer truncate px-3.5 py-2 text-[15px] text-ink',
                i === active && 'bg-brand/10',
              )}
            >
              {localPart}
              <span className="font-semibold">@{domain}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
