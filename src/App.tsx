/**
 * Router root — wires the app shell to routed pages.
 *
 * On first launch we surface the CEFR onboarding test. Once the user either
 * completes or skips it, `settings.onboardingComplete` flips to true and
 * subsequent launches skip the gate entirely.
 */

import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PageLoader } from '@/components/PageLoader'
import { DashboardPage } from '@/modules/dashboard/DashboardPage'
import { OnboardingPage } from '@/modules/onboarding/OnboardingPage'
import { PracticePage } from '@/modules/practice/PracticePage'
import { PracticeSessionPage } from '@/modules/practice/PracticeSessionPage'
import { DeckPage } from '@/modules/deck/DeckPage'
import { ProfilePage } from '@/modules/profile/ProfilePage'
import { SettingsPage } from '@/modules/settings/SettingsPage'
import { bootstrapDatabase } from '@/db/database'
import { useAppStore } from '@/store/useAppStore'

function App() {
  const ready = useAppStore((s) => s.ready)
  const hydrate = useAppStore((s) => s.hydrate)
  const settings = useAppStore((s) => s.settings)

  useEffect(() => {
    bootstrapDatabase().then(hydrate)
  }, [hydrate])

  /**
   * Sync the active theme to <html class="dark"|""> and to a localStorage
   * mirror so the next page load can apply it synchronously (no FOUC).
   */
  useEffect(() => {
    if (!settings) return
    const isDark = settings.theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    try {
      localStorage.setItem('mx:theme', settings.theme)
    } catch {
      /* localStorage may be blocked — accept the small FOUC cost. */
    }
  }, [settings?.theme])


  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg">
        <PageLoader label="Booting MX Learning…" />
      </div>
    )
  }

  const onboardingDone = settings?.onboardingComplete === true

  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding lives outside the Layout shell — no sidebar distractions. */}
        <Route
          path="/onboarding"
          element={
            onboardingDone ? <Navigate to="/" replace /> : <OnboardingPage />
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
