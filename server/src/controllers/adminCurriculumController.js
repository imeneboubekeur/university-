
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const formatError = (res, error, next) => {
  if (error.code === '23505') {
    return res.status(409).json({
      message: 'This course is already assigned to this curriculum.'
    })
  }

  if (error.code === '23503') {
    return res.status(400).json({
      message: 'The selected department or course does not exist.'
    })
  }

  next(error)
}

// GET /api/admin/curriculum
export async function getAdminCurriculum(req, res, next) {
  try {
    const {
      departmentId = '',
      studyYear = '',
      semester = '',
      status = 'ALL'
    } = req.query

    const conditions = []
    const values = []

    if (departmentId) {
      values.push(departmentId)
      conditions.push(`dc.department_id = $${values.length}`)
    }

    if (studyYear) {
      values.push(Number(studyYear))
      conditions.push(`dc.study_year = $${values.length}`)
    }

    if (semester) {
      values.push(Number(semester))
      conditions.push(`dc.semester = $${values.length}`)
    }

    if (status === 'ACTIVE') {
      conditions.push('dc.is_active = TRUE')
    } else if (status === 'INACTIVE') {
      conditions.push('dc.is_active = FALSE')
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    const result = await query(
      `
      SELECT
        dc.id,
        dc.department_id,
        dc.course_id,
        dc.study_year,
        dc.semester,
        dc.is_active,

        d.name AS department_name,
        d.code AS department_code,
        f.name AS faculty_name,

        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        c.ects,
        c.is_active AS course_is_active,

        cd.requirement_type,
        cd.elective_group,
        cd.default_quota,
        cd.is_available

      FROM department_curriculum dc

      JOIN departments d
        ON d.id = dc.department_id

      JOIN faculties f
        ON f.id = d.faculty_id

      JOIN courses c
        ON c.id = dc.course_id

      LEFT JOIN course_departments cd
        ON cd.course_id = dc.course_id
        AND cd.department_id = dc.department_id

      ${whereClause}

      ORDER BY
        d.name,
        dc.study_year,
        dc.semester,
        c.code
      `,
      values
    )

    res.json({ curriculum: result.rows })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/curriculum/departments
export async function getCurriculumDepartments(req, res, next) {
  try {
    const result = await query(`
      SELECT
        d.id,
        d.name,
        d.code,
        f.name AS faculty_name
      FROM departments d
      JOIN faculties f ON f.id = d.faculty_id
      ORDER BY f.name, d.name
    `)

    res.json({ departments: result.rows })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/curriculum/available-courses?departmentId=...
export async function getAvailableCurriculumCourses(req, res, next) {
  try {
    const { departmentId } = req.query

    if (!departmentId) {
      return res.status(400).json({
        message: 'Department is required.'
      })
    }

    const result = await query(
      `
      SELECT
        c.id,
        c.code,
        c.name,
        c.credits,
        c.ects,
        cd.requirement_type,
        cd.elective_group,
        cd.default_quota

      FROM course_departments cd

      JOIN courses c
        ON c.id = cd.course_id

      WHERE cd.department_id = $1
        AND cd.is_available = TRUE
        AND c.is_active = TRUE

      ORDER BY c.code
      `,
      [departmentId]
    )

    res.json({ courses: result.rows })
  } catch (error) {
    next(error)
  }
}

// POST /api/admin/curriculum
export async function addCurriculumCourse(req, res, next) {
  const {
    departmentId,
    courseId,
    studyYear,
    semester
  } = req.body

  if (
    !departmentId ||
    !courseId ||
    !Number.isInteger(Number(studyYear)) ||
    Number(studyYear) < 1 ||
    Number(studyYear) > 6 ||
    ![1, 2].includes(Number(semester))
  ) {
    return res.status(400).json({
      message: 'Please provide a department, course, valid study year, and semester.'
    })
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const association = await client.query(
      `
      SELECT cd.id
      FROM course_departments cd
      JOIN courses c ON c.id = cd.course_id
      WHERE cd.department_id = $1
        AND cd.course_id = $2
        AND cd.is_available = TRUE
        AND c.is_active = TRUE
      FOR UPDATE OF cd
      `,
      [departmentId, courseId]
    )

    if (!association.rows.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: 'This course is not available for the selected department. Assign it in Course Management first.'
      })
    }

    const existing = await client.query(
      `
      SELECT id, is_active
      FROM department_curriculum
      WHERE department_id = $1
        AND course_id = $2
        AND study_year = $3
        AND semester = $4
      FOR UPDATE
      `,
      [departmentId, courseId, Number(studyYear), Number(semester)]
    )

    let assignment

    if (existing.rows.length) {
      assignment = await client.query(
        `
        UPDATE department_curriculum
        SET is_active = TRUE
        WHERE id = $1
        RETURNING *
        `,
        [existing.rows[0].id]
      )
    } else {
      assignment = await client.query(
        `
        INSERT INTO department_curriculum (
          id,
          department_id,
          course_id,
          study_year,
          semester,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING *
        `,
        [
          generateId(),
          departmentId,
          courseId,
          Number(studyYear),
          Number(semester)
        ]
      )
    }

    await client.query('COMMIT')

    res.status(201).json({
      message: 'Course added to curriculum successfully.',
      assignment: assignment.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    formatError(res, error, next)
  } finally {
    client.release()
  }
}

// PATCH /api/admin/curriculum/:assignmentId/status
export async function updateCurriculumStatus(req, res, next) {
  try {
    const { assignmentId } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'A valid active status is required.'
      })
    }

    const result = await query(
      `
      UPDATE department_curriculum
      SET is_active = $1
      WHERE id = $2
      RETURNING *
      `,
      [isActive, assignmentId]
    )

    if (!result.rows.length) {
      return res.status(404).json({
        message: 'Curriculum assignment not found.'
      })
    }

    res.json({
      message: 'Curriculum status updated.',
      assignment: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}
