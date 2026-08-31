import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* Self-hosted variable fonts — no third-party origin, works offline, and
   both files are precached by the service worker. Fraunces carries the
   display voice, Inter the interface text. */
import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'

import './tokens.css'
import './index.css'
import App from './App.tsx'

/**
 * Apply the persisted theme class BEFORE React renders, to avoid a flash
 * of unthemed content. The source of truth is `settings.theme` in IndexedDB,
 * but reading IndexedDB is async — too late to use here. We mirror the
 * theme to localStorage on every change so this synchronous read is always
 * correct on subsequent loads. First-ever launch defaults to dark.
 */
const storedTheme = (() => {
  try {
    return localStorage.getItem('mx:theme') ?? 'dark'
  } catch {
    return 'dark'
  }
})()
document.documentElement.classList.toggle('dark', storedTheme === 'dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
