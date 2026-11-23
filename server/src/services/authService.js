
import bcrypt from 'bcryptjs'
import { query } from '../config/database.js'
import { generateId } from '../utils/generateId.js'
import { getClient } from '../config/database.js'

export async function registerUser({
  firstName,
  lastName,
  email,
  password,
  studentNumber,
  departmentId,
  enrollmentYear,
  yearLevel,
}) {
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const normalizedEmail = email.trim().toLowerCase()

    // Check whether the email is already registered.
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (existingUser.rows.length > 0) {
      const error = new Error('An account with this email already exists.')
      error.status = 409
      throw error
    }

    // Hash the password before storing it.
    const passwordHash = await bcrypt.hash(password, 12)

    const userId = generateId()
    const studentId = generateId()

    // Create the user account.
    const userResult = await client.query(
      `INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, 'STUDENT', TRUE)
      RETURNING
        id,
        email,
        first_name,
        last_name,
        role,
        image_url,
        is_active,
        created_at`,
      [
        userId,
        normalizedEmail,
        passwordHash,
        firstName.trim(),
        lastName.trim(),
      ]
    )

    // Create the academic student profile linked to the user.
    await client.query(
      `INSERT INTO students (
        id,
        user_id,
        student_number,
        department_id,
        enrollment_year,
        year_level,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')`,
      [
        studentId,
        userId,
        studentNumber.trim(),
        departmentId,
        Number(enrollmentYear),
        Number(yearLevel),
      ]
    )

    await client.query('COMMIT')

    return userResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')

    // PostgreSQL unique-constraint violation.
    if (error.code === '23505') {
      const conflict = new Error(
        'This email or student number is already registered.'
      )
      conflict.status = 409
      throw conflict
    }

    throw error
  } finally {
    client.release()
  }
}

export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase()

  const result = await query(
    `SELECT
      id,
      email,
      password_hash,
      first_name,
      last_name,
      role,
      image_url,
      is_active
    FROM users
    WHERE email = $1`,
    [normalizedEmail]
  )

  const user = result.rows[0]

  if (!user || !user.is_active) {
    const error = new Error('Invalid email or password.')
    error.status = 401
    throw error
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  )

  if (!passwordMatches) {
    const error = new Error('Invalid email or password.')
    error.status = 401
    throw error
  }

  const { password_hash, ...safeUser } = user

  return safeUser
}
