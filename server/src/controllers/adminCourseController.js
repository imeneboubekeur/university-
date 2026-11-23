
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const REQUIREMENT_TYPES = ['REQUIRED', 'ELECTIVE', 'FREE_ELECTIVE']

function validateCourse(body) {
  const code = String(body.code || '').trim().toUpperCase()
  const name = String(body.name || '').trim()
  const credits = Number(body.credits)
  const ects = Number(body.ects)

  if (!code || !name) {
    return { error: 'Course code and name are required.' }
  }

  if (!Number.isInteger(credits) || credits < 0) {
    return { error: 'Credits must be a non-negative integer.' }
  }

  if (!Number.isInteger(ects) || ects < 0) {
    return { error: 'ECTS must be a non-negative integer.' }
  }

  if (body.departments !== undefined && !Array.isArray(body.departments)) {
    return { error: 'Departments must be an array.' }
  }

  const seen = new Set()

  for (const department of body.departments || []) {
    if (!department.departmentId) {
      return { error: 'Every department assignment needs a department ID.' }
    }

    if (seen.has(department.departmentId)) {
      return { error: 'A department cannot be assigned more than once.' }
    }

    seen.add(department.departmentId)

    if (!REQUIREMENT_TYPES.includes(department.requirementType || 'REQUIRED')) {
      return { error: 'Invalid course requirement type.' }
    }

    if (
      department.defaultQuota !== null &&
      department.defaultQuota !== undefined &&
      department.defaultQuota !== '' &&
      (!Number.isInteger(Number(department.defaultQuota)) ||
        Number(department.defaultQuota) < 0)
    ) {
      return { error: 'Department quota must be a non-negative integer.' }
    }
  }

  return {
    value: {
      code,
      name,
      description: String(body.description || '').trim() || null,
      credits,
      ects,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
      departments: body.departments || [],
    },
  }
}

function sendDatabaseError(error, res, next) {
  if (error.code === '23505') {
    return res.status(409).json({
      message: 'A course with this code already exists.',
    })
  }

  if (error.code === '23503') {
    return res.status(400).json({
      message: 'One of the selected departments does not exist or is referenced incorrectly.',
    })
  }

  return next(error)
}

// GET /api/admin/courses
export async function getAdminCourses(req, res, next) {
  try {
    const coursesResult = await query(`
      SELECT
        c.id,
        c.code,
        c.name,
        c.description,
        c.credits,
        c.ects,
        c.is_active,
        c.created_at,
        c.updated_at
      FROM courses c
      ORDER BY c.code ASC
    `)

    const departmentsResult = await query(`
      SELECT
        cd.id AS course_department_id,
        cd.course_id,
        cd.department_id,
        cd.requirement_type,
        cd.elective_group,
        cd.default_quota,
        cd.is_available,
        d.name AS department_name,
        d.code AS department_code,
        f.name AS faculty_name
      FROM course_departments cd
      INNER JOIN departments d ON d.id = cd.department_id
      INNER JOIN faculties f ON f.id = d.faculty_id
      ORDER BY f.name ASC, d.name ASC
    `)

    const departmentsByCourse = new Map()

    for (const department of departmentsResult.rows) {
      const list = departmentsByCourse.get(department.course_id) || []
      list.push(department)
      departmentsByCourse.set(department.course_id, list)
    }

    const courses = coursesResult.rows.map((course) => ({
      ...course,
      departments: departmentsByCourse.get(course.id) || [],
    }))

    return res.json({ courses })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/courses/departments
export async function getAdminCourseDepartments(req, res, next) {
  try {
    const result = await query(`
      SELECT
        d.id,
        d.name,
        d.code,
        d.faculty_id,
        f.name AS faculty_name
      FROM departments d
      INNER JOIN faculties f ON f.id = d.faculty_id
      ORDER BY f.name ASC, d.name ASC
    `)

    return res.json({ departments: result.rows })
  } catch (error) {
    next(error)
  }
}

// POST /api/admin/courses
export async function createAdminCourse(req, res, next) {
  const client = await getClient()

  try {
    const validation = validateCourse(req.body)

    if (validation.error) {
      return res.status(400).json({ message: validation.error })
    }

    const course = validation.value

    await client.query('BEGIN')

    // Validate all selected departments before inserting anything.
    if (course.departments.length) {
      const departmentIds = course.departments.map((item) => item.departmentId)

      const departmentCheck = await client.query(
        `
          SELECT id
          FROM departments
          WHERE id = ANY($1::text[])
        `,
        [departmentIds]
      )

      if (departmentCheck.rowCount !== departmentIds.length) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: 'One or more selected departments were not found.',
        })
      }
    }

    const courseId = generateId()

    const insertedCourse = await client.query(
      `
        INSERT INTO courses (
          id, code, name, description, credits, ects, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        courseId,
        course.code,
        course.name,
        course.description,
        course.credits,
        course.ects,
        course.isActive,
      ]
    )

    for (const item of course.departments) {
      await client.query(
        `
          INSERT INTO course_departments (
            id,
            course_id,
            department_id,
            requirement_type,
            elective_group,
            default_quota,
            is_available
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          generateId(),
          courseId,
          item.departmentId,
          item.requirementType || 'REQUIRED',
          item.electiveGroup || null,
          item.defaultQuota === '' || item.defaultQuota === undefined
            ? null
            : item.defaultQuota,
          item.isAvailable !== false,
        ]
      )
    }

    await client.query('COMMIT')

    return res.status(201).json({
      message: 'Course created successfully.',
      course: insertedCourse.rows[0],
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return sendDatabaseError(error, res, next)
  } finally {
    client.release()
  }
}

// PATCH /api/admin/courses/:courseId
export async function updateAdminCourse(req, res, next) {
  const client = await getClient()

  try {
    const { courseId } = req.params
    const validation = validateCourse(req.body)

    if (validation.error) {
      return res.status(400).json({ message: validation.error })
    }

    const course = validation.value

    await client.query('BEGIN')

    const existingCourse = await client.query(
      'SELECT id FROM courses WHERE id = $1 FOR UPDATE',
      [courseId]
    )

    if (!existingCourse.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Course not found.' })
    }

    if (course.departments.length) {
      const departmentIds = course.departments.map((item) => item.departmentId)

      const departmentCheck = await client.query(
        `
          SELECT id
          FROM departments
          WHERE id = ANY($1::text[])
        `,
        [departmentIds]
      )

      if (departmentCheck.rowCount !== departmentIds.length) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: 'One or more selected departments were not found.',
        })
      }
    }

    const updatedCourse = await client.query(
      `
        UPDATE courses
        SET
          code = $1,
          name = $2,
          description = $3,
          credits = $4,
          ects = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `,
      [
        course.code,
        course.name,
        course.description,
        course.credits,
        course.ects,
        course.isActive,
        courseId,
      ]
    )

    // Do not delete course_departments rows: quotas and other records
    // may reference them. Instead, mark omitted associations unavailable.
    const selectedDepartmentIds = course.departments.map(
      (item) => item.departmentId
    )

    if (selectedDepartmentIds.length) {
      await client.query(
        `
          UPDATE course_departments
          SET is_available = FALSE
          WHERE course_id = $1
            AND NOT (department_id = ANY($2::text[]))
        `,
        [courseId, selectedDepartmentIds]
      )
    } else {
      await client.query(
        `
          UPDATE course_departments
          SET is_available = FALSE
          WHERE course_id = $1
        `,
        [courseId]
      )
    }

    for (const item of course.departments) {
      const existingAssociation = await client.query(
        `
          SELECT id
          FROM course_departments
          WHERE course_id = $1 AND department_id = $2
          FOR UPDATE
        `,
        [courseId, item.departmentId]
      )

      const values = [
        item.requirementType || 'REQUIRED',
        item.electiveGroup || null,
        item.defaultQuota === '' || item.defaultQuota === undefined
          ? null
          : item.defaultQuota,
        item.isAvailable !== false,
      ]

      if (existingAssociation.rowCount) {
        await client.query(
          `
            UPDATE course_departments
            SET
              requirement_type = $1,
              elective_group = $2,
              default_quota = $3,
              is_available = $4
            WHERE id = $5
          `,
          [...values, existingAssociation.rows[0].id]
        )
      } else {
        await client.query(
          `
            INSERT INTO course_departments (
              id,
              course_id,
              department_id,
              requirement_type,
              elective_group,
              default_quota,
              is_available
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            generateId(),
            courseId,
            item.departmentId,
            ...values,
          ]
        )
      }
    }

    await client.query('COMMIT')

    return res.json({
      message: 'Course updated successfully.',
      course: updatedCourse.rows[0],
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return sendDatabaseError(error, res, next)
  } finally {
    client.release()
  }
}

// PATCH /api/admin/courses/:courseId/status
export async function updateAdminCourseStatus(req, res, next) {
  try {
    const { courseId } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be true or false.',
      })
    }

    const result = await query(
      `
        UPDATE courses
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, code, name, is_active
      `,
      [isActive, courseId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Course not found.' })
    }

    return res.json({
      message: `Course ${isActive ? 'activated' : 'deactivated'} successfully.`,
      course: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}
