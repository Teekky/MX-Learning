/**
 * Backup & restore.
 *
 * Everything you have learned lives in one IndexedDB database in one browser
 * profile. Clearing site data wipes it, and there is no server copy. This
 * panel is the answer to that: an export you can put somewhere safe, an
 * import that validates every record before it touches the database, and a
 * list of the rolling snapshots the app takes for you automatically.
 *
 * Restores are destructive in one direction only — "replace" is behind an
 * explicit confirmation, and merging is the default.
 */

import { useEffect, useRef, useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import {
  Button,
  Card,
  Notice,
  Select,
  Spinner,
  cn,
} from '@/components/ui'
import {
  downloadBackup,
  downloadSnapshot,
  importSnapshot,
  listSnapshots,
  parseBackup,
  restoreSnapshot,
  type ImportMode,
  type ImportReport,
  type SnapshotMeta,
} from '@/utils/backup'
import { db } from '@/db/database'
import { useAppStore } from '@/store/useAppStore'
import { IS_DEMO } from '@/config'

/** Anything bigger than this is refused before it is read into memory. */
const MAX_FILE_BYTES = 20 * 1024 * 1024

export function BackupPanel() {
  const pushToast = useAppStore((s) => s.pushToast)
  const hydrate = useAppStore((s) => s.hydrate)

  const fileInput = useRef<HTMLInputElement>(null)
  const [snapshots, setSnapshots] = useState<SnapshotMeta[] | null>(null)
  const [mode, setMode] = useState<ImportMode>('merge')
  const [busy, setBusy] = useState<'export' | 'import' | 'restore' | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listSnapshots().then(setSnapshots)
  }, [])

  async function handleExport() {
    setBusy('export')
    setError(null)
    try {
      const { filename, bytes } = await downloadBackup()
      pushToast({
        kind: 'info',
        icon: '⤓',
        title: 'Backup downloaded',
        body: `${filename} — ${formatBytes(bytes)}`,
      })
    } catch {
      setError('Could not build the export. Try again in a moment.')
    } finally {
      setBusy(null)
    }
  }

  async function handleFile(file: File) {
    setError(null)
    setReport(null)

    if (file.size > MAX_FILE_BYTES) {
      setError(
        `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_FILE_BYTES)}.`,
      )
      return
    }

    setBusy('import')
    try {
      const text = await file.text()

      // Validate first and show what would land, so a bad file never gets
      // as far as a write.
      const preview = parseBackup(text)
      if (!preview.ok) {
        setError(preview.error ?? 'That file could not be read.')
        return
      }

      if (mode === 'replace') {
        const total = Object.values(preview.rows!).reduce((n, rows) => n + rows.length, 0)
        const confirmed = window.confirm(
          `Replace everything in "${db.name}" with this file?\n\n` +
            `${total} records will be written and the current contents removed. ` +
            `This cannot be undone — export a backup first if you are unsure.`,
        )
        if (!confirmed) return
      }

      const result = await importSnapshot(text, mode)
      setReport(result)
      if (result.ok) {
        await hydrate()
        setSnapshots(await listSnapshots())
        pushToast({
          kind: 'info',
          icon: '⤒',
          title: 'Backup imported',
          body: `${result.accepted.words ?? 0} words, ${result.accepted.cards ?? 0} cards.`,
        })
      } else {
        setError(result.error ?? 'Import failed.')
      }
    } catch {
      setError('Could not read that file.')
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleRestore(snapshot: SnapshotMeta) {
    const confirmed = window.confirm(
      `Restore the snapshot from ${formatWhen(snapshot.createdAt)}?\n\n` +
        `It contains ${snapshot.wordCount} words and will replace the current contents of "${db.name}".`,
    )
    if (!confirmed) return

    setBusy('restore')
    setError(null)
    try {
      const result = await restoreSnapshot(snapshot.id, 'replace')
      setReport(result)
      if (result.ok) {
        await hydrate()
        pushToast({ kind: 'info', icon: '↺', title: 'Snapshot restored' })
      } else {
        setError(result.error ?? 'Restore failed.')
      }
    } finally {
      setBusy(null)
    }
  }

  const rejectedTotal = report
    ? Object.values(report.rejected).reduce((n, v) => n + v, 0)
    : 0

  return (
    <Card
      title="Backup & restore"
      subtitle={`Reading and writing “${db.name}”${IS_DEMO ? ' — the demo database' : ''}.`}
      className="space-y-5"
    >
      {error && <Notice tone="danger">{error}</Notice>}

      {report?.ok && (
        <Notice tone={rejectedTotal > 0 ? 'warning' : 'success'}>
          Imported {report.accepted.words ?? 0} words and {report.accepted.cards ?? 0}{' '}
          cards.
          {rejectedTotal > 0 && (
            <>
              {' '}
              {rejectedTotal} record{rejectedTotal === 1 ? '' : 's'} were skipped
              because they did not match the expected shape.
            </>
          )}
        </Notice>
      )}

      {/* ---- Export --------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => void handleExport()}
          disabled={busy !== null}
          leading={busy === 'export' ? <Spinner size={16} /> : <Download size={18} />}
        >
          Download a backup
        </Button>
        <p className="text-sm text-text-muted">
          One JSON file with your whole deck, schedule and history.
        </p>
      </div>

      {/* ---- Import --------------------------------------------------- */}
      <div className="space-y-3 border-t-hair border-border-subtle pt-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[180px] flex-1">
            <span className="label">On import</span>
            <Select
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
            >
              <option value="merge">Merge into what is here</option>
              <option value="replace">Replace everything</option>
            </Select>
          </label>
          <Button
            variant="ghost"
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
            leading={busy === 'import' ? <Spinner size={16} /> : <Upload size={18} />}
          >
            Choose a file
          </Button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        <p className="text-sm text-text-subtle">
          Every record is checked against the schema before anything is written.
          Rows that do not match are skipped rather than imported half-broken.
        </p>
      </div>

      {/* ---- Automatic snapshots --------------------------------------- */}
      <div className="space-y-3 border-t-hair border-border-subtle pt-5">
        <div>
          <h3 className="font-display text-base font-semibold text-text">
            Automatic snapshots
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Taken on launch, at most once every six hours, and kept in a
            separate database so a wipe of your deck does not take them too.
          </p>
        </div>

        {snapshots == null ? (
          <Spinner />
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-text-subtle">
            None yet — the first one is taken once there is something worth
            protecting.
          </p>
        ) : (
          <ul className="space-y-2">
            {snapshots.map((s) => (
              <li
                key={s.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg',
                  'border-hair border-border bg-bg-subtle px-4 py-3',
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text">
                    {formatWhen(s.createdAt)}
                  </div>
                  <div className="font-mono text-xs text-text-subtle">
                    {s.wordCount} words · {formatBytes(s.bytes)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => void downloadSnapshot(s.id)}
                    leading={<Download size={16} />}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRestore(s)}
                    disabled={busy !== null}
                    leading={<RotateCcw size={16} />}
                  >
                    Restore
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatWhen(ts: number): string {
  // English, like the rest of the interface — see the note in DashboardPage.
  return new Date(ts).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
