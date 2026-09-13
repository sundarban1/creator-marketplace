import { isUsernameAvailable } from '../api/creator';

/** Same candidate-generation scheme as mobile's onboarding.tsx, so a name
 *  produces the same handles on both platforms. */
function generateUsernameCandidates(name: string): string[] {
  const clean = name.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return [];
  const out: string[] = [];
  if (parts.length >= 2) {
    out.push(`${parts[0]}_${parts[1]}`.slice(0, 20));
    out.push(`${parts[0]}${parts[1]}`.slice(0, 20));
    out.push(`${parts[0]}${parts[1][0]}`.slice(0, 20));
    out.push(`${parts[0][0]}${parts[1]}`.slice(0, 20));
  } else {
    out.push(parts[0].slice(0, 20));
    out.push(`the_${parts[0]}`.slice(0, 20));
    out.push(`${parts[0]}_official`.slice(0, 20));
  }
  const base = out[0] ?? parts[0];
  for (let n = 1; n <= 12; n++) out.push(`${base}${n}`.slice(0, 20));
  return [...new Set(out.filter((s) => s.length >= 3 && /^[a-zA-Z0-9_]+$/.test(s)))];
}

/** Checks candidates against the backend and returns the first `max` that aren't already taken. */
export async function resolveAvailableUsernames(name: string, signal?: AbortSignal, max = 4): Promise<string[]> {
  const candidates = generateUsernameCandidates(name);
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        return (await isUsernameAvailable(candidate, signal)) ? candidate : null;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        return null;
      }
    }),
  );
  return results.filter((c): c is string => c !== null).slice(0, max);
}
