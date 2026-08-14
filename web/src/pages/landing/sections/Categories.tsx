import { motion } from 'framer-motion';
import { fadeUp, stagger, VP, PILL_HOVER } from '../lib/motion';
import { useLandingLanguage } from '../context/LanguageContext';
import { getCategoryStyle } from '../lib/categoryIcons';
import { getIconOption } from '../../../lib/iconOptions';
import { TextReveal } from '../components/TextReveal';
import type { LandingStats } from '../../../lib/api';

const PER_ROW = 5;

interface Pill {
  name: string;
  icon: ReturnType<typeof getCategoryStyle>['icon'];
  color: string;
}

export function Categories({ stats }: { stats: LandingStats | null }) {
  const { d } = useLandingLanguage();
  // Real categories come from the DB (English only, no per-language
  // translation there), including the admin-picked `icon`/`color` — falls
  // back to the static translated list + name-matched styling until the
  // live fetch resolves or if it fails.
  const list: Pill[] = stats
    ? stats.categories.map((c) => ({ name: c.name, icon: getIconOption(c.icon)?.Icon ?? getCategoryStyle(c.name).icon, color: c.color }))
    : d.categories.list.map((name) => ({ name, ...getCategoryStyle(name) }));
  // Grouped into fixed rows of 5 (4 on the last row if it doesn't divide
  // evenly) instead of one long flowing/scrolling strip.
  const rows: Pill[][] = [];
  for (let i = 0; i < list.length; i += PER_ROW) rows.push(list.slice(i, i + PER_ROW));

  return (
    <section id="categories" className="bg-paper py-28 dark:bg-ink">
      <div className="mx-auto mb-14 max-w-3xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white/60">
            {d.categories.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.categories.heading}
            delay={0.1}
            className="mt-3 whitespace-nowrap font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6"
      >
        {rows.map((row, ri) => (
          <div key={ri} className="flex flex-wrap justify-center gap-2">
            {row.map(({ name, icon: Icon, color }, i) => {
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={PILL_HOVER}
                  className="group flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 shadow-[0_2px_8px_rgba(20,17,16,0.03)] transition-shadow duration-300 hover:shadow-[0_14px_28px_-10px_rgba(20,17,16,0.16)] dark:border-white/10 dark:bg-ink-elevated"
                >
                  <span
                    style={{ backgroundColor: `${color}1A`, color, boxShadow: `0 4px 10px -2px ${color}66` }}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                  >
                    <Icon size={12} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-semibold text-ink dark:text-white/80">{name}</span>
                </motion.div>
              );
            })}
          </div>
        ))}
      </motion.div>
    </section>
  );
}
