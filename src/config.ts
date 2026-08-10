/**
 * Build-time environment switches.
 *
 * The app runs against two completely separate IndexedDB databases:
 *
 *   production  → `mx-learning`        (the real deck — never touched by staging)
 *   staging     → `mx-learning-demo`   (throwaway, pre-filled with demo words)
 *
 * The split is by *database name*, not by a flag inside one database, so
 * there is no code path where a staging build can read or write the real
 * deck. Run `npm run dev:demo` / `npm run build:demo` to get the demo DB.
 */

/** True when this build targets the staging/demo environment. */
export const IS_DEMO = import.meta.env.VITE_APP_ENV === 'demo'

/** Name of the IndexedDB database this build talks to. */
export const DB_NAME = IS_DEMO ? 'mx-learning-demo' : 'mx-learning'

/** Short label surfaced in the UI so you always know which data you're in. */
export const ENV_LABEL = IS_DEMO ? 'DEMO' : 'LIVE'
