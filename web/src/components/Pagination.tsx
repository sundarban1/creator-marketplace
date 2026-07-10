import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page:       number;
  totalPages: number;
  total:      number;
  limit:      number;
  onChange:   (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  // Windowed page numbers around the current page, capped to a handful of buttons.
  const pages: number[] = [];
  const windowSize = 5;
  let from = Math.max(1, page - Math.floor(windowSize / 2));
  const to  = Math.min(totalPages, from + windowSize - 1);
  from = Math.max(1, to - windowSize + 1);
  for (let p = from; p <= to; p++) pages.push(p);

  return (
    <div className="flex items-center justify-between gap-4 px-1 pt-4 flex-wrap">
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{start}–{end}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {from > 1 && <span className="px-1.5 text-xs text-gray-400">…</span>}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-colors ${
              p === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        {to < totalPages && <span className="px-1.5 text-xs text-gray-400">…</span>}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
