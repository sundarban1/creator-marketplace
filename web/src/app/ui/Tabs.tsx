import { cn } from './cn';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

/**
 * Horizontal tab bar (scrolls on overflow). Controlled — the parent owns the
 * active value, usually from a URL search param.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-line', className)}>
      <div className="-mb-px flex gap-1 overflow-x-auto scrollbar-hide" role="tablist">
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] font-medium transition-colors',
                active
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-soft hover:text-ink',
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    active ? 'bg-brand/12 text-brand' : 'bg-surface-dim text-ink-soft',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
