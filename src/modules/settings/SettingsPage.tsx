/**
 * Settings — display name, sound, voice, daily goal, manual difficulty.
 */

import { useEffect, useState } from 'react'
import { Loader2, Moon, Play, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { listEnglishVoices, speak } from '@/audio/tts'
import {
  apiKeySource,
  getUserApiKey,
  setUserApiKey,
  testMistralKey,
} from '@/ai/mistral'
import { db } from '@/db/database'
import { PageLoader } from '@/components/ui'
import { BackupPanel } from '@/components/BackupPanel'
import { InstallDiagnostics } from '@/components/InstallDiagnostics'
import { noAutofill, noAutofillProse } from '@/utils/noAutofill'
import type { Level } from '@/types'

const CEFR_LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function SettingsPage() {
  const navigate = useNavigate()
  const settings = useAppStore((s) => s.settings)
  const stats = useAppStore((s) => s.stats)
  const updateSettings = useAppStore((s) => s.updateSettings)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [name, setName] = useState(stats?.displayName ?? '')

  useEffect(() => {
    listEnglishVoices().then(setVoices)
  }, [])

  useEffect(() => {
    if (stats) setName(stats.displayName)
  }, [stats])

  if (!settings || !stats) return <PageLoader />

  async function saveName() {
    await db.userStats.put({ ...stats!, displayName: name.trim() || 'Learner' })
    await useAppStore.getState().hydrate()
    useAppStore.getState().pushToast({ kind: 'info', title: 'Name saved', body: name.trim() || 'Learner' })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="mb-1 font-display text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-text-muted">Tune the experience to your taste.</p>
      </header>

      {/* Display name */}
      <section className="card space-y-3">
        <Label>Display name</Label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input flex-1"
            maxLength={32}
            {...noAutofillProse}
          />
          <button onClick={saveName} className="btn-ghost">
            Save
          </button>
        </div>
      </section>

      {/* Theme */}
      <section className="card space-y-3">
        <Label>Theme</Label>
        <div className="flex flex-wrap gap-2">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => updateSettings({ theme: t })}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                settings.theme === t
                  ? 'border-accent bg-accent-subtle text-text'
                  : 'border-border bg-bg-subtle text-text-muted hover:border-text-subtle hover:text-text'
              }`}
            >
              {t === 'dark' ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
              <span className="capitalize">{t}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Sound */}
      <section className="card space-y-3">
        <Label>Sound effects</Label>
        <Toggle
          checked={settings.soundEnabled}
          onChange={(v) => updateSettings({ soundEnabled: v })}
          label="Play crystalline ‘ding’ on correct answers"
        />
        <Toggle
          checked={settings.vibrationsEnabled}
          onChange={(v) => updateSettings({ vibrationsEnabled: v })}
          label="Subtle vibrations (where supported)"
        />
      </section>

      {/* Voice */}
      <section className="card space-y-3">
        <Label>AI voice</Label>
        <select
          value={settings.voiceURI ?? ''}
          onChange={(e) => updateSettings({ voiceURI: e.target.value })}
          className="input w-full"
        >
          <option value="">Auto (best available)</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} — {v.lang}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <RangeRow
            label="Rate"
            value={settings.voiceRate}
            min={0.5}
            max={1.6}
            step={0.05}
            onChange={(v) => updateSettings({ voiceRate: v })}
          />
          <RangeRow
            label="Pitch"
            value={settings.voicePitch}
            min={0.5}
            max={1.5}
            step={0.05}
            onChange={(v) => updateSettings({ voicePitch: v })}
          />
        </div>
        <button
          onClick={() =>
            speak(
              "Hi, I'm your English coach. Ready when you are.",
              {
                voiceURI: settings.voiceURI,
                rate: settings.voiceRate,
                pitch: settings.voicePitch,
              },
            )
          }
          className="btn-ghost"
        >
          <Play size={14} aria-hidden /> Test voice
        </button>
      </section>

      {/* Daily goal */}
      <section className="card space-y-3">
        <Label>Daily XP goal</Label>
        <input
          type="number"
          min={5}
          max={500}
          step={5}
          value={stats.dailyGoalXp}
          onChange={async (e) => {
            const v = Math.max(5, Math.min(500, Number(e.target.value) || 20))
            await db.userStats.put({ ...stats, dailyGoalXp: v })
            await useAppStore.getState().hydrate()
          }}
          className="input w-32"
          {...noAutofill}
        />
      </section>

      {/* Streak reminder */}
      <section className="card space-y-4">
        <Label>Streak reminder</Label>
        <Toggle
          checked={!!settings.reminderEnabled}
          onChange={(v) => updateSettings({ reminderEnabled: v })}
          label="Show a dashboard banner if I haven't practiced yet today"
        />
        {settings.reminderEnabled && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Reminder hour</span>
              <input
                type="number"
                min={6}
                max={23}
                step={1}
                value={settings.reminderHour ?? 20}
                onChange={(e) => {
                  const v = Math.max(
                    6,
                    Math.min(23, Number(e.target.value) || 20),
                  )
                  void updateSettings({ reminderHour: v })
                }}
                className="input w-24"
                {...noAutofill}
              />
            </label>
            <p className="max-w-xs text-xs text-text-subtle">
              Local time. The banner appears on the dashboard from this hour
              onward, until you've earned XP today.
            </p>
          </div>
        )}
      </section>

      {/* CEFR level */}
      <section className="card space-y-3">
        <Label>CEFR level</Label>
        <div className="flex flex-wrap items-center gap-2">
          {CEFR_LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={async () => {
                await db.userStats.put({ ...stats, cefrLevel: lv })
                await useAppStore.getState().hydrate()
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                stats.cefrLevel === lv
                  ? 'border-accent bg-accent-subtle text-text'
                  : 'border-border bg-bg-subtle text-text-muted hover:border-text-subtle hover:text-text'
              }`}
            >
              {lv}
            </button>
          ))}
          <button
            type="button"
            onClick={async () => {
              await updateSettings({ onboardingComplete: false })
              navigate('/onboarding')
            }}
            className="ml-auto btn-ghost text-xs"
          >
            Retake placement test
          </button>
        </div>
        <p className="text-xs text-text-subtle">
          This tunes the difficulty of generated content and sentence examples.
        </p>
      </section>

      {/* Manual difficulty */}
      <section className="card space-y-3">
        <Label>Difficulty offset</Label>
        <RangeRow
          label={`${settings.difficultyOffset > 0 ? '+' : ''}${settings.difficultyOffset}`}
          value={settings.difficultyOffset}
          min={-2}
          max={2}
          step={1}
          onChange={(v) => updateSettings({ difficultyOffset: v })}
        />
        <p className="text-xs text-text-subtle">
          Negative = easier · 0 = adaptive · Positive = harder.
        </p>
      </section>

      {/* Backup — first thing to reach for before any risky change. */}
      <BackupPanel />

      {/* Why the phone offers a shortcut instead of an install. */}
      <InstallDiagnostics />

      {/* AI connection */}
      <ApiKeyPanel />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AI connection                                                      */
/* ------------------------------------------------------------------ */

/** `abc…wxyz` — enough to tell two keys apart, not enough to use one. */
function maskKey(key: string): string {
  if (key.length <= 8) return '•'.repeat(key.length)
  return `${key.slice(0, 3)}${'•'.repeat(10)}${key.slice(-4)}`
}

/**
 * Paste-your-own-key panel.
 *
 * This is the only way to get AI features on the phone: the GitHub Pages
 * build ships without a key on purpose, because a build-time key would be
 * sitting in a public bundle for anyone to lift. Typed here, the key stays
 * in this browser's localStorage and is sent to exactly one place — the
 * Authorization header of a request to api.mistral.ai.
 */
function ApiKeyPanel() {
  const pushToast = useAppStore((s) => s.pushToast)

  const [saved, setSaved] = useState(() => getUserApiKey())
  const [source, setSource] = useState(() => apiKeySource())
  /** null while showing the saved key; a string while typing a new one. */
  const [draft, setDraft] = useState<string | null>(() =>
    getUserApiKey() ? null : '',
  )
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    tone: 'ok' | 'warn' | 'error'
    msg: string
  } | null>(null)

  async function save() {
    const key = (draft ?? '').trim()
    if (!key) return
    setBusy(true)
    setResult(null)
    setUserApiKey(key)
    const check = await testMistralKey()
    setBusy(false)

    /* A key Mistral *refuses* is worse than no key — every AI mode would fail
       one request at a time. That one rolls back. A key we could not reach
       Mistral to check is kept: the network says nothing about the key, and
       refusing to save on a dead Wi-Fi would be its own bug. */
    if (!check.ok && check.kind === 'rejected') {
      setUserApiKey(saved)
      setSource(apiKeySource())
      setResult({ tone: 'error', msg: check.error })
      return
    }

    setSaved(key)
    setDraft(null)
    setSource(apiKeySource())

    if (check.ok) {
      setResult({ tone: 'ok', msg: 'Key saved and verified.' })
      pushToast({
        kind: 'info',
        title: 'Mistral connected',
        body: 'AI modes are unlocked.',
      })
    } else {
      setResult({
        tone: 'warn',
        msg: `Key saved, but not verified. ${check.error}`,
      })
    }
  }

  function remove() {
    setUserApiKey('')
    setSaved('')
    setDraft('')
    setSource(apiKeySource())
    setResult(null)
  }

  const connected = source !== 'none'

  return (
    <section className="card space-y-4">
      <Label>AI connection</Label>

      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            connected ? 'bg-success' : 'bg-warning'
          }`}
        />
        <div>
          <div className="text-sm font-medium text-text">
            {source === 'user'
              ? 'Mistral connected — your key'
              : source === 'build'
                ? 'Mistral connected — build key'
                : 'No Mistral key'}
          </div>
          <div className="text-xs text-text-muted">
            {connected
              ? 'All AI features are available.'
              : 'Chat, listening, interviews and Learn-from-anything stay locked without one.'}
          </div>
        </div>
      </div>

      {/* --- Saved key, at rest -------------------------------------- */}
      {draft === null ? (
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg border-hair border-border bg-bg-subtle px-3 py-2 font-mono text-sm text-text-muted">
            {maskKey(saved)}
          </code>
          <button type="button" onClick={() => setDraft('')} className="btn-ghost">
            Replace
          </button>
          <button type="button" onClick={remove} className="btn-quiet text-danger">
            Remove
          </button>
        </div>
      ) : (
        /* --- Entering a key --------------------------------------- */
        <div className="space-y-3">
          <div className="answer-row">
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setResult(null)
              }}
              placeholder="Paste your Mistral API key…"
              className="input font-mono text-sm"
              inputMode="text"
              enterKeyHint="done"
              {...noAutofill}
            />
            <button
              type="button"
              onClick={save}
              disabled={busy || !draft.trim()}
              className="btn-primary disabled:opacity-40"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  Checking…
                </>
              ) : (
                'Save & test'
              )}
            </button>
          </div>
          {saved && (
            <button
              type="button"
              onClick={() => {
                setDraft(null)
                setResult(null)
              }}
              className="btn-quiet -ml-4 text-xs"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {result && (
        <p
          role="status"
          className={`text-sm ${
            result.tone === 'ok'
              ? 'text-success'
              : result.tone === 'warn'
                ? 'text-warning'
                : 'text-danger'
          }`}
        >
          {result.msg}
        </p>
      )}

      <div className="space-y-1.5 border-t-hair border-border-subtle pt-3 text-xs text-text-subtle">
        <p>
          Create a key at{' '}
          <a
            href="https://console.mistral.ai/api-keys"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            console.mistral.ai/api-keys
          </a>
          . The free tier covers everything this app does.
        </p>
        <p>
          It is stored only in this browser, on this device, and sent only to
          Mistral. Anyone holding your unlocked phone can read it back — use a
          key created for this app alone, so revoking it costs you nothing.
        </p>
      </div>
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-sm text-text">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-accent' : 'bg-bg-subtle'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked
              ? 'translate-x-5'
              : 'translate-x-0 border border-border/70'
          }`}
        />
      </button>
    </label>
  )
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent"
      />
    </label>
  )
}
