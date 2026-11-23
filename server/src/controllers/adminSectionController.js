
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const SECTION_STATUSES = ['PLANNED', 'OPEN', 'CLOSED', 'CANCELLED']

function sendDatabaseError(res, error, next) {
  if (error.code === '23505') {
    return res.status(409).json({
      message: 'A section with this code already exists for this course and term.'
    })
  }

  if (error.code === '23503') {
    return res.status(400).json({
      message: 'One of the selected records does not exist.'
    })
  }

  return next(error)
}

function validateSchedule(schedule) {
  if (schedule === undefined || schedule === null) return true

  try {
    JSON.stringify(schedule)
    return typeof schedule === 'object'
  } catch {
    return false
  }
}

// GET /api/admin/sections/options
export async function getAdminSectionOptions(req, res, next) {
  try {
    const [terms, courses, professors] = await Promise.all([
      query(`
        SELECT id, name, academic_year, semester, start_date, end_date, is_active
        FROM academic_terms
        ORDER BY academic_year DESC, semester DESC
      `),

      query(`
        SELECT
          c.id AS course_id,
          c.code,
          c.name,
          c.credits,
          c.ects,
          cd.id AS course_department_id,
          cd.department_id,
          cd.requirement_type,
          d.name AS department_name,
          d.code AS department_code
        FROM courses c
        JOIN course_departments cd ON cd.course_id = c.id
        JOIN departments d ON d.id = cd.department_id
        WHERE c.is_active = TRUE
          AND cd.is_available = TRUE
        ORDER BY c.code, d.name
      `),

      query(`
        SELECT
          p.id,
          p.employee_number,
          p.academic_title,
          u.first_name,
          u.last_name,
          u.email,
          d.name AS department_name
        FROM professors p
        JOIN users u ON u.id = p.user_id
        JOIN departments d ON d.id = p.department_id
        WHERE u.is_active = TRUE
        ORDER BY u.last_name, u.first_name
      `)
    ])

    res.json({
      terms: terms.rows,
      courses: courses.rows,
      professors: professors.rows
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/sections
export async function getAdminSections(req, res, next) {
  try {
    const {
      search = '',
      termId = '',
      status = 'ALL',
      departmentId = ''
    } = req.query

    const values = []
    const conditions = []

    if (termId) {
      values.push(termId)
      conditions.push(`cs.term_id = $${values.length}`)
    }

    if (SECTION_STATUSES.includes(status)) {
      values.push(status)
      conditions.push(`cs.status = $${values.length}::section_status`)
    }

    if (departmentId) {
      values.push(departmentId)
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM course_departments cd_filter
          WHERE cd_filter.course_id = cs.course_id
            AND cd_filter.department_id = $${values.length}
        )
      `)
      values.push(departmentId)
    }

    if (search.trim()) {
      values.push(`%${search.trim()}%`)
      conditions.push(`
        (
          c.code ILIKE $${values.length}
          OR c.name ILIKE $${values.length}
          OR cs.section_code ILIKE $${values.length}
          OR cs.room ILIKE $${values.length}
          OR u.first_name ILIKE $${values.length}
          OR u.last_name ILIKE $${values.length}
        )
      `)
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    const result = await query(
      `
      SELECT
        cs.id,
        cs.course_id,
        cs.term_id,
        cs.section_code,
        cs.instructor_id,
        cs.capacity,
        cs.status,
        cs.room,
        cs.schedule,
        cs.created_at,

        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        c.ects,

        t.name AS term_name,
        t.academic_year,
        t.semester,

        p.employee_number,
        p.academic_title,
        u.first_name AS instructor_first_name,
        u.last_name AS instructor_last_name,

        COUNT(DISTINCT e.id) FILTER (
          WHERE e.status = 'ENROLLED'
        )::INTEGER AS enrolled_count,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sdq.id,
                'courseDepartmentId', sdq.course_department_id,
                'departmentId', d.id,
                'departmentName', d.name,
                'departmentCode', d.code,
                'quota', sdq.quota
              )
              ORDER BY d.name
            )
            FROM section_department_quotas sdq
            JOIN course_departments cd
              ON cd.id = sdq.course_department_id
            JOIN departments d
              ON d.id = cd.department_id
            WHERE sdq.section_id = cs.id
          ),
          '[]'::json
        ) AS department_quotas

      FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN academic_terms t ON t.id = cs.term_id

      LEFT JOIN professors p ON p.id = cs.instructor_id
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN enrollments e ON e.section_id = cs.id

      ${whereClause}

      GROUP BY
        cs.id,
        c.id,
        t.id,
        p.id,
        u.id

      ORDER BY t.academic_year DESC, t.semester DESC, c.code, cs.section_code
      `,
      values
    )

    res.json({ sections: result.rows })
  } catch (error) {
    next(error)
  }
}

// GET /api/admin/sections/:sectionId
export async function getAdminSectionDetails(req, res, next) {
  try {
    const { sectionId } = req.params

    const sectionResult = await query(
      `
      SELECT
        cs.*,
        c.code AS course_code,
        c.name AS course_name,
        t.name AS term_name,
        t.academic_year,
        t.semester,
        p.employee_number,
        p.academic_title,
        u.first_name AS instructor_first_name,
        u.last_name AS instructor_last_name,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', sdq.id,
                'courseDepartmentId', sdq.course_department_id,
                'departmentId', d.id,
                'departmentName', d.name,
                'departmentCode', d.code,
                'quota', sdq.quota
              )
              ORDER BY d.name
            )
            FROM section_department_quotas sdq
            JOIN course_departments cd
              ON cd.id = sdq.course_department_id
            JOIN departments d
              ON d.id = cd.department_id
            WHERE sdq.section_id = cs.id
          ),
          '[]'::json
        ) AS department_quotas

      FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN academic_terms t ON t.id = cs.term_id
      LEFT JOIN professors p ON p.id = cs.instructor_id
      LEFT JOIN users u ON u.id = p.user_id
      WHERE cs.id = $1
      `,
      [sectionId]
    )

    if (!sectionResult.rows.length) {
      return res.status(404).json({ message: 'Section not found.' })
    }

    const studentsResult = await query(
      `
      SELECT
        e.id AS enrollment_id,
        e.enrolled_at,
        s.id AS student_id,
        s.student_number,
        s.year_level,
        u.first_name,
        u.last_name,
        u.email,
        d.name AS department_name
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN users u ON u.id = s.user_id
      JOIN departments d ON d.id = s.department_id
      WHERE e.section_id = $1
        AND e.status = 'ENROLLED'
      ORDER BY u.last_name, u.first_name
      `,
      [sectionId]
    )

    res.json({
      section: sectionResult.rows[0],
      students: studentsResult.rows
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/admin/sections
export async function createAdminSection(req, res, next) {
  const {
    courseId,
    termId,
    sectionCode,
    instructorId,
    capacity,
    room,
    schedule,
    status = 'PLANNED',
    departmentQuotas = []
  } = req.body

  const numericCapacity = Number(capacity)

  if (
    !courseId ||
    !termId ||
    !sectionCode?.trim() ||
    !Number.isInteger(numericCapacity) ||
    numericCapacity < 1 ||
    !SECTION_STATUSES.includes(status) ||
    !Array.isArray(departmentQuotas) ||
    !validateSchedule(schedule)
  ) {
    return res.status(400).json({
      message: 'Please provide valid section information.'
    })
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const course = await client.query(
      `SELECT id FROM courses WHERE id = $1 AND is_active = TRUE FOR UPDATE`,
      [courseId]
    )

    if (!course.rows.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Course is not active or does not exist.' })
    }

    const term = await client.query(
      `SELECT id FROM academic_terms WHERE id = $1 FOR UPDATE`,
      [termId]
    )

    if (!term.rows.length) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Academic term does not exist.' })
    }

    const sectionResult = await client.query(
      `
      INSERT INTO course_sections (
        id,
        course_id,
        term_id,
        section_code,
        instructor_id,
        capacity,
        status,
        room,
        schedule
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::section_status, $8, $9::jsonb)
      RETURNING *
      `,
      [
        generateId(),
        courseId,
        termId,
        sectionCode.trim(),
        instructorId || null,
        numericCapacity,
        status,
        room?.trim() || null,
        JSON.stringify(schedule ?? {})
      ]
    )

    const section = sectionResult.rows[0]

    const seenDepartments = new Set()
    let totalQuota = 0

    for (const item of departmentQuotas) {
      const quota = Number(item.quota)

      if (
        !item.courseDepartmentId ||
        !Number.isInteger(quota) ||
        quota < 0 ||
        seenDepartments.has(item.courseDepartmentId)
      ) {
        throw new Error('Each department quota must be valid and unique.')
      }

      seenDepartments.add(item.courseDepartmentId)
      totalQuota += quota

      const association = await client.query(
        `
        SELECT id
        FROM course_departments
        WHERE id = $1
          AND course_id = $2
          AND is_available = TRUE
        `,
        [item.courseDepartmentId, courseId]
      )

      if (!association.rows.length) {
        throw new Error('A selected department is not associated with this course.')
      }

      await client.query(
        `
        INSERT INTO section_department_quotas (
          id,
          section_id,
          course_department_id,
          quota
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          generateId(),
          section.id,
          item.courseDepartmentId,
          quota
        ]
      )
    }

    if (totalQuota > numericCapacity) {
      throw new Error('The sum of department quotas cannot exceed section capacity.')
    }

    await client.query('COMMIT')

    res.status(201).json({
      message: 'Course section created successfully.',
      section
    })
  } catch (error) {
    await client.query('ROLLBACK')

    if (error.code) return sendDatabaseError(res, error, next)

    return res.status(400).json({ message: error.message })
  } finally {
    client.release()
  }
}

// PATCH /api/admin/sections/:sectionId
export async function updateAdminSection(req, res, next) {
  const { sectionId } = req.params
  const {
    sectionCode,
    instructorId,
    capacity,
    room,
    schedule,
    status,
    departmentQuotas
  } = req.body

  if (
    (status !== undefined && !SECTION_STATUSES.includes(status)) ||
    (capacity !== undefined &&
      (!Number.isInteger(Number(capacity)) || Number(capacity) < 1)) ||
    (schedule !== undefined && !validateSchedule(schedule)) ||
    (departmentQuotas !== undefined && !Array.isArray(departmentQuotas))
  ) {
    return res.status(400).json({ message: 'Invalid section information.' })
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const currentResult = await client.query(
      `SELECT * FROM course_sections WHERE id = $1 FOR UPDATE`,
      [sectionId]
    )

    if (!currentResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Section not found.' })
    }

    const current = currentResult.rows[0]
    const nextCapacity = capacity === undefined
      ? current.capacity
      : Number(capacity)

    const enrolledResult = await client.query(
      `
      SELECT COUNT(*)::INTEGER AS count
      FROM enrollments
      WHERE section_id = $1
        AND status = 'ENROLLED'
      `,
      [sectionId]
    )

    if (nextCapacity < enrolledResult.rows[0].count) {
      throw new Error('Capacity cannot be lower than the current number of enrolled students.')
    }

    const updated = await client.query(
      `
      UPDATE course_sections
      SET
        section_code = $1,
        instructor_id = $2,
        capacity = $3,
        room = $4,
        schedule = $5::jsonb,
        status = $6::section_status,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
      `,
      [
        sectionCode === undefined ? current.section_code : sectionCode.trim(),
        instructorId === undefined ? current.instructor_id : instructorId || null,
        nextCapacity,
        room === undefined ? current.room : room?.trim() || null,
        JSON.stringify(schedule === undefined ? current.schedule : schedule ?? {}),
        status === undefined ? current.status : status,
        sectionId
      ]
    )

    if (departmentQuotas !== undefined) {
      const seen = new Set()
      let totalQuota = 0

      for (const item of departmentQuotas) {
        const quota = Number(item.quota)

        if (
          !item.courseDepartmentId ||
          !Number.isInteger(quota) ||
          quota < 0 ||
          seen.has(item.courseDepartmentId)
        ) {
          throw new Error('Department quotas must contain valid, unique entries.')
        }

        seen.add(item.courseDepartmentId)
        totalQuota += quota
      }

      if (totalQuota > nextCapacity) {
        throw new Error('The sum of department quotas cannot exceed section capacity.')
      }

      await client.query(
        `DELETE FROM section_department_quotas WHERE section_id = $1`,
        [sectionId]
      )

      for (const item of departmentQuotas) {
        const association = await client.query(
          `
          SELECT id
          FROM course_departments
          WHERE id = $1
            AND course_id = $2
            AND is_available = TRUE
          `,
          [item.courseDepartmentId, current.course_id]
        )

        if (!association.rows.length) {
          throw new Error('A selected department is not associated with this course.')
        }

        await client.query(
          `
          INSERT INTO section_department_quotas (
            id,
            section_id,
            course_department_id,
            quota
          )
          VALUES ($1, $2, $3, $4)
          `,
          [generateId(), sectionId, item.courseDepartmentId, Number(item.quota)]
        )
      }
    }

    await client.query('COMMIT')

    res.json({
      message: 'Section updated successfully.',
      section: updated.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')

    if (error.code) return sendDatabaseError(res, error, next)

    return res.status(400).json({ message: error.message })
  } finally {
    client.release()
  }
}

// GET /api/admin/sections/course-quotas?termId=...&courseId=...
export async function getCourseDepartmentQuotas(req, res, next) {
  try {
    const { termId, courseId } = req.query

    if (!termId || !courseId) {
      return res.status(400).json({
        message: 'Academic term and course are required.'
      })
    }

    const result = await query(
      `
      SELECT
        cd.id AS course_department_id,
        cd.department_id,
        d.name AS department_name,
        d.code AS department_code,
        cd.default_quota,
        dcq.id AS quota_id,
        dcq.quota,
        COALESCE(
          (
            SELECT SUM(sdq.quota)::INTEGER
            FROM section_department_quotas sdq
            JOIN course_sections cs ON cs.id = sdq.section_id
            WHERE cs.term_id = $1
              AND cs.course_id = $2
              AND sdq.course_department_id = cd.id
          ),
          0
        ) AS allocated_to_sections
      FROM course_departments cd
      JOIN departments d ON d.id = cd.department_id
      LEFT JOIN department_course_quotas dcq
        ON dcq.course_department_id = cd.id
        AND dcq.term_id = $1
      WHERE cd.course_id = $2
        AND cd.is_available = TRUE
      ORDER BY d.name
      `,
      [termId, courseId]
    )

    res.json({ quotas: result.rows })
  } catch (error) {
    next(error)
  }
}

// PUT /api/admin/sections/course-quotas
export async function saveCourseDepartmentQuotas(req, res, next) {
  const { termId, quotas } = req.body

  if (!termId || !Array.isArray(quotas)) {
    return res.status(400).json({
      message: 'Academic term and quota entries are required.'
    })
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    for (const item of quotas) {
      const quota = Number(item.quota)

      if (
        !item.courseDepartmentId ||
        !Number.isInteger(quota) ||
        quota < 0
      ) {
        throw new Error('Each department quota must be a non-negative integer.')
      }

      const association = await client.query(
        `
        SELECT id
        FROM course_departments
        WHERE id = $1
          AND is_available = TRUE
        FOR UPDATE
        `,
        [item.courseDepartmentId]
      )

      if (!association.rows.length) {
        throw new Error('A selected course-department association does not exist or is unavailable.')
      }

      const allocated = await client.query(
        `
        SELECT COALESCE(SUM(sdq.quota), 0)::INTEGER AS total
        FROM section_department_quotas sdq
        JOIN course_sections cs ON cs.id = sdq.section_id
        WHERE cs.term_id = $1
          AND sdq.course_department_id = $2
        `,
        [termId, item.courseDepartmentId]
      )

      if (quota < allocated.rows[0].total) {
        throw new Error(
          `The quota cannot be lower than the ${allocated.rows[0].total} places already allocated to sections.`
        )
      }

      await client.query(
        `
        INSERT INTO department_course_quotas (
          id,
          course_department_id,
          term_id,
          quota
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (course_department_id, term_id)
        DO UPDATE SET quota = EXCLUDED.quota
        `,
        [
          generateId(),
          item.courseDepartmentId,
          termId,
          quota
        ]
      )
    }

    await client.query('COMMIT')

    res.json({ message: 'Department course quotas saved successfully.' })
  } catch (error) {
    await client.query('ROLLBACK')

    if (error.code) return sendDatabaseError(res, error, next)

    return res.status(400).json({ message: error.message })
  } finally {
    client.release()
  }
}
