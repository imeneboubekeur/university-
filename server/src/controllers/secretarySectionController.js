
import { query } from '../config/database.js'

export async function getSecretarySections(req, res, next) {
  try {
    const { search = '', termId = '', status = 'ALL' } = req.query

    const allowedStatuses = [
      'ALL',
      'PLANNED',
      'OPEN',
      'CLOSED',
      'CANCELLED',
    ]

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid section status.' })
    }

    const params = []
    const conditions = []

    if (termId.trim()) {
      params.push(termId.trim())
      conditions.push(`cs.term_id = $${params.length}`)
    }

    if (status !== 'ALL') {
      params.push(status)
      conditions.push(`cs.status = $${params.length}`)
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`)
      const index = params.length

      conditions.push(`(
        c.code ILIKE $${index}
        OR c.name ILIKE $${index}
        OR cs.section_code ILIKE $${index}
        OR COALESCE(u.first_name, '') ILIKE $${index}
        OR COALESCE(u.last_name, '') ILIKE $${index}
        OR COALESCE(cs.room, '') ILIKE $${index}
      )`)
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    const result = await query(
      `
      SELECT
        cs.id,
        cs.section_code,
        cs.capacity,
        cs.status::TEXT AS status,
        cs.room,
        cs.schedule,
        cs.created_at,

        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        c.ects,

        at.id AS term_id,
        at.name AS term_name,
        at.academic_year,
        at.semester,
        at.is_active AS term_is_active,

        p.id AS professor_id,
        p.employee_number,
        p.academic_title,
        pu.first_name AS professor_first_name,
        pu.last_name AS professor_last_name,

        COUNT(e.id) FILTER (
          WHERE e.status = 'ENROLLED'
        )::INTEGER AS enrolled_count

      FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN academic_terms at ON at.id = cs.term_id

      LEFT JOIN professors p ON p.id = cs.instructor_id
      LEFT JOIN users pu ON pu.id = p.user_id

      LEFT JOIN enrollments e ON e.section_id = cs.id

      ${whereClause}

      GROUP BY
        cs.id,
        c.id,
        at.id,
        p.id,
        pu.id

      ORDER BY
        at.academic_year DESC,
        at.semester DESC,
        c.code ASC,
        cs.section_code ASC
      `,
      params
    )

    res.json({ sections: result.rows })
  } catch (error) {
    next(error)
  }
}

export async function getSecretarySectionDetails(req, res, next) {
  try {
    const { sectionId } = req.params

    const sectionResult = await query(
      `
      SELECT
        cs.id,
        cs.section_code,
        cs.capacity,
        cs.status::TEXT AS status,
        cs.room,
        cs.schedule,

        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        c.ects,

        at.id AS term_id,
        at.name AS term_name,
        at.academic_year,
        at.semester,

        p.id AS professor_id,
        p.employee_number,
        p.academic_title,
        pu.first_name AS professor_first_name,
        pu.last_name AS professor_last_name,

        COUNT(e.id) FILTER (
          WHERE e.status = 'ENROLLED'
        )::INTEGER AS enrolled_count

      FROM course_sections cs
      JOIN courses c ON c.id = cs.course_id
      JOIN academic_terms at ON at.id = cs.term_id

      LEFT JOIN professors p ON p.id = cs.instructor_id
      LEFT JOIN users pu ON pu.id = p.user_id
      LEFT JOIN enrollments e ON e.section_id = cs.id

      WHERE cs.id = $1

      GROUP BY
        cs.id,
        c.id,
        at.id,
        p.id,
        pu.id
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
        e.status::TEXT AS enrollment_status,
        e.enrolled_at,

        s.id AS student_id,
        s.student_number,
        s.year_level,
        s.status::TEXT AS student_status,

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

      ORDER BY u.last_name ASC, u.first_name ASC
      `,
      [sectionId]
    )

    res.json({
      section: sectionResult.rows[0],
      students: studentsResult.rows,
    })
  } catch (error) {
    next(error)
  }
}

export async function getSecretarySectionTerms(req, res, next) {
  try {
    const result = await query(
      `
      SELECT
        id,
        name,
        academic_year,
        semester,
        start_date,
        end_date,
        is_active
      FROM academic_terms
      ORDER BY academic_year DESC, semester DESC
      `
    )

    res.json({ terms: result.rows })
  } catch (error) {
    next(error)
  }
}
