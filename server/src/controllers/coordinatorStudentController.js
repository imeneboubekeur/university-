
import { query } from '../config/database.js'

// GET /api/coordinator/students
export async function getCoordinatorStudents(req, res, next) {
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
      yearLevel = 'ALL',
    } = req.query

    const allowedStatuses = [
      'ALL',
      'ACTIVE',
      'SUSPENDED',
      'GRADUATED',
      'WITHDRAWN',
    ]

    const normalizedStatus = String(status).toUpperCase()

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        message: 'Invalid student status filter.',
      })
    }

    let normalizedYearLevel = null

    if (String(yearLevel) !== 'ALL') {
      normalizedYearLevel = Number(yearLevel)

      if (
        !Number.isInteger(normalizedYearLevel) ||
        normalizedYearLevel < 1 ||
        normalizedYearLevel > 6
      ) {
        return res.status(400).json({
          message: 'Invalid year level filter.',
        })
      }
    }

    // Resolve the coordinator's department from their account.
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

    const studentsResult = await query(
      `
      SELECT
        s.id,
        s.student_number,
        s.enrollment_year,
        s.year_level,
        s.status AS student_status,
        s.created_at,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.image_url
      FROM students s
      JOIN users u
        ON u.id = s.user_id
      WHERE
        s.department_id = $1
        AND (
          $2 = ''
          OR s.student_number ILIKE '%' || $2 || '%'
          OR u.first_name ILIKE '%' || $2 || '%'
          OR u.last_name ILIKE '%' || $2 || '%'
          OR u.email ILIKE '%' || $2 || '%'
          OR (u.first_name || ' ' || u.last_name)
             ILIKE '%' || $2 || '%'
        )
        AND (
          $3 = 'ALL'
          OR s.status::TEXT = $3
        )
        AND (
          $4::INTEGER IS NULL
          OR s.year_level = $4
        )
      ORDER BY
        s.year_level ASC,
        u.last_name ASC,
        u.first_name ASC
      LIMIT 500
      `,
      [
        department.department_id,
        String(search).trim(),
        normalizedStatus,
        normalizedYearLevel,
      ]
    )

    const students = studentsResult.rows

    const statisticsResult = await query(
      `
      SELECT
        COUNT(*)::INTEGER AS total_students,
        COUNT(*) FILTER (
          WHERE status = 'ACTIVE'
        )::INTEGER AS active_students,
        COUNT(*) FILTER (
          WHERE status = 'SUSPENDED'
        )::INTEGER AS suspended_students,
        COUNT(*) FILTER (
          WHERE status = 'GRADUATED'
        )::INTEGER AS graduated_students,
        COUNT(*) FILTER (
          WHERE status = 'WITHDRAWN'
        )::INTEGER AS withdrawn_students
      FROM students
      WHERE department_id = $1
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
      students,
      total: students.length,
    })
  } catch (error) {
    next(error)
  }
}
