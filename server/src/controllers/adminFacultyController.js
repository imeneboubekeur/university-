import { query } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase()
}

function handleDatabaseError(error, res, next) {
  if (error.code === '23505') {
    return res.status(409).json({
      message: 'This faculty or department code already exists.',
    })
  }

  if (error.code === '23503') {
    return res.status(400).json({
      message: 'The selected faculty does not exist or is still referenced.',
    })
  }

  return next(error)
}

// GET /api/admin/faculties
export async function getAdminFaculties(req, res, next) {
  try {
    const facultiesResult = await query(`
      SELECT
        id,
        name,
        code,
        created_at
      FROM faculties
      ORDER BY name ASC
    `)

    const departmentsResult = await query(`
      SELECT
        d.id,
        d.faculty_id,
        d.name,
        d.code,
        d.created_at,
        f.name AS faculty_name
      FROM departments d
      INNER JOIN faculties f ON f.id = d.faculty_id
      ORDER BY f.name ASC, d.name ASC
    `)

    const departmentsByFaculty = new Map()

    for (const department of departmentsResult.rows) {
      const list = departmentsByFaculty.get(department.faculty_id) || []
      list.push(department)
      departmentsByFaculty.set(department.faculty_id, list)
    }

    const faculties = facultiesResult.rows.map((faculty) => ({
      ...faculty,
      departments: departmentsByFaculty.get(faculty.id) || [],
      department_count:
        (departmentsByFaculty.get(faculty.id) || []).length,
    }))

    return res.json({ faculties })
  } catch (error) {
    next(error)
  }
}

// POST /api/admin/faculties
export async function createAdminFaculty(req, res, next) {
  try {
    const name = String(req.body.name || '').trim()
    const code = normalizeCode(req.body.code)

    if (!name || !code) {
      return res.status(400).json({
        message: 'Faculty name and code are required.',
      })
    }

    const result = await query(
      `
        INSERT INTO faculties (id, name, code)
        VALUES ($1, $2, $3)
        RETURNING id, name, code, created_at
      `,
      [generateId(), name, code]
    )

    return res.status(201).json({
      message: 'Faculty created successfully.',
      faculty: {
        ...result.rows[0],
        departments: [],
        department_count: 0,
      },
    })
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
}

// PATCH /api/admin/faculties/:facultyId
export async function updateAdminFaculty(req, res, next) {
  try {
    const { facultyId } = req.params
    const name = String(req.body.name || '').trim()
    const code = normalizeCode(req.body.code)

    if (!name || !code) {
      return res.status(400).json({
        message: 'Faculty name and code are required.',
      })
    }

    const result = await query(
      `
        UPDATE faculties
        SET name = $1, code = $2
        WHERE id = $3
        RETURNING id, name, code, created_at
      `,
      [name, code, facultyId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Faculty not found.' })
    }

    return res.json({
      message: 'Faculty updated successfully.',
      faculty: result.rows[0],
    })
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
}

// POST /api/admin/faculties/:facultyId/departments
export async function createAdminDepartment(req, res, next) {
  try {
    const { facultyId } = req.params
    const name = String(req.body.name || '').trim()
    const code = normalizeCode(req.body.code)

    if (!name || !code) {
      return res.status(400).json({
        message: 'Department name and code are required.',
      })
    }

    const facultyResult = await query(
      'SELECT id FROM faculties WHERE id = $1',
      [facultyId]
    )

    if (!facultyResult.rowCount) {
      return res.status(404).json({ message: 'Faculty not found.' })
    }

    const result = await query(
      `
        INSERT INTO departments (id, faculty_id, name, code)
        VALUES ($1, $2, $3, $4)
        RETURNING id, faculty_id, name, code, created_at
      `,
      [generateId(), facultyId, name, code]
    )

    return res.status(201).json({
      message: 'Department created successfully.',
      department: result.rows[0],
    })
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
}

// PATCH /api/admin/faculties/departments/:departmentId
export async function updateAdminDepartment(req, res, next) {
  try {
    const { departmentId } = req.params
    const name = String(req.body.name || '').trim()
    const code = normalizeCode(req.body.code)

    if (!name || !code) {
      return res.status(400).json({
        message: 'Department name and code are required.',
      })
    }

    const result = await query(
      `
        UPDATE departments
        SET name = $1, code = $2
        WHERE id = $3
        RETURNING id, faculty_id, name, code, created_at
      `,
      [name, code, departmentId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Department not found.' })
    }

    return res.json({
      message: 'Department updated successfully.',
      department: result.rows[0],
    })
  } catch (error) {
    handleDatabaseError(error, res, next)
  }
}