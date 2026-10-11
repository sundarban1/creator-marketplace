/**
 * The message to show for an error body. A bare "Validation failed" is
 * replaced by the per-field reasons the server sent alongside it, so the user
 * always reads what to fix.
 */
export function errorMessageFrom(body: Record<string, unknown>, status: number): string {
  const raw = typeof body['message'] === 'string' ? (body['message'] as string).trim() : '';
  const errors = Array.isArray(body['errors']) ? (body['errors'] as Array<{ message?: unknown }>) : [];
  const reasons = Array.from(new Set(errors.map((e) => (typeof e?.message === 'string' ? e.message.trim() : '')).filter(Boolean)));
  if ((!raw || /^validation failed\.?$/i.test(raw)) && reasons.length) {
    return reasons.slice(0, 3).map((m) => (/[.!?]$/.test(m) ? m : `${m}.`)).join(' ');
  }
  if (raw && !/^validation failed\.?$/i.test(raw)) return raw;
  return status === 422 || status === 400 ? 'Please check the details you entered.' : `Request failed (${status})`;
}

/**
 * What to show the user for a failed request: the server's specific reason
 * (validation, business rule — any 4xx it explained), otherwise the screen's
 * own fallback. Server faults (5xx), network failures and unexpected JS errors
 * fall back, so internals never leak into the UI.
 */
export function errorText(err: unknown, fallback: string): string {
  const status = (err as { status?: unknown } | null)?.status;
  if (err instanceof Error && typeof status === 'number' && status < 500 && err.message && !/^Request failed \(\d+\)$/.test(err.message)) {
    return err.message;
  }
  return fallback;
}
