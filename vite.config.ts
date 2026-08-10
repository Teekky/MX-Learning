import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

/**
 * Content-Security-Policy, injected into the built index.html only.
 *
 * It cannot live in the source HTML because the dev server serves inline
 * bootstrap scripts (React Fast Refresh preamble, the HMR client) that a
 * strict `script-src 'self'` would kill. Production has no such scripts,
 * so the shipped app runs under the tight policy below.
 *
 * `style-src` keeps 'unsafe-inline': Framer Motion animates by writing to
 * `element.style`, which CSP treats as an inline style. That allows no
 * script execution, so the XSS surface stays closed.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  // The only outbound host: the Mistral API. Nothing else can be reached.
  "connect-src 'self' https://api.mistral.ai",
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'mx-csp',
    apply: 'build',
    transformIndexHtml(html) {
      // Injected after <meta charset> so the encoding declaration stays the
      // first thing in <head>, as the HTML spec wants.
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

// MX Learning — installable PWA, offline-first
export default defineConfig({
  plugins: [
    react(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'MX Learning — English, five minutes at a time',
        short_name: 'MX Learning',
        description:
          'Spaced-repetition English practice: vocabulary, idioms and drills that work offline.',
        // Matches --color-bg / --color-bg in the dark theme (tokens.css).
        theme_color: '#131110',
        background_color: '#131110',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Review due cards',
            short_name: 'Review',
            url: '/review',
            description: 'Jump straight into today’s spaced-repetition queue.',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The seed/grammar data files are large; raise the precache ceiling
        // so the app is genuinely complete offline rather than half-cached.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // Mistral API calls should NOT be cached.
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: {
        // Lets you exercise the offline path with `npm run dev` instead of
        // needing a full build every time.
        enabled: false,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    // Proxy Mistral API to avoid CORS in the browser PWA.
    // The SDK is pointed at /api/mistral; Vite forwards to api.mistral.ai.
    proxy: {
      '/api/mistral': {
        target: 'https://api.mistral.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mistral/, ''),
      },
    },
  },
})
