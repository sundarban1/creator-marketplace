import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const plugins: PluginOption[] = [react(), tailwindcss()]

// Sourcemap upload only runs when a build-time auth token is provided (e.g. in CI/Render).
// Without it, the build proceeds normally and simply skips uploading sourcemaps to Sentry.
if (process.env.SENTRY_AUTH_TOKEN) {
  plugins.push(
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    }),
  )
}

export default defineConfig({
  plugins,
  build: {
    sourcemap: 'hidden',
  },
})
