import { useState } from 'react';
import { cn } from './cn';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
} as const;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Image avatar with an initials fallback (broken URL or no URL). */
export function Avatar({
  src,
  name,
  size = 'md',
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        'bg-brand/12 font-semibold text-brand',
        // Safari clips border-radius on raster images without anti-aliasing
        // (visible stair-stepping on the circle edge); routing the clip
        // through a mask instead forces the smooth path.
        '[-webkit-mask-image:radial-gradient(white,black)] [mask-image:radial-gradient(white,black)]',
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name) || '?'
      )}
    </span>
  );
}
