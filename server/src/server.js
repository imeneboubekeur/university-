
import 'dotenv/config'
import app from './app.js'
import pool from './config/database.js'

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    // Verify PostgreSQL connection
    await pool.query('SELECT NOW()')
  
    console.log('Supabase PostgreSQL connected!')
console.log('Cloudinary configuration:', {
  cloudNameLoaded: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
  apiKeyLoaded: Boolean(process.env.CLOUDINARY_API_KEY),
  apiSecretLoaded: Boolean(process.env.CLOUDINARY_API_SECRET),
})
    // Start Express without recreating database tables
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Server startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
