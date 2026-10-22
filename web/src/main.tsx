import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { ErrorFallback } from './components/ErrorFallback.tsx'
import { holdPrerenderSnapshot } from './lib/prerenderHold'

const SENSITIVE_KEY_PATTERN = /password|token|otp|secret/i

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
  // Noise from Android in-app browsers (Facebook/Instagram/TikTok): their
  // injected Java bridge disappears when the user closes the in-app browser.
  // Not our code and not actionable.
  ignoreErrors: [/Java object is gone/i],
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers['Authorization']
      delete event.request.headers['Cookie']
    }

    for (const bag of [event.extra, event.contexts] as const) {
      if (!bag) continue
      for (const key of Object.keys(bag)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          delete (bag as Record<string, unknown>)[key]
        }
      }
    }

    return event
  },
})

const rootEl = document.getElementById('root')!
// Keep the prerendered snapshot visible until the live page is ready (no blink).
holdPrerenderSnapshot(rootEl)

createRoot(rootEl).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ eventId }) => <ErrorFallback eventId={eventId} />}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
