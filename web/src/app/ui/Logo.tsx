import { Link } from 'react-router-dom';
import { cn } from './cn';

/** Kolab wordmark. Links to `to` (default home) unless `asLink={false}`. */
export function Logo({
  className,
  asLink = true,
  invert = false,
  to = '/',
}: {
  className?: string;
  asLink?: boolean;
  invert?: boolean;
  to?: string;
}) {
  const inner = (
    <img
      src="/logo-flat.svg"
      alt="Kolab"
      className={cn('h-7 w-auto', invert && 'brightness-0 invert', className)}
    />
  );
  return asLink ? (
    <Link to={to} aria-label="Kolab home" className="inline-flex">
      {inner}
    </Link>
  ) : (
    inner
  );
}
