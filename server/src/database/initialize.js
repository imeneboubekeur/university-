
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pool from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initializeDatabase() {
  const schemaPath = path.resolve(
    __dirname,
    '../../database/schema.sql'
  )

  const schema = await fs.readFile(schemaPath, 'utf8')
  const client = await pool.connect()

  try {
    console.log('Initializing university database...')

    await client.query('BEGIN')
    await client.query(schema)
    await client.query('COMMIT')

    console.log('Database schema initialized successfully!')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Database initialization failed:', error.message)
    throw error
  } finally {
    client.release()
  }
}

initializeDatabase()
  .catch(() => {
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
