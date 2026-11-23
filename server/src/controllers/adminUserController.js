
import bcrypt from 'bcryptjs'
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const ALLOWED_ROLES = [
  'STUDENT',
  'PROFESSOR',
  'SECRETARY',
  'DEPARTMENT_COORDINATOR',
  'ADMIN',
]

// GET /api/admin/users
export async function getAdminUsers(req, res, next) {
  try {
    const {
      search = '',
      role = 'ALL',
      status = 'ALL',
    } = req.query

    const allowedStatuses = ['ALL', 'ACTIVE', 'INACTIVE']

    if (
      role !== 'ALL' &&
      !ALLOWED_ROLES.includes(String(role).toUpperCase())
    ) {
      return res.status(400).json({ message: 'Invalid role filter.' })
    }

    if (!allowedStatuses.includes(String(status).toUpperCase())) {
      return res.status(400).json({ message: 'Invalid status filter.' })
    }

    const result = await query(
      `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.image_url,
        u.role,
        u.is_active,
        u.created_at,
        s.student_number,
        s.enrollment_year,
        s.year_level,
        s.status AS student_status,
        p.employee_number,
        p.academic_title,
        d.name AS department_name,
        d.code AS department_code
      FROM users u
      LEFT JOIN students s
        ON s.user_id = u.id
      LEFT JOIN professors p
        ON p.user_id = u.id
      LEFT JOIN department_coordinators dc
        ON dc.user_id = u.id
      LEFT JOIN departments d
        ON d.id = COALESCE(
          s.department_id,
          p.department_id,
          dc.department_id
        )
      WHERE
        ($1 = 'ALL' OR u.role::TEXT = $1)
        AND (
          $2 = 'ALL'
          OR ($2 = 'ACTIVE' AND u.is_active = TRUE)
          OR ($2 = 'INACTIVE' AND u.is_active = FALSE)
        )
        AND (
          $3 = ''
          OR u.email ILIKE '%' || $3 || '%'
          OR u.first_name ILIKE '%' || $3 || '%'
          OR u.last_name ILIKE '%' || $3 || '%'
          OR s.student_number ILIKE '%' || $3 || '%'
          OR p.employee_number ILIKE '%' || $3 || '%'
          OR d.name ILIKE '%' || $3 || '%'
          OR d.code ILIKE '%' || $3 || '%'
        )
      ORDER BY u.created_at DESC
      LIMIT 300
      `,
      [
        String(role).toUpperCase(),
        String(status).toUpperCase(),
        String(search).trim(),
      ]
    )

    res.json({
      users: result.rows,
      total: result.rows.length,
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/admin/users
export async function createAdminUser(req, res, next) {
  const client = await getClient()
  let transactionStarted = false

  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone = null,
      role,
      departmentId = null,
      studentNumber,
      enrollmentYear,
      yearLevel,
      employeeNumber,
      academicTitle = null,
    } = req.body

    const normalizedRole = String(role || '').toUpperCase()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({
        message: 'First name and last name are required.',
      })
    }

    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: 'A valid email is required.',
      })
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      })
    }

    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        message: 'Invalid account role.',
      })
    }

    // These roles must be assigned to a department.
    if (
      ['STUDENT', 'PROFESSOR', 'DEPARTMENT_COORDINATOR'].includes(
        normalizedRole
      ) &&
      !departmentId
    ) {
      return res.status(400).json({
        message: 'A department is required for this account role.',
      })
    }

    if (normalizedRole === 'STUDENT') {
      if (
        !studentNumber?.trim() ||
        !Number.isInteger(Number(enrollmentYear)) ||
        !Number.isInteger(Number(yearLevel)) ||
        Number(yearLevel) < 1 ||
        Number(yearLevel) > 6
      ) {
        return res.status(400).json({
          message:
            'Student number, enrollment year, and valid year level are required.',
        })
      }
    }

    if (
      normalizedRole === 'PROFESSOR' &&
      !employeeNumber?.trim()
    ) {
      return res.status(400).json({
        message: 'Employee number is required for professor accounts.',
      })
    }

    await client.query('BEGIN')
    transactionStarted = true

    if (departmentId) {
      const departmentResult = await client.query(
        'SELECT id FROM departments WHERE id = $1',
        [departmentId]
      )

      if (!departmentResult.rowCount) {
        await client.query('ROLLBACK')
        transactionStarted = false

        return res.status(400).json({
          message: 'Selected department does not exist.',
        })
      }
    }

    const userId = generateId()
    const passwordHash = await bcrypt.hash(password, 12)

    const userResult = await client.query(
      `
      INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::user_role, TRUE)
      RETURNING
        id,
        email,
        first_name,
        last_name,
        phone,
        role,
        is_active,
        created_at
      `,
      [
        userId,
        normalizedEmail,
        passwordHash,
        firstName.trim(),
        lastName.trim(),
        phone?.trim() || null,
        normalizedRole,
      ]
    )

    if (normalizedRole === 'STUDENT') {
      await client.query(
        `
        INSERT INTO students (
          id,
          user_id,
          student_number,
          department_id,
          enrollment_year,
          year_level
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          generateId(),
          userId,
          studentNumber.trim(),
          departmentId,
          Number(enrollmentYear),
          Number(yearLevel),
        ]
      )
    }

    if (normalizedRole === 'PROFESSOR') {
      await client.query(
        `
        INSERT INTO professors (
          id,
          user_id,
          department_id,
          employee_number,
          academic_title
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          generateId(),
          userId,
          departmentId,
          employeeNumber.trim(),
          academicTitle?.trim() || null,
        ]
      )
    }

    // Assign the coordinator to the selected department.
    if (normalizedRole === 'DEPARTMENT_COORDINATOR') {
      await client.query(
        `
        INSERT INTO department_coordinators (
          id,
          user_id,
          department_id
        )
        VALUES ($1, $2, $3)
        `,
        [
          generateId(),
          userId,
          departmentId,
        ]
      )
    }

    await client.query('COMMIT')
    transactionStarted = false

    res.status(201).json({
      message: 'User account created successfully.',
      user: {
        ...userResult.rows[0],
        department_id: departmentId,
      },
    })
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK')
    }

    if (error.code === '23505') {
      return res.status(409).json({
        message:
          'Email, student number, or employee number already exists.',
      })
    }

    next(error)
  } finally {
    client.release()
  }
}

// PATCH /api/admin/users/:userId/status
export async function updateAdminUserStatus(req, res, next) {
  try {
    const { userId } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be true or false.',
      })
    }

    if (userId === req.user?.id && !isActive) {
      return res.status(400).json({
        message: 'You cannot deactivate your own administrator account.',
      })
    }

    const result = await query(
      `
      UPDATE users
      SET
        is_active = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        email,
        first_name,
        last_name,
        role,
        is_active
      `,
      [isActive, userId]
    )

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'User not found.',
      })
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/users/departments
export async function getAdminDepartments(req, res, next) {
  try {
    const result = await query(
      `
      SELECT
        d.id,
        d.name,
        d.code,
        f.name AS faculty_name
      FROM departments d
      JOIN faculties f
        ON f.id = d.faculty_id
      ORDER BY f.name, d.name
      `
    )

    res.json({
      departments: result.rows,
    })
  } catch (error) {
    next(error)
  }
}
