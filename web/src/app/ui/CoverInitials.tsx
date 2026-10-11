function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Fallback for a profile cover band with no photo: the name's initials, large
 * and translucent, centred over the gradient. Mirrors mobile's CoverInitials.
 */
export function CoverInitials({ name }: { name: string | null | undefined }) {
  const text = initials(name ?? '');
  if (!text) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 flex select-none items-center justify-center pb-4 text-[clamp(3rem,9vw,6rem)] font-semibold tracking-[0.12em] text-white/40"
    >
      {text}
    </span>
  );
}
