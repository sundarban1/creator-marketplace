import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkle } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Spark {
  id: number;
  x: number;
  y: number;
  size: number;
  rotate: number;
  color: string;
}

const COLORS = ['#5B2ED6', '#4C1D95', '#9A3412', '#3A1E86'];
const MIN_DISTANCE = 24;
const MIN_INTERVAL = 70;
const MAX_SPARKS = 14;
const LIFETIME = 700;

export function CursorSparkles() {
  const reducedMotion = useReducedMotion();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const idRef = useRef(0);
  const lastRef = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    function onMove(e: MouseEvent) {
      const now = Date.now();
      const last = lastRef.current;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (now - last.t < MIN_INTERVAL || dist < MIN_DISTANCE) return;

      lastRef.current = { x: e.clientX, y: e.clientY, t: now };
      const id = idRef.current++;
      const spark: Spark = {
        id,
        x: e.clientX,
        y: e.clientY,
        size: 10 + Math.random() * 10,
        rotate: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      };
      setSparks((prev) => [...prev.slice(-(MAX_SPARKS - 1)), spark]);
      setTimeout(() => {
        setSparks((prev) => prev.filter((s) => s.id !== id));
      }, LIFETIME);
    }

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[999]">
      <AnimatePresence>
        {sparks.map((s) => (
          <motion.span
            key={s.id}
            initial={{ opacity: 1, scale: 0, x: s.x, y: s.y, rotate: s.rotate }}
            animate={{ opacity: 0, scale: 1.3, x: s.x, y: s.y - 26, rotate: s.rotate + 50 }}
            exit={{ opacity: 0 }}
            transition={{ duration: LIFETIME / 1000, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', left: 0, top: 0, color: s.color }}
            className="-ml-2 -mt-2"
          >
            <Sparkle size={s.size} fill={s.color} strokeWidth={0} />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
