/**
 * Router root — wires the app shell to routed pages.
 *
 * On first launch we surface the CEFR onboarding test. Once the user either
 * completes or skips it, `settings.onboardingComplete` flips to true and
 * subsequent launches skip the gate entirely.
 *
 * `/review` is mounted *outside* the Layout on purpose: the review session
 * owns the whole screen, with no sidebar or top bar competing for attention.
 */

import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PageLoader } from '@/components/ui'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { PracticePage } from '@/modules/practice/PracticePage'
import { ReviewPage } from '@/modules/review/ReviewPage'
import { bootstrapDatabase } from '@/db/database'

/**
 * Everything on the daily path — dashboard, practice menu, review — is
 * bundled eagerly. Everything else is split out, because the heavy content
 * files live behind these routes: the practice sessions alone pull in the
 * seed vocabulary, the grammar corpus, the tense drills and the irregular
 * verb tables, which together are most of the JavaScript in this app. On a
 * phone, that difference is the whole "open it and review for five minutes"
 * promise.
 */
const OnboardingPage = lazy(() =>
  import('@/modules/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const PracticeSessionPage = lazy(() =>
  import('@/modules/practice/PracticeSessionPage').then((m) => ({
    default: m.PracticeSessionPage,
  })),
)
const DeckPage = lazy(() =>
  import('@/modules/deck/DeckPage').then((m) => ({ default: m.DeckPage })),
)
const IdiomsPage = lazy(() =>
  import('@/modules/idioms/IdiomsPage').then((m) => ({ default: m.IdiomsPage })),
)
const ProfilePage = lazy(() =>
  import('@/modules/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const SettingsPage = lazy(() =>
  import('@/modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
import { autoSnapshot } from '@/utils/backup'
import { useAppStore } from '@/store/useAppStore'

function App() {
  const ready = useAppStore((s) => s.ready)
  const hydrate = useAppStore((s) => s.hydrate)
  const settings = useAppStore((s) => s.settings)

  useEffect(() => {
    bootstrapDatabase()
      .then(hydrate)
      .then(() => {
        /* Safety net: keep a rolling backup in a separate IndexedDB so a
           wipe of the main database is recoverable. Self-throttled to at
           most one snapshot per six hours, and failures are swallowed —
           a backup must never be able to break the app. */
        void autoSnapshot()
      })
  }, [hydrate])

  /**
   * Sync the active theme to <html class="dark"|""> and to a localStorage
   * mirror so the next page load can apply it synchronously (no FOUC).
   * The browser chrome colour follows, so the Android status bar matches
   * the app instead of flashing the wrong background on launch.
   */
  useEffect(() => {
    if (!settings) return
    const isDark = settings.theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#131110' : '#F7F3EE')
    try {
      localStorage.setItem('mx:theme', settings.theme)
    } catch {
      /* localStorage may be blocked — accept the small FOUC cost. */
    }
  }, [settings?.theme])

  if (!ready) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-bg">
        <PageLoader label="Booting MX Learning…" />
      </div>
    )
  }

  const onboardingDone = settings?.onboardingComplete === true

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Onboarding lives outside the Layout shell — no sidebar distractions. */}
        <Route
          path="/onboarding"
          element={
            onboardingDone ? <Navigate to="/" replace /> : <OnboardingPage />
          }
        />
        {/* Neither does the review session: it is the app, for five minutes. */}
        <Route
          path="/review"
          element={
            onboardingDone ? <ReviewPage /> : <Navigate to="/onboarding" replace />
          }
        />
        <Route element={<Layout />}>
          <Route
            index
            element={
              onboardingDone ? (
                <DashboardPage />
              ) : (
                <Navigate to="/onboarding" replace />
              )
            }
          />
          <Route path="practice" element={<PracticePage />} />
          <Route path="practice/:mode" element={<PracticeSessionPage />} />
          <Route path="deck" element={<DeckPage />} />
          <Route path="idioms" element={<IdiomsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
