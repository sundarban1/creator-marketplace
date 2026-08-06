import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { ErrorFallback } from './components/ErrorFallback.tsx'

const SENSITIVE_KEY_PATTERN = /password|token|otp|secret/i

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [Sentry.browserTracingIntegration()],
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
