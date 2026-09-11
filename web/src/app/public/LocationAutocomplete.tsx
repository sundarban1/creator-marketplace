import { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { usePlacesAutocomplete, type PlacePrediction } from '../lib/usePlacesAutocomplete';
import { cn } from '../ui/cn';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Location text field backed by Google Places autocomplete (Nepal-restricted).
 * Free typing still works and still filters — the dropdown is an assist, not a
 * gate. Falls back to a plain input when the Maps script can't load.
 */
export function LocationAutocomplete({ value, onChange, placeholder, ariaLabel, className }: Props) {
  const { ready, getPredictions, resetSession } = usePlacesAutocomplete();
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const focusedRef = useRef(false);
  const justSelectedRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!ready || !focusedRef.current || !value.trim() || justSelectedRef.current) {
      setPredictions([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const next = await getPredictions(value);
      if (!cancelled) {
        setPredictions(next);
        setActive(-1);
        if (focusedRef.current) setOpen(true);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [value, ready, getPredictions]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const select = (p: PlacePrediction) => {
    justSelectedRef.current = true;
    onChange(p.description);
    resetSession();
    setPredictions([]);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % predictions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? predictions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      select(predictions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <MapPin
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
      />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        onChange={(e) => {
          justSelectedRef.current = false;
          onChange(e.target.value);
        }}
        onFocus={() => {
          focusedRef.current = true;
          if (predictions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          focusedRef.current = false;
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'h-11 w-full rounded-xl border border-line-strong bg-surface pl-10 pr-3.5 text-[14px] text-ink',
          'placeholder:text-ink-soft/60 transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/35',
          className,
        )}
      />
      {open && predictions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-line-strong bg-surface py-1 shadow-[0_16px_40px_-12px_rgba(20,17,16,0.28)]"
        >
          {predictions.map((p, i) => (
            <li
              key={p.placeId}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(p)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-ink',
                i === active && 'bg-surface-dim',
              )}
            >
              <MapPin size={14} className="flex-shrink-0 text-ink-soft" />
              <span className="truncate">{p.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
