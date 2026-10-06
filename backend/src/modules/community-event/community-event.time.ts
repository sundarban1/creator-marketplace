// Wall-clock <-> UTC conversion for community events, which are entered and
// displayed in the event's own IANA timezone (default Asia/Kathmandu) rather
// than the admin's browser zone. Pure Intl — no tz library dependency.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

/** Offset (ms) of `tz` from UTC at `instant` — positive east of Greenwich. */
function offsetMs(instant: Date, tz: string): number {
  const p = zonedParts(instant, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "2026-10-04" + "13:00" in Asia/Kathmandu → the UTC instant. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) throw new Error(`Invalid date/time: ${date} ${time}`);
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetMs(new Date(guess), tz);
  // Re-check once at the candidate instant so a DST boundary between the
  // guess and the answer resolves to the right offset.
  const second = guess - offsetMs(new Date(first), tz);
  return new Date(second);
}

/** UTC instant → wall-clock { date: "YYYY-MM-DD", time: "HH:mm" } in `tz`. */
export function utcToZoned(instant: Date, tz: string): { date: string; time: string } {
  const p = zonedParts(instant, tz);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/** Last instant of the local calendar day containing `instant` in `tz`. */
export function endOfLocalDay(instant: Date, tz: string): Date {
  const { date } = utcToZoned(instant, tz);
  return new Date(zonedToUtc(date, '23:59', tz).getTime() + 59_999);
}
