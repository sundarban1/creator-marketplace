import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../../../app/ui/cn';

// Minimal local port of shadcn/ui's Card — just the structural primitive
// (rounded surface + header/content slots), not the full shadcn CLI/theme
// setup. Pulled in only for the "Why it feels this way" stacking deck so its
// markup reads the same way shadcn's own card examples do; every visual
// effect (stacking, scale, opacity, parallax) is layered on top via GSAP/
// Framer Motion in StackingCards, not by this component.
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[2rem] border border-ink/10 bg-white shadow-[0_20px_60px_-30px_rgba(20,17,16,0.35)] dark:border-white/10 dark:bg-ink-elevated-2',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn(className)} {...props} />,
);
CardContent.displayName = 'CardContent';
