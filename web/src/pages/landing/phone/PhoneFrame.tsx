import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { PHONE } from '../constants';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface PhoneFrameProps {
  children: ReactNode;
  glow?: [string, string];
  /** Cursor-driven 3D tilt — only ever used by the Hero's own instance, never
   *  the ScrollStory instance (which is scroll-pinned), so the two animation
   *  systems never fight over the same element's transform. */
  tilt?: boolean;
  className?: string;
  /** Skip the synthetic notch overlay — for children (e.g. a real device
   *  screenshot) that already bake in their own status bar / dynamic island. */
  hideNotch?: boolean;
}

export function PhoneFrame({ children, glow = ['#4F46E5', '#F97316'], tilt = false, className = '', hideNotch = false }: PhoneFrameProps) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 16 });
  const sy = useSpring(my, { stiffness: 120, damping: 16 });
  // Capped to ~9deg either way — enough to read as "alive," not a gimmick.
  const rotateX = useTransform(sy, [-1, 1], [9, -9]);
  const rotateY = useTransform(sx, [-1, 1], [-9, 9]);

  function onMouseMove(e: React.MouseEvent) {
    if (!tilt || reducedMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function onMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* Soft glow */}
      <div
        className="absolute inset-[-28px] rounded-[4rem] blur-3xl opacity-40 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${glow[0]}, ${glow[1]})` }}
      />
      <motion.div
        style={tilt && !reducedMotion ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
        className="relative"
      >
        <div
          className="relative border-[6px] border-gray-950 bg-gray-950 overflow-hidden"
          style={{
            width: PHONE.width,
            height: PHONE.height,
            borderRadius: PHONE.borderRadius,
            boxShadow: '0 30px 60px -15px rgba(0,0,0,0.5), 0 10px 20px -5px rgba(0,0,0,0.3)',
          }}
        >
          {!hideNotch && (
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[96px] h-[24px] bg-black rounded-full z-30" />
          )}
          {children}
          <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none z-20" />
        </div>
      </motion.div>
    </div>
  );
}
