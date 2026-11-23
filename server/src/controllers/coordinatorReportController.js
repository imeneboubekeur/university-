
import { query } from '../config/database.js'

async function getCoordinatorDepartment(userId) {
  const result = await query(
    `SELECT
       d.id,
       d.name,
       d.code,
       f.name AS faculty_name
     FROM department_coordinators dc
     JOIN departments d ON d.id = dc.department_id
     LEFT JOIN faculties f ON f.id = d.faculty_id
     WHERE dc.user_id = $1`,
    [userId]
  )

  return result.rows[0] ?? null
}

// GET /api/coordinator/reports
export async function getCoordinatorReports(req, res, next) {
  try {
    const department = await getCoordinatorDepartment(req.user.id)

    if (!department) {
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const termResult = await query(
      `SELECT id, name, academic_year, semester, start_date, end_date
       FROM academic_terms
       WHERE is_active = TRUE
       ORDER BY start_date DESC
       LIMIT 1`
    )

    const activeTerm = termResult.rows[0] ?? null

    const studentStatsResult = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
         COUNT(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended,
         COUNT(*) FILTER (WHERE status = 'GRADUATED')::int AS graduated,
         COUNT(*) FILTER (WHERE status = 'WITHDRAWN')::int AS withdrawn
       FROM students
       WHERE department_id = $1`,
      [department.id]
    )

    const studentsByYearResult = await query(
      `SELECT
         year_level,
         COUNT(*)::int AS student_count
       FROM students
       WHERE department_id = $1
         AND status = 'ACTIVE'
       GROUP BY year_level
       ORDER BY year_level`,
      [department.id]
    )

    const courseStatsResult = await query(
      `SELECT
         COUNT(*)::int AS total_courses,
         COUNT(*) FILTER (
           WHERE cd.requirement_type = 'REQUIRED'
         )::int AS required_courses,
         COUNT(*) FILTER (
           WHERE cd.requirement_type = 'ELECTIVE'
         )::int AS elective_courses,
         COUNT(*) FILTER (
           WHERE cd.requirement_type = 'FREE_ELECTIVE'
         )::int AS free_elective_courses
       FROM course_departments cd
       JOIN courses c ON c.id = cd.course_id
       WHERE cd.department_id = $1
         AND cd.is_available = TRUE
         AND c.is_active = TRUE`,
      [department.id]
    )

    let courseEnrollmentResult = { rows: [] }
    let sectionCapacityResult = { rows: [] }
    let professorStatsResult = { rows: [] }
    let requestStatsResult = { rows: [] }

    if (activeTerm) {
      courseEnrollmentResult = await query(
        `SELECT
           c.id AS course_id,
           c.code AS course_code,
           c.name AS course_name,
           c.credits,
           c.ects,
           cd.requirement_type,
           COALESCE(dcq.quota, cd.default_quota, 0)::int AS course_quota,
           COALESCE(section_data.section_count, 0)::int AS section_count,
           COALESCE(section_data.total_capacity, 0)::int AS total_capacity,
           COALESCE(section_data.enrolled_count, 0)::int AS enrolled_count,
           COALESCE(section_data.department_quota, 0)::int AS department_quota
         FROM course_departments cd
         JOIN courses c ON c.id = cd.course_id
         LEFT JOIN department_course_quotas dcq
           ON dcq.course_department_id = cd.id
          AND dcq.term_id = $2
         LEFT JOIN LATERAL (
           SELECT
             COUNT(DISTINCT cs.id)::int AS section_count,
             COALESCE(SUM(cs.capacity), 0)::int AS total_capacity,
             COALESCE(SUM(enrollment_data.enrolled_count), 0)::int
               AS enrolled_count,
             COALESCE(SUM(section_quota.quota), 0)::int
               AS department_quota
           FROM course_sections cs
           LEFT JOIN LATERAL (
             SELECT COUNT(*)::int AS enrolled_count
             FROM enrollments e
             JOIN students s ON s.id = e.student_id
             WHERE e.section_id = cs.id
               AND e.status = 'ENROLLED'
               AND s.department_id = cd.department_id
           ) enrollment_data ON TRUE
           LEFT JOIN LATERAL (
             SELECT sdq.quota
             FROM section_department_quotas sdq
             WHERE sdq.section_id = cs.id
               AND sdq.course_department_id = cd.id
           ) section_quota ON TRUE
           WHERE cs.course_id = c.id
             AND cs.term_id = $2
             AND cs.status <> 'CANCELLED'
         ) section_data ON TRUE
         WHERE cd.department_id = $1
           AND cd.is_available = TRUE
           AND c.is_active = TRUE
         ORDER BY c.code`,
        [department.id, activeTerm.id]
      )

      sectionCapacityResult = await query(
        `SELECT
           cs.id AS section_id,
           cs.section_code,
           cs.status,
           cs.capacity,
           cs.room,
           cs.schedule,
           c.code AS course_code,
           c.name AS course_name,
           p.id AS professor_id,
           u.first_name AS professor_first_name,
           u.last_name AS professor_last_name,
           COALESCE(enrollment_data.enrolled_count, 0)::int
             AS enrolled_count,
           COALESCE(quota_data.department_quota, 0)::int
             AS department_quota
         FROM course_sections cs
         JOIN courses c ON c.id = cs.course_id
         JOIN course_departments cd
           ON cd.course_id = cs.course_id
          AND cd.department_id = $1
         LEFT JOIN professors p ON p.id = cs.instructor_id
         LEFT JOIN users u ON u.id = p.user_id
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS enrolled_count
           FROM enrollments e
           JOIN students s ON s.id = e.student_id
           WHERE e.section_id = cs.id
             AND e.status = 'ENROLLED'
             AND s.department_id = $1
         ) enrollment_data ON TRUE
         LEFT JOIN LATERAL (
           SELECT sdq.quota AS department_quota
           FROM section_department_quotas sdq
           WHERE sdq.section_id = cs.id
             AND sdq.course_department_id = cd.id
         ) quota_data ON TRUE
         WHERE cs.term_id = $2
           AND cs.status <> 'CANCELLED'
         ORDER BY c.code, cs.section_code`,
        [department.id, activeTerm.id]
      )

      professorStatsResult = await query(
        `SELECT
           p.id AS professor_id,
           p.employee_number,
           p.academic_title,
           u.first_name,
           u.last_name,
           u.email,
           COUNT(DISTINCT cs.id)::int AS assigned_sections,
           COUNT(DISTINCT cs.course_id)::int AS assigned_courses,
           COALESCE(SUM(enrollment_data.enrolled_count), 0)::int
             AS enrolled_students
         FROM professors p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN course_sections cs
           ON cs.instructor_id = p.id
          AND cs.term_id = $2
          AND cs.status <> 'CANCELLED'
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS enrolled_count
           FROM enrollments e
           JOIN students s ON s.id = e.student_id
           WHERE e.section_id = cs.id
             AND e.status = 'ENROLLED'
             AND s.department_id = $1
         ) enrollment_data ON TRUE
         WHERE p.department_id = $1
         GROUP BY
           p.id,
           p.employee_number,
           p.academic_title,
           u.first_name,
           u.last_name,
           u.email
         ORDER BY u.last_name, u.first_name`,
        [department.id, activeTerm.id]
      )

      requestStatsResult = await query(
        `SELECT
           request_category,
           request_status,
           COUNT(*)::int AS request_count
         FROM (
           SELECT
             'REGISTRATION' AS request_category,
             rr.status::text AS request_status
           FROM registration_requests rr
           JOIN students s ON s.id = rr.student_id
           WHERE s.department_id = $1

           UNION ALL

           SELECT
             'SECTION_CHANGE' AS request_category,
             scr.status::text AS request_status
           FROM section_change_requests scr
           JOIN students s ON s.id = scr.student_id
           WHERE s.department_id = $1
         ) requests
         GROUP BY request_category, request_status
         ORDER BY request_category, request_status`,
        [department.id]
      )
    }

    const students = studentStatsResult.rows[0]
    const courseStats = courseStatsResult.rows[0]

    const totalCapacity = sectionCapacityResult.rows.reduce(
      (sum, section) => sum + Number(section.capacity || 0),
      0
    )

    const totalEnrolled = sectionCapacityResult.rows.reduce(
      (sum, section) => sum + Number(section.enrolled_count || 0),
      0
    )

    const totalSectionQuota = sectionCapacityResult.rows.reduce(
      (sum, section) => sum + Number(section.department_quota || 0),
      0
    )

    const requestSummary = {
      total: 0,
      pending: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      registration: 0,
      sectionChanges: 0,
    }

    for (const item of requestStatsResult.rows) {
      const count = Number(item.request_count)

      requestSummary.total += count

      if (item.request_status === 'PENDING') {
        requestSummary.pending += count
      } else if (item.request_status === 'UNDER_REVIEW') {
        requestSummary.underReview += count
      } else if (item.request_status === 'APPROVED') {
        requestSummary.approved += count
      } else if (item.request_status === 'REJECTED') {
        requestSummary.rejected += count
      } else if (item.request_status === 'CANCELLED') {
        requestSummary.cancelled += count
      }

      if (item.request_category === 'REGISTRATION') {
        requestSummary.registration += count
      } else if (item.request_category === 'SECTION_CHANGE') {
        requestSummary.sectionChanges += count
      }
    }

    return res.json({
      department,
      activeTerm,
      overview: {
        students: {
          total: Number(students.total),
          active: Number(students.active),
          suspended: Number(students.suspended),
          graduated: Number(students.graduated),
          withdrawn: Number(students.withdrawn),
        },
        courses: {
          total: Number(courseStats.total_courses),
          required: Number(courseStats.required_courses),
          elective: Number(courseStats.elective_courses),
          freeElective: Number(courseStats.free_elective_courses),
        },
        professors: {
          total: professorStatsResult.rows.length,
          assignedSections: professorStatsResult.rows.reduce(
            (sum, professor) =>
              sum + Number(professor.assigned_sections),
            0
          ),
        },
        sections: {
          total: sectionCapacityResult.rows.length,
          capacity: totalCapacity,
          enrolled: totalEnrolled,
          availableSeats: Math.max(0, totalCapacity - totalEnrolled),
          departmentQuota: totalSectionQuota,
        },
      },
      studentsByYear: studentsByYearResult.rows,
      courseEnrollment: courseEnrollmentResult.rows,
      sectionCapacity: sectionCapacityResult.rows,
      professors: professorStatsResult.rows,
      requests: requestSummary,
    })
  } catch (error) {
    next(error)
  }
}
