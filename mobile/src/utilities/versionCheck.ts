// Minimal dotted-version comparator (no semver package in this project) —
// good enough for the plain "x.y.z" strings app.json/EAS actually produce.
// Missing segments compare as 0 (e.g. "2.5" < "2.5.1").
function compareVersions(a: string, b: string): number {
  const as = a.split('.').map((n) => parseInt(n, 10) || 0);
  const bs = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const diff = (as[i] ?? 0) - (bs[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Empty/undefined minimum means "no enforcement" — always false, never blocks.
export function isVersionBelowMinimum(current: string | null | undefined, minimum: string): boolean {
  if (!minimum || !current) return false;
  return compareVersions(current, minimum) < 0;
}
