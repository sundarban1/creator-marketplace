import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchCompetitions } from '../api/competitions';
import { CompetitionCard } from './parts';

/** Up to three live competitions above the events browser. Renders nothing when there are none. */
export function CompetitionsStrip() {
  const t = useT();
  const res = useAsync((s) => fetchCompetitions({ tab: 'open', limit: 3 }, s), []);
  if (!res.data?.items.length) return null;
  return (
    <section className="mb-6" aria-labelledby="competitions-strip">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="competitions-strip" className="text-[16px] font-semibold text-ink">{t('comp.stripTitle')}</h2>
        <Link to="/creator/competitions" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-orange hover:underline">
          {t('comp.seeAll')} <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {res.data.items.map((c) => <CompetitionCard key={c.id} c={c} href={`/creator/competitions/${c.id}`} />)}
      </div>
    </section>
  );
}
