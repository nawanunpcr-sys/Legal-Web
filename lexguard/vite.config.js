import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { computeUsage } from './scripts/clawd-usage.mjs'
import { discover } from './api/law-discover.js'

// Dev-only proxy for the AI law-discovery endpoint (Task 4). In production this
// is a Vercel serverless function; locally we run the same core here, reading
// ANTHROPIC_API_KEY from .env so "ค้นหากฎหมาย" works without deploying.
function lawDiscoverPlugin(env) {
  return {
    name: 'law-discover',
    configureServer(server) {
      server.middlewares.use('/api/law-discover', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end('POST only') }
        let raw = ''
        req.on('data', c => { raw += c })
        req.on('end', async () => {
          try {
            const body = raw ? JSON.parse(raw) : {}
            const { status, body: out } = await discover(body, env)
            res.statusCode = status
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(out))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: String(e?.message || e) }))
          }
        })
      })
    },
  }
}

// Dev-only endpoint that feeds the <Clawdmeter/> widget real Claude usage.
// Runs `ccusage` on the machine that hosts the dev server (where ~/.claude
// lives), caches the result for 60s. In production (Vercel) this route does
// not exist, so the widget quietly hides — the data isn't available there.
function clawdUsagePlugin(){
  let cache = null, at = 0
  return {
    name: 'clawd-usage',
    configureServer(server){
      server.middlewares.use('/api/usage', async (_req, res) => {
        try{
          if(!cache || Date.now() - at > 60_000){ cache = await computeUsage(); at = Date.now() }
          res.setHeader('content-type', 'application/json')
          res.setHeader('cache-control', 'no-store')
          res.end(JSON.stringify(cache))
        }catch(err){
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: String(err?.message || err) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // loadEnv reads .env (incl. non-VITE vars like ANTHROPIC_API_KEY) for the dev proxy
  const env = loadEnv(mode, process.cwd(), '')
  return { plugins: [react(), clawdUsagePlugin(), lawDiscoverPlugin(env)] }
})
