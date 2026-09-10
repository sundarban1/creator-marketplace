import { cn } from './cn';

/**
 * Loading placeholder. Every data-driven page uses these instead of a blank
 * screen (spec §58). `prefers-reduced-motion` disables the pulse (index.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-line-strong/60', className)} aria-hidden />;
}

/** A few stacked text lines. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
