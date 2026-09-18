/**
 * Serve the built app to your phone — `npm run phone`.
 *
 * RUN THIS ON YOUR COMPUTER, not on the phone. There is no Node, no npm and
 * no terminal on the phone; the phone is only ever the *client* here. This
 * script turns your computer into the server the phone connects to.
 *
 * Flags:
 *   --demo    build and serve the demo database instead of the real one
 *   --skip-build  reuse whatever is already in dist/
 *
 * What it does: builds, serves dist/ on every network interface, and prints
 * both ways to reach it from an Android device — with an honest note about
 * which one can actually install the PWA.
 *
 * The install caveat, once, properly:
 *
 *   Service workers only register in a *secure context*. `https://` counts,
 *   and so does `http://localhost` — but `http://192.168.x.x` does not. So
 *   the LAN URL below is fine for looking at the app, and cannot install it.
 *
 *   The zero-cost way to get a secure context on the phone is Chrome's USB
 *   port forwarding: the phone then sees the app at `http://localhost:4173`,
 *   which the browser treats as secure. Steps are printed at the end.
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const demo = args.includes('--demo')
const skipBuild = args.includes('--skip-build')

// Matches vite.config.ts: the two environments never share a port.
const PORT = demo ? 4174 : 4173

/* ------------------------------------------------------------------ */

const bold = (s) => `\x1b[1m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`
const cyan = (s) => `\x1b[36m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`

/**
 * Is the port free?
 *
 * We serve with `--strictPort` on purpose: silently moving to 4174 would
 * change the origin, and an installed app is bound to its origin — it would
 * simply stop finding its own data. Better to fail loudly here, with an
 * explanation, than to succeed on the wrong port.
 */
function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => probe.close(() => resolve(true)))
      .listen(port, '0.0.0.0')
  })
}

function lanAddresses() {
  const found = []
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== 'IPv4' || addr.internal) continue
      found.push({ name, address: addr.address })
    }
  }
  return found
}

/* ---- 0. Is the port free? ------------------------------------------ */

if (!(await portIsFree(PORT))) {
  console.error(
    yellow(`\n  Port ${PORT} is already in use.\n`) +
      `  Something is still serving on it — most likely a previous\n` +
      `  ${bold('npm run phone')} that was never stopped.\n\n` +
      `  Find it and stop it:\n` +
      cyan(`      netstat -ano | findstr :${PORT}\n`) +
      cyan(`      taskkill /PID <the-number-in-the-last-column> /F\n\n`) +
      `  Then run ${bold('npm run phone')} again.\n\n` +
      dim(`  Not moving to another port on purpose: an installed app is\n`) +
      dim(`  bound to its origin, and the port is part of that. Serving on\n`) +
      dim(`  ${PORT + 1} would look fine and quietly lose your deck.\n`),
  )
  process.exit(1)
}

/* ---- 1. Build ----------------------------------------------------- */

if (!skipBuild) {
  const script = demo ? 'build:demo' : 'build'
  console.log(bold(`\n▸ Building (${script})…\n`))
  const result = spawnSync('npm', ['run', script], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  })
  if (result.status !== 0) {
    console.error(yellow('\nBuild failed — nothing to serve.\n'))
    process.exit(result.status ?? 1)
  }
} else if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error(
    yellow('\nNo dist/index.html — drop --skip-build so it gets built first.\n'),
  )
  process.exit(1)
}

/* ---- 2. Serve ------------------------------------------------------ */

console.log(bold('\n▸ Serving dist/ on port ' + PORT + '…\n'))

const server = spawn(
  'npx',
  ['vite', 'preview', '--host', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], shell: true },
)

server.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => {
  server.kill('SIGINT')
  process.exit(0)
})

/* ---- 3. Tell the human what to do ---------------------------------- */

// Give the preview server a moment to bind before printing.
setTimeout(() => {
  const addrs = lanAddresses()

  console.log(bold('─'.repeat(64)))
  console.log(bold(`  MX Learning — ${demo ? 'DEMO data' : 'REAL data'}`))
  console.log(bold('─'.repeat(64)))
  console.log(
    dim('\n  This terminal stays open. Everything below happens on the PHONE.\n'),
  )

  console.log('\n' + bold('  Just to look at it') + dim('  (same Wi-Fi, no install)'))
  if (addrs.length === 0) {
    console.log('    ' + yellow('No LAN address found — are you on Wi-Fi?'))
  } else {
    for (const a of addrs) {
      console.log('    ' + cyan(`http://${a.address}:${PORT}`) + dim(`   (${a.name})`))
    }
  }

  console.log('\n' + bold('  To actually install it') + dim('  (USB, one-time setup)'))
  console.log(`    1. Phone: Settings → About → tap "Build number" 7 times.`)
  console.log(`    2. Phone: Settings → Developer options → USB debugging ON.`)
  console.log(`    3. Plug the phone in; accept the "Allow debugging?" prompt.`)
  console.log(`    4. Desktop Chrome: open ${cyan('chrome://inspect/#devices')}`)
  console.log(`    5. Click ${bold('Port forwarding…')} → add ${bold(String(PORT))} → ${bold(`localhost:${PORT}`)}`)
  console.log(`       tick "Enable port forwarding", then OK.`)
  console.log(`    6. Phone Chrome: open ${cyan(`http://localhost:${PORT}`)}`)
  console.log(`    7. Menu ⋮ → ${bold('Add to Home screen')} → Install.`)

  console.log(
    '\n' +
      dim('  Why the USB step: service workers need a secure context. An IP\n') +
      dim('  address over plain http is not one; http://localhost is. Port\n') +
      dim('  forwarding makes the phone see this server as localhost.\n'),
  )

  console.log(bold('  Your phone keeps its own progress.'))
  console.log(
    dim('  The database lives in the browser, so the installed app has its\n') +
      dim('  own deck and streak. Move progress across with Settings →\n') +
      dim('  Backup & restore → Download a backup, then import it there.\n'),
  )

  console.log(dim('  Ctrl-C to stop.\n'))
}, 1200)
