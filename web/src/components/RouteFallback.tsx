// Shown while a lazily-loaded route chunk is being fetched (see App.tsx's
// Suspense boundary). Deliberately minimal and un-animated — a full spinner
// that flashes for 50ms on a warm cache is worse than a quiet hold. The
// landing page is not lazy, so a first-time visitor never sees this.
export function RouteFallback() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-white"
      role="status"
      aria-label="Loading"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600 motion-reduce:animate-none" />
    </div>
  );
}
