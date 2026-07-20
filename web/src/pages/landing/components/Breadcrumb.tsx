import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

// Visual breadcrumb only — the matching BreadcrumbList JSON-LD is built
// separately via schema.ts's breadcrumbSchema() and passed to <SEO jsonLd=.
// Kept as two calls instead of one because not every page that wants the
// visual trail necessarily wants it in <SEO> (or vice versa), and schema
// needs the full absolute-URL item list while this only needs the last path
// to omit (current page isn't a link).
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.path} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="text-ink/25" />}
            {isLast ? (
              <span aria-current="page" className="font-medium text-ink">{item.name}</span>
            ) : (
              <Link to={item.path} className="transition-colors hover:text-ink">{item.name}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
