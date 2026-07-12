import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { computeUsage } from './scripts/clawd-usage.mjs'

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

export default defineConfig({ plugins: [react(), clawdUsagePlugin()] })
