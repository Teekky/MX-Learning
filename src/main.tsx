import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
