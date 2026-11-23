
import { query } from '../config/database.js'

// GET /api/coordinator/professors
export async function getCoordinatorProfessors(req, res, next) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    const {
      search = '',
      status = 'ALL',
    } = req.query

    const normalizedStatus = String(status).toUpperCase()

    if (!['ALL', 'ACTIVE', 'INACTIVE'].includes(normalizedStatus)) {
      return res.status(400).json({
        message: 'Invalid account status filter.',
      })
    }

    // Resolve the coordinator's assigned department.
    const coordinatorResult = await query(
      `
      SELECT
        dc.department_id,
        d.name AS department_name,
        d.code AS department_code,
        f.name AS faculty_name
      FROM department_coordinators dc
      JOIN departments d
        ON d.id = dc.department_id
      JOIN faculties f
        ON f.id = d.faculty_id
      WHERE dc.user_id = $1
      LIMIT 1
      `,
      [userId]
    )

    if (!coordinatorResult.rowCount) {
      return res.status(403).json({
        message: 'No department has been assigned to this coordinator.',
      })
    }

    const department = coordinatorResult.rows[0]

    const professorsResult = await query(
      `
      SELECT
        p.id AS professor_id,
        p.employee_number,
        p.academic_title,
        p.department_id,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.image_url,
        u.is_active,

        COUNT(DISTINCT cs.id)::INTEGER AS total_sections,

        COUNT(DISTINCT cs.course_id)::INTEGER AS total_courses,

        COUNT(DISTINCT e.student_id) FILTER (
          WHERE e.status = 'ENROLLED'
        )::INTEGER AS total_enrolled_students

      FROM professors p
      JOIN users u
        ON u.id = p.user_id

      LEFT JOIN course_sections cs
        ON cs.instructor_id = p.id
        AND cs.status <> 'CANCELLED'

      LEFT JOIN enrollments e
        ON e.section_id = cs.id

      WHERE
        p.department_id = $1

        AND (
          $2 = ''
          OR p.employee_number ILIKE '%' || $2 || '%'
          OR COALESCE(p.academic_title, '') ILIKE '%' || $2 || '%'
          OR u.first_name ILIKE '%' || $2 || '%'
          OR u.last_name ILIKE '%' || $2 || '%'
          OR u.email ILIKE '%' || $2 || '%'
          OR (u.first_name || ' ' || u.last_name)
             ILIKE '%' || $2 || '%'
        )

        AND (
          $3 = 'ALL'
          OR ($3 = 'ACTIVE' AND u.is_active = TRUE)
          OR ($3 = 'INACTIVE' AND u.is_active = FALSE)
        )

      GROUP BY
        p.id,
        p.employee_number,
        p.academic_title,
        p.department_id,
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.image_url,
        u.is_active

      ORDER BY
        u.last_name ASC,
        u.first_name ASC

      LIMIT 500
      `,
      [
        department.department_id,
        String(search).trim(),
        normalizedStatus,
      ]
    )

    const statisticsResult = await query(
      `
      SELECT
        COUNT(*)::INTEGER AS total_professors,

        COUNT(*) FILTER (
          WHERE u.is_active = TRUE
        )::INTEGER AS active_professors,

        COUNT(*) FILTER (
          WHERE u.is_active = FALSE
        )::INTEGER AS inactive_professors

      FROM professors p
      JOIN users u
        ON u.id = p.user_id

      WHERE p.department_id = $1
      `,
      [department.department_id]
    )

    res.json({
      department: {
        id: department.department_id,
        name: department.department_name,
        code: department.department_code,
        faculty_name: department.faculty_name,
      },
      statistics: statisticsResult.rows[0],
      professors: professorsResult.rows,
      total: professorsResult.rows.length,
    })
  } catch (error) {
    next(error)
  }
}
