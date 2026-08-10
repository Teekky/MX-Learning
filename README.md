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
| `npm run dev` | Dev server against your real deck (`mx-learning`) |
| `npm run dev:demo` | Dev server against the demo deck (`mx-learning-demo`) |
| `npm run build` | Production build |
| `npm run build:demo` | Staging build |
| `npm run phone` | Build + serve to your phone, with install instructions |
| `npm run icons` | Regenerate the PWA icon set from `scripts/generate-icons.mjs` |
| `npm run lint` | ESLint |

AI features need a Mistral key in `.env.local` — copy `.env.example`. Without
one, everything except the AI practice modes still works.

## Two databases, never one

The app opens a different IndexedDB database depending on the build:

| Build | Database |
| --- | --- |
| default | `mx-learning` |
| `--mode demo` | `mx-learning-demo` |

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
