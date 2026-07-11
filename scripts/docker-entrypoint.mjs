import { readFile } from 'fs/promises'
import { spawn } from 'child_process'
import { setTimeout as delay } from 'timers/promises'
import pg from 'pg'

const { Client } = pg

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('[entrypoint] DATABASE_URL is required')
  process.exit(1)
}

async function runStartupMigrations() {
  const sql = await readFile(new URL('../postgres/runtime_ai_migrations.sql', import.meta.url), 'utf8')

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const client = new Client({ connectionString: databaseUrl })
    try {
      await client.connect()
      await client.query(sql)
      await client.end()
      console.log('[entrypoint] Startup migrations ensured.')
      return
    } catch (error) {
      try {
        await client.end()
      } catch {}
      if (attempt === 10) {
        throw error
      }
      await delay(1000)
    }
  }
}

async function main() {
  await runStartupMigrations()

  if (process.env.MIGRATION_ONLY === '1') {
    console.log('[entrypoint] Migration-only mode complete.')
    return
  }

  const child = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env,
  })

  child.on('exit', (code) => {
    process.exit(code ?? 1)
  })

  process.on('SIGTERM', () => child.kill('SIGTERM'))
  process.on('SIGINT', () => child.kill('SIGINT'))
}

main().catch((error) => {
  console.error('[entrypoint] Failed to start web server:', error)
  process.exit(1)
})