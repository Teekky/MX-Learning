# Installing MX Learning on a phone

The app ships as a PWA: once a browser has loaded it over HTTPS, it installs to
the home screen and runs from its own cache. No computer needs to stay awake.

## Where it is served from

GitHub Actions builds `redesign` and `main` on every push and publishes to
GitHub Pages:

    https://teekky.github.io/MX-Learning/

A project site lives under `/<repo>/` rather than at the origin root, so the
build takes a `BASE_PATH` env var (set by the workflow) that gets baked into
asset URLs, the router basename, and the service worker scope. Locally
`BASE_PATH` is unset and everything stays at `/`.

## Installing

**Android / Chrome** — open the URL, then the ⋮ menu → *Install app*. Chrome
also raises its own install prompt after a few seconds.

**iOS / Safari** — open the URL, then Share → *Add to Home Screen*.

Both produce a real standalone install, not a bookmark: the app opens without
browser chrome and keeps working with the network off. The signal that it took
is the missing address bar.

## What works offline

Everything on the daily path — dashboard, deck, review queue, practice drills,
idioms — because the whole app shell and every content file is precached, and
progress lives in IndexedDB on the device.

The one exception is anything that calls Mistral (generated example sentences).
The Pages build ships with an empty API key on purpose — a key baked into a
public bundle is a key anyone can spend — so those features are inert there.
They work under `npm run dev`, which proxies the API and reads your key from
`.env.local`.

## Updating

Push to `redesign` or `main`; the workflow rebuilds and republishes. On the
phone, the new version downloads in the background and waits behind the "A new
version is ready" banner rather than reloading mid-review. Updating replaces
HTML/JS/CSS only — your deck, schedule, streak and history are untouched.

## Testing on the LAN instead

To check a build before pushing, without going through Pages:

```bash
npm run build
npm run preview -- --host
```

Then open `http://<your-machine>.local:4173` on the phone. Prefer the `.local`
name over the IP: the browser files a site's data under its origin, and an
origin built from a DHCP address dies the day the router hands out a different
one. This path needs the computer running — it is for verification, not daily
use.
