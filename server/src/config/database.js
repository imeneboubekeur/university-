
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL error:', error)
})

// Execute SQL queries
export const query = (text, params) => {
  return pool.query(text, params)
}

// Get a client for database transactions
export const getClient = () => {
  return pool.connect()
}

// Export the pool itself
export default pool
