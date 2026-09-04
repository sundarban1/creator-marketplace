import { useState } from 'react'
import { RefreshCw, Home, Copy, Check } from 'lucide-react'

interface ErrorFallbackProps {
  /** Sentry event id for the captured error, when available. */
  eventId?: string | null
}

export function ErrorFallback({ eventId }: ErrorFallbackProps) {
  const [copied, setCopied] = useState(false)

  function copyReference() {
    if (!eventId) return
    navigator.clipboard?.writeText(eventId).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-paper font-display text-ink dark:bg-ink dark:text-white">
      <header className="mx-auto flex w-full max-w-3xl items-center px-6 py-5">
        <a href="/" className="flex items-center">
          <img src="/logo.png" alt="Kolab" className="h-6 w-auto object-contain dark:brightness-0 dark:invert" />
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md text-center">
          <p
            aria-hidden
            className="font-serif text-7xl italic leading-none text-ink/15 dark:text-white/15"
          >
            oops
          </p>

          <h1 className="mt-4 text-balance font-serif text-3xl font-medium tracking-tight sm:text-4xl">
            Something went wrong
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-ink-soft dark:text-white/60">
            An unexpected error interrupted the page. This is on our side, not
            yours. Try reloading — if it keeps happening, our team can help.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-violet focus:ring-offset-2 focus:ring-offset-paper dark:bg-white dark:text-ink dark:focus:ring-offset-ink"
            >
              <RefreshCw size={16} />
              Reload page
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5 focus:outline-none focus:ring-2 focus:ring-violet focus:ring-offset-2 focus:ring-offset-paper dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus:ring-offset-ink"
            >
              <Home size={16} />
              Back to home
            </a>
          </div>

          {eventId && (
            <button
              onClick={copyReference}
              className="mx-auto mt-8 inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-ink dark:text-white/50 dark:hover:text-white"
              title="Copy this reference when contacting support"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : `Reference: ${eventId}`}
            </button>
          )}

          <p className="mt-6 text-xs text-ink-soft dark:text-white/40">
            Need a hand?{' '}
            <a href="/support" className="underline underline-offset-2 hover:text-ink dark:hover:text-white">
              Contact support
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
