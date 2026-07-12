// Clawdmeter data source — computes real Claude usage from ccusage.
//
// Reads Claude Code's local usage logs via `ccusage` and returns a compact
// JSON the <Clawdmeter/> widget renders. Two windows, mirroring the device:
//   • current — the active 5-hour block (resets at the block's end)
//   • weekly  — the trailing 7 days (resets at the next weekly anchor)
//
// Percentages are cost-based against configurable limits (there is no public
// API for a subscription's real rate-limit %, so we measure spend vs a cap):
//   CLAWD_BLOCK_LIMIT_USD  default 50   — 5-hour block budget
//   CLAWD_WEEK_LIMIT_USD   default 700  — weekly budget
//   CLAWD_WEEK_RESET_DOW   default 1    — weekday the weekly window resets (0=Sun … 1=Mon)
//
// Usage:  node scripts/clawd-usage.mjs         → prints JSON to stdout
//         node scripts/clawd-usage.mjs --write  → also writes public/clawd-usage.json
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pexec = promisify(execFile)
const HERE = dirname(fileURLToPath(import.meta.url))

const BLOCK_LIMIT = Number(process.env.CLAWD_BLOCK_LIMIT_USD) || 50
const WEEK_LIMIT  = Number(process.env.CLAWD_WEEK_LIMIT_USD)  || 700
const WEEK_DOW    = Number.isFinite(+process.env.CLAWD_WEEK_RESET_DOW) ? +process.env.CLAWD_WEEK_RESET_DOW : 1

// run ccusage via npx (no local install needed); tolerate a slow cold start
async function ccusage(args){
  const { stdout } = await pexec('npx', ['--yes', 'ccusage@latest', ...args], {
    maxBuffer: 32 * 1024 * 1024,
    timeout: 90_000,
  })
  return JSON.parse(stdout)
}

const pct = (used, limit) => Math.max(0, Math.min(100, Math.round((used / limit) * 100)))

// next weekly reset: upcoming WEEK_DOW at local midnight (strictly in the future)
function nextWeeklyReset(now = new Date()){
  const d = new Date(now); d.setHours(0, 0, 0, 0)
  let add = (WEEK_DOW - d.getDay() + 7) % 7
  if(add === 0) add = 7           // if today is the anchor, roll to next week
  d.setDate(d.getDate() + add)
  return d
}

// burn-rate → playful status, echoing the device's "Musing…"
function statusFor(costPerHour){
  if(!costPerHour)          return 'Idle'
  if(costPerHour >= 40)     return 'Cooking 🔥'
  if(costPerHour >= 12)     return 'Musing…'
  return 'Sipping'
}

export async function computeUsage(){
  const now = new Date()
  const sinceWeek = new Date(now.getTime() - 7 * 864e5)
  const yyyymmdd = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

  const [blocks, daily] = await Promise.all([
    ccusage(['blocks', '--active', '--json']).catch(() => ({ blocks: [] })),
    ccusage(['daily', '--json', '--since', yyyymmdd(sinceWeek)]).catch(() => ({ daily: [] })),
  ])

  const block = (blocks.blocks || []).find(b => b.isActive) || null
  const days  = daily.daily || daily || []

  // current 5-hour block
  const curCost   = block?.costUSD || 0
  const curTokens = block?.totalTokens || 0
  const curReset  = block?.endTime ? new Date(block.endTime) : null
  const burn      = block?.burnRate?.costPerHour || 0

  // trailing 7 days
  const weekCost   = (Array.isArray(days) ? days : []).reduce((s, r) => s + (r.totalCost   || 0), 0)
  const weekTokens = (Array.isArray(days) ? days : []).reduce((s, r) => s + (r.totalTokens || 0), 0)

  return {
    ok: true,
    updatedAt: now.toISOString(),
    model: block?.models?.[0] || null,
    status: statusFor(burn),
    burnRate: { costPerHour: burn },
    current: {
      pct: pct(curCost, BLOCK_LIMIT),
      costUSD: +curCost.toFixed(2),
      tokens: curTokens,
      limitUSD: BLOCK_LIMIT,
      resetAt: curReset ? curReset.toISOString() : null,
    },
    weekly: {
      pct: pct(weekCost, WEEK_LIMIT),
      costUSD: +weekCost.toFixed(2),
      tokens: weekTokens,
      limitUSD: WEEK_LIMIT,
      resetAt: nextWeeklyReset(now).toISOString(),
    },
  }
}

// CLI entry
if(import.meta.url === `file://${process.argv[1]}`){
  computeUsage()
    .then(async data => {
      const json = JSON.stringify(data, null, 2)
      if(process.argv.includes('--write')){
        const out = resolve(HERE, '..', 'public', 'clawd-usage.json')
        await mkdir(dirname(out), { recursive: true })
        await writeFile(out, json)
        console.error('wrote', out)
      }
      process.stdout.write(json + '\n')
    })
    .catch(err => { console.error('clawd-usage failed:', err.message); process.exit(1) })
}
