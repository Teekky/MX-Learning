# Getting MX Learning onto the S22 Ultra

The goal: open the app from the home screen, review for five minutes, offline,
with progress that belongs to the phone.

## The one-liner — on the computer

```bash
npm run phone
```

**This runs on your computer, not on the phone.** There is no terminal on
Android; the phone is only the client. The command builds the app and turns
your computer into the server the phone connects to, then prints the two ways
to reach it. Leave the terminal open for the whole install.

It serves your **real** deck by default — that is what you want on the phone.
`npm run phone:demo` exists only for checking the interface on a device
without touching real data; never install from it.

## Why you cannot just type the IP address

Service workers — the thing that makes the app work offline and installable —
only register in a **secure context**. Browsers count `https://` and
`http://localhost` as secure. They do **not** count `http://192.168.1.42`.

So the LAN URL is fine for glancing at the app on the phone, and it will never
offer to install. Two ways around that, both free:

### A. Trust the LAN address in Chrome (no cable)

If you can already reach `http://192.168.x.x:4173` from the phone, this is
the shortest path. Chrome has an allowlist for exactly this case.

1. Phone Chrome → `chrome://flags`
2. Search **Insecure origins treated as secure**, set it to *Enabled*.
3. In its text box, put the exact origin, port included:
   `http://192.168.1.173:4173`
4. **Relaunch** Chrome when prompted.
5. Load the address again → menu ⋮ → **Add to Home screen** → Install.

The flag lowers the bar for that one origin and nothing else. Chrome keeps it
until you clear it.

One real catch: **the origin is the IP address.** If your router hands the
computer a different address later, the installed app points at an origin
that no longer exists, and its cache and its IndexedDB are stranded there —
a new IP is a new origin, with a new empty database. Reserve a static lease
for the computer in your router before installing this way, or use the cable
route below, where the origin is always `localhost:4173`.

### B. USB port forwarding (stable origin)

Chrome makes the phone see your machine's port as `localhost`, which *is* a
secure context and never changes. One-time setup.

1. Phone → Settings → **About phone** → **Software information** → tap
   **Build number** seven times.
   On Samsung One UI it is nested and named slightly differently:
   *Paramètres → À propos du téléphone → Informations sur le logiciel →
   Numéro de version*, tapped seven times.
2. Phone → Settings → Developer options → **USB debugging** on.
3. Plug the phone into the computer, accept *Allow USB debugging?*
4. Desktop Chrome → `chrome://inspect/#devices`
5. **Port forwarding…** → add `4173` → `localhost:4173` → tick
   *Enable port forwarding* → OK.
6. Phone Chrome → `http://localhost:4173`
7. Menu ⋮ → **Add to Home screen** → Install.

After installing either way, the app runs from the home screen with no
browser UI, and works with the cable unplugged and the Wi-Fi off —
everything is precached.

### Telling a real install from a shortcut

Over plain `http://` on a LAN address, with no flag set, Chrome will still
offer *Add to Home screen* — but what you get is a bookmark that opens in a
browser tab. No offline, no standalone window. The difference is visible:
a real install opens with no address bar. If you see the address bar, the
service worker never registered.

### B. Host the build somewhere free

`npm run build` produces a static `dist/` folder with no server component.
Anything that serves static files over HTTPS will do — GitHub Pages, Netlify,
Cloudflare Pages, all free at this size. Then install from that URL like any
other site. Do this if you want the app on the phone without the cable.

If you deploy to a subpath (e.g. `user.github.io/mx-learning/`), set Vite's
`base` and the manifest `start_url`/`scope` to match, or the service worker
will not find its files.

## Keeping every device up to date

There are two answers, and they differ a lot in effort.

### Today: rebuild per device

Each machine runs its own copy, so each machine needs `git pull` and a
rebuild. Fine for one laptop, tedious for three devices and a phone.

### Recommended: host the build once

First, the distinction that matters: **the repository and the site are two
different things.** A private repo protects the source code. It does not give
your phone anything to load — the phone cannot read a git repository, it
needs a built app served at a URL. That served build is the "site", and its
privacy is a separate question from the repo's.

`npm run build` emits a static `dist/` with no server component. Push it to
any free static host and every device loads the same URL.

**Keeping the site private, at no cost.** Most free tiers publish the site
openly even from a private repo — GitHub Pages does exactly that unless you
are on a paid plan. The combination that stays free *and* private is
**Cloudflare Pages** (hosting) plus **Cloudflare Access** (a login gate on
the URL, one-time codes to your email address). Verify the current free-tier
seat limit when you set it up; it has historically been generous enough for
personal use.

Without a gate, treat the site as public — which brings us to the key.

What that buys you:

- **One deploy updates everything.** The service worker notices the new
  build, downloads it in the background, and shows the "A new version is
  ready" banner. One tap, no reinstall.
- **The phone install keeps working.** An installed PWA points at the URL, so
  it updates with everything else.
- **Data is untouched.** Updates replace code, never IndexedDB.

Two things to get right when you set it up:

1. If you deploy to a subpath (`user.github.io/mx-learning/`), set Vite's
   `base` and the manifest's `start_url`/`scope` to match, or the service
   worker will not find its files.
2. `VITE_MISTRAL_API_KEY` is baked into the bundle at build time. A public
   host means a publicly readable key. Either keep the deployment private,
   or build without the key and accept that the AI modes are off on hosted
   devices while spaced repetition, idioms and the deck all still work.

Point 2 is the real decision: an API key in a public bundle is an API key
someone else can spend.

## Progress is per-device, on purpose

The whole app lives in IndexedDB in whichever browser profile is running it.
The installed phone app therefore has **its own deck, its own streak, its own
schedule**. Nothing syncs, nothing phones home, nothing costs money.

To move progress between devices:

1. Desktop → Settings → **Backup & restore** → *Download a backup*.
2. Get the JSON file onto the phone (Drive, email to yourself, USB).
3. Phone → Settings → Backup & restore → set *Replace everything* → *Choose a
   file*.

Every record is validated on the way in; anything malformed is skipped rather
than imported half-broken.

## Staging vs real data

Two entirely separate databases, chosen at build time:

| Command | Database | What it is |
| --- | --- | --- |
| `npm run dev` | `mx-learning` | Your real deck |
| `npm run dev:demo` | `mx-learning-demo` | ~40 fixture words, varied SRS states |
| `npm run build` | `mx-learning` | Production build |
| `npm run build:demo` | `mx-learning-demo` | Staging build |

A demo build cannot open the real database — the name is different, and
IndexedDB isolates by name. The demo build also shows a permanent banner so
you can never mistake one for the other.

To rebuild the fixture after changing it, bump `FIXTURE_VERSION` in
`src/db/demoSeed.ts`; the next load wipes and re-seeds the demo database.

## Notes for the S22 Ultra specifically

- **Curved edges.** Nothing interactive is flush to the left or right edge;
  `--edge-gutter` keeps a 16px minimum, plus `env(safe-area-inset-*)`.
- **Gesture bar.** Bottom actions pad themselves with `env(safe-area-inset-bottom)`,
  so the primary buttons never sit under the swipe-up area.
- **URL bar.** Layout uses `dvh`, not `vh`, so nothing is cut off when Chrome's
  address bar collapses.
- **120 Hz.** Every animation is `transform` or `opacity` only. No animated
  `width`, `height`, or `top` anywhere in the review flow.
- **Touch targets.** 48dp minimum (`--tap-min`), including the grading buttons.
- **Chrome is the right browser here** — Samsung Internet installs PWAs too,
  but Chrome's port forwarding is what makes the USB route work at all.
