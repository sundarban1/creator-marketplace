import { Link } from 'react-router-dom';
import { cn } from './cn';

/** Kolab wordmark. Links home unless `asLink={false}`. */
export function Logo({
  className,
  asLink = true,
  invert = false,
}: {
  className?: string;
  asLink?: boolean;
  invert?: boolean;
}) {
  const inner = (
    <img
      src="/logo.png"
      alt="Kolab"
      className={cn('h-7 w-auto', invert && 'brightness-0 invert', className)}
    />
  );
  return asLink ? (
    <Link to="/" aria-label="Kolab home" className="inline-flex">
      {inner}
    </Link>
  ) : (
    inner
  );
}
