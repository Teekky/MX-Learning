# Getting MX Learning onto the S22 Ultra

The goal: open the app from the home screen, review for five minutes, offline,
with progress that belongs to the phone.

## The one-liner

```bash
npm run phone
```

Builds the app, serves it, and prints both ways to reach it from the phone.
Add `--demo` (or `npm run phone:demo`) to serve the demo database instead of
your real deck.

## Why you cannot just type the IP address

Service workers — the thing that makes the app work offline and installable —
only register in a **secure context**. Browsers count `https://` and
`http://localhost` as secure. They do **not** count `http://192.168.1.42`.

So the LAN URL is fine for glancing at the app on the phone, and it will never
offer to install. Two ways around that, both free:

### A. USB port forwarding (recommended)

Chrome makes the phone see your machine's port as `localhost`, which *is* a
secure context. One-time setup, then it is instant every time.

1. Phone → Settings → About phone → tap **Build number** seven times.
2. Phone → Settings → Developer options → **USB debugging** on.
3. Plug the phone into the computer, accept *Allow USB debugging?*
4. Desktop Chrome → `chrome://inspect/#devices`
5. **Port forwarding…** → add `4173` → `localhost:4173` → tick
   *Enable port forwarding* → OK.
6. Phone Chrome → `http://localhost:4173`
7. Menu ⋮ → **Add to Home screen** → Install.

After installing, the app runs from the home screen with no browser UI, and
works with the cable unplugged and the Wi-Fi off — everything is precached.

### B. Host the build somewhere free

`npm run build` produces a static `dist/` folder with no server component.
Anything that serves static files over HTTPS will do — GitHub Pages, Netlify,
Cloudflare Pages, all free at this size. Then install from that URL like any
other site. Do this if you want the app on the phone without the cable.

If you deploy to a subpath (e.g. `user.github.io/mx-learning/`), set Vite's
`base` and the manifest `start_url`/`scope` to match, or the service worker
will not find its files.

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
