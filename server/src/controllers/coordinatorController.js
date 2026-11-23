
import { query } from '../config/database.js'

export async function getCoordinatorDashboard(req, res, next) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    // Find the department assigned to this coordinator.
    const profileResult = await query(
      `
        SELECT
          dc.id AS coordinator_id,
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.email,
          d.id AS department_id,
          d.name AS department_name,
          d.code AS department_code,
          f.name AS faculty_name
        FROM department_coordinators dc
        JOIN users u ON u.id = dc.user_id
        JOIN departments d ON d.id = dc.department_id
        JOIN faculties f ON f.id = d.faculty_id
        WHERE dc.user_id = $1
          AND u.is_active = TRUE
        LIMIT 1
      `,
      [userId]
    )

    if (!profileResult.rows.length) {
      return res.status(404).json({
        message:
          'No department has been assigned to your coordinator account.',
      })
    }

    const coordinator = profileResult.rows[0]
    const departmentId = coordinator.department_id

    // Get the active academic term.
    const termResult = await query(
      `
        SELECT
          id,
          name,
          academic_year,
          semester,
          start_date,
          end_date
        FROM academic_terms
        WHERE is_active = TRUE
        ORDER BY start_date DESC
        LIMIT 1
      `
    )

    const activeTerm = termResult.rows[0] || null

    // Get department statistics.
    const statisticsResult = await query(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM students s
            WHERE s.department_id = $1
              AND s.status = 'ACTIVE'
          ) AS total_students,

          (
            SELECT COUNT(*)
            FROM professors p
            WHERE p.department_id = $1
          ) AS total_professors,

          (
            SELECT COUNT(DISTINCT cd.course_id)
            FROM course_departments cd
            JOIN courses c ON c.id = cd.course_id
            WHERE cd.department_id = $1
              AND cd.is_available = TRUE
              AND c.is_active = TRUE
          ) AS total_courses,

          (
            SELECT COUNT(DISTINCT cs.id)
            FROM course_sections cs
            JOIN course_departments cd
              ON cd.course_id = cs.course_id
            WHERE cd.department_id = $1
              AND cs.term_id = $2
              AND cs.status <> 'CANCELLED'
          ) AS total_sections
      `,
      [departmentId, activeTerm?.id || null]
    )

    // Count pending registration and section-change requests.
    const requestsResult = await query(
      `
        SELECT
          (
            SELECT COUNT(*)
            FROM registration_requests rr
            JOIN students s ON s.id = rr.student_id
            WHERE s.department_id = $1
              AND rr.status IN ('PENDING', 'UNDER_REVIEW')
          ) AS pending_registration_requests,

          (
            SELECT COUNT(*)
            FROM section_change_requests scr
            JOIN students s ON s.id = scr.student_id
            WHERE s.department_id = $1
              AND scr.status IN ('PENDING', 'UNDER_REVIEW')
          ) AS pending_section_change_requests
      `,
      [departmentId]
    )

    const stats = statisticsResult.rows[0]
    const requests = requestsResult.rows[0]

    const pendingRegistrationRequests = Number(
      requests.pending_registration_requests
    )

    const pendingSectionChangeRequests = Number(
      requests.pending_section_change_requests
    )

    return res.status(200).json({
      coordinator: {
        id: coordinator.coordinator_id,
        userId: coordinator.user_id,
        firstName: coordinator.first_name,
        lastName: coordinator.last_name,
        email: coordinator.email,
      },

      department: {
        id: coordinator.department_id,
        name: coordinator.department_name,
        code: coordinator.department_code,
        facultyName: coordinator.faculty_name,
      },

      activeTerm,

      summary: {
        totalStudents: Number(stats.total_students),
        totalProfessors: Number(stats.total_professors),
        totalCourses: Number(stats.total_courses),
        totalSections: Number(stats.total_sections),
        pendingRegistrationRequests,
        pendingSectionChangeRequests,
        totalPendingRequests:
          pendingRegistrationRequests + pendingSectionChangeRequests,
      },
    })
  } catch (error) {
    next(error)
  }
}
