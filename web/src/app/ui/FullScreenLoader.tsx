/** Neutral full-viewport loading state — used while the session is restoring. */
export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper" role="status" aria-live="polite">
      <span
        className="h-7 w-7 animate-spin rounded-full border-[3px] border-line-strong border-t-brand"
        aria-hidden
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
