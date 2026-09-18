# MX Learning

A local-first English trainer: spaced repetition over your own vocabulary, a
curated idiom library, and AI-driven practice modes. Everything lives in the
browser — IndexedDB for data, the Web Speech API for voice, no backend, no
account, no recurring cost.

Installable as a PWA and fully usable offline.

## Running it

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | **Port 5173** — your real deck (`mx-learning`) |
| `npm run dev:demo` | **Port 5174** — the demo deck (`mx-learning-demo`) |
| `npm run build` | Production build |
| `npm run build:demo` | Staging build |
| `npm run phone` | Build + serve to your phone, with install instructions |
| `npm run icons` | Regenerate the PWA icon set from `scripts/generate-icons.mjs` |
| `npm run lint` | ESLint |

AI features need a Mistral key in `.env.local` — copy `.env.example`. Without
one, everything except the AI practice modes still works.

## Working from two computers

Use git, not a folder copy. `node_modules/` alone is tens of thousands of
files — copying it is slow, and a dependency tree built for one machine is
not guaranteed to run on another.

On the second machine:

```bash
git clone https://github.com/teekky/mx-learning.git
cd mx-learning
npm install --legacy-peer-deps
```

Then each time you switch machines: `git push` before you leave, `git pull`
when you arrive.

Two things git will **not** carry, by design:

- **`.env.local`** — it is gitignored, because an API key does not belong in
  a repository. Copy it across by hand once, or recreate it from
  `.env.example`.
- **Your deck.** The database lives in the browser profile, not in the
  repo. Settings → Backup & restore → *Download a backup* on one machine,
  import it on the other.

`--legacy-peer-deps` is required: `vite-plugin-pwa@1.2.0` has not declared
Vite 8 as a supported peer yet. It works; the metadata is just stale.

## Does updating the app lose my data?

No. This is worth stating precisely, because "it's all in the browser" sounds
fragile and mostly isn't.

Your data lives in **IndexedDB**, keyed by origin and database name. Shipping
new code replaces HTML, JavaScript and CSS. None of that touches IndexedDB.
Rebuild, redeploy, reinstall the PWA, update the service worker — the deck,
the schedule, the streak and the history all survive.

Three things *can* lose data, and only three:

1. **Clearing site data** in the browser (or uninstalling the browser
   profile). Nothing in the app can prevent this — that's what the automatic
   snapshots and the export are for.
2. **A destructive schema migration.** Dexie versions are declared in
   `src/db/database.ts`. Every version so far is additive: v2 only adds an
   index. A migration that dropped or rewrote a table would be a deliberate
   act, and should ship with an export prompt in front of it.
3. **Changing the database name.** `mx-learning` → anything else means a
   fresh, empty database. That is exactly the mechanism staging uses, and it
   is why the name is a build constant rather than something computed at
   runtime.

Updates are also not silent: the service worker downloads a new build in the
background and then waits behind a banner. Nothing reloads mid-review.

**Rules for future schema changes.** Bump the Dexie version, only ever *add*
tables/indexes/optional fields, and write an `upgrade()` for anything that
transforms existing rows. Never lower a version number, and never rename the
database.

## Two databases, never one

The app opens a different IndexedDB database depending on the build:

| Build | Database | Dev port |
| --- | --- | --- |
| default | `mx-learning` | 5173 |
| `--mode demo` | `mx-learning-demo` | 5174 |

A demo build physically cannot read or write the real deck — IndexedDB
isolates by database name, and the name is fixed at build time in
`src/config.ts`. The demo build also carries a permanent banner and is
pre-filled with ~40 fixture words in deliberately varied SRS states, so the UI
can be judged on realistic content rather than an empty deck.

Changed the fixture? Bump `FIXTURE_VERSION` in `src/db/demoSeed.ts` and the
demo database rebuilds itself on next load.

## Backups

Settings → **Backup & restore**:

- **Download a backup** — one JSON file with the whole database.
- **Import** — every record is validated against the schema first; anything
  malformed is skipped rather than written half-broken. Merge is the default;
  replace requires a confirmation.
- **Automatic snapshots** — taken on launch, at most once every six hours, and
  stored in a *separate* IndexedDB database (`mx-learning-backups`) so wiping
  your deck does not take the backups with it.

## Design system

`src/tokens.css` is the single source of truth for colour, type, space,
radius, elevation and motion. `tailwind.config.js` mirrors it one-to-one —
every value there is a `var()`. No component should contain a raw hex, a magic
radius, or a hand-picked duration.

The language is soft neo-brutalism: warm paper ground, near-black ink, cobalt
accent, visible 2px strokes, hard offset shadows with no blur, generous radii.
Two surface weights (`card` and `card-ink`) and one press interaction — the
element slides 2px into its own shadow.

Reusable atoms live in `src/components/ui`. Import from the barrel
(`@/components/ui`), not from individual files.

## Layout of the code

```
src/
  tokens.css            design tokens — start here
  config.ts             build-time environment switches
  components/ui/        Button, Card, Badge, Input, Stat, Sheet, feedback states
  components/           app shell: Layout, Sidebar, TopBar, BottomNav, WordForm
  modules/review/       the signature review screen (full-screen, no chrome)
  modules/dashboard/    what to do now, then the numbers
  modules/idioms/       curated idiom library
  modules/deck/         the vocabulary journal
  modules/practice/     AI-driven exercise modes
  db/                   Dexie schema, queries, deck writes, demo fixture
  utils/backup.ts       export / import / rolling snapshots
  data/idioms.ts        the bundled idiom corpus
```

## Reviewing

`/review` is mounted outside the app shell: no sidebar, no top bar, one card
at a time. Reveal with tap, click, or Space. Grade with the four buttons,
with `1`–`4`, or by swiping (left = Again, right = Good). Each button shows
the interval it will produce. Cards you fail come back before the session
ends.

## On a phone

See [docs/ANDROID.md](docs/ANDROID.md) — including why `http://192.168.x.x`
can never install a PWA, and the free way around it.
