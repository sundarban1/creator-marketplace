import { useT } from '../i18n';

/**
 * Minimal single-series bar chart — web twin of mobile's charts/BarChart.
 * Plain HTML so the theme tokens (light/dark) apply without a chart library:
 * one hue, 2px gaps, 4px rounded data-ends on the baseline, value on hover,
 * and a visually-hidden table for screen readers.
 */
export function BarChart({
  data,
  format = (v) => v.toLocaleString('en-IN'),
  title,
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
  /** Accessible name for the chart / its data table. */
  title: string;
}) {
  const t = useT();
  const max = Math.max(0, ...data.map((d) => d.value));

  if (data.length === 0 || max === 0) {
    return <p className="py-10 text-center text-[13px] text-ink-soft">{t('analytics.noData')}</p>;
  }

  return (
    <figure>
      <div role="img" aria-label={title} className="flex h-48 items-end gap-[2px] border-b border-line">
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
            <div
              className="w-full max-w-[44px] rounded-t-[4px] bg-violet transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }}
            />
            {/* Hover target spans the full column so short bars stay easy to hit. */}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11.5px] font-medium text-surface opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
              {d.label}: {format(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {data.map((d, i) => (
          <span key={`${d.label}-${i}`} className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-soft">
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-${i}`}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
