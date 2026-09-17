const RELOAD_FLAG_PREFIX = 'chunk-reload:';

function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /dynamically imported module|importing a module script failed|loading chunk|chunkloaderror/i.test(msg);
}

/**
 * Wraps a code-split route's dynamic import so a tab left open across a
 * deploy — its index.html still pointing at chunk hashes the new deploy
 * rotated out, so the chunk 404s — recovers with one full-page reload
 * instead of hitting the top-level error boundary. The per-key sessionStorage
 * flag stops a genuinely broken chunk from reload-looping forever; on a
 * second failure it falls through to the caller (and the error boundary).
 */
export function withChunkRetry<T>(load: () => Promise<T>, key: string): Promise<T> {
  return load().catch((err: unknown) => {
    if (isChunkLoadError(err)) {
      const flag = RELOAD_FLAG_PREFIX + key;
      try {
        if (!sessionStorage.getItem(flag)) {
          sessionStorage.setItem(flag, '1');
          window.location.reload();
          return new Promise<T>(() => {});
        }
      } catch {
        // sessionStorage unavailable (privacy mode) — fall through to the error boundary.
      }
    }
    throw err;
  });
}
