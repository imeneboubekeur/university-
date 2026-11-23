
import { Router } from 'express'
import pool from '../config/database.js'

const router = Router()

router.get('/db', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS database_time'
    )

    res.json({
      success: true,
      message: 'Supabase PostgreSQL connected!',
      databaseTime: result.rows[0].database_time,
    })
  } catch (error) {
    console.error('Database connection error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    })
  }
})

export default router
