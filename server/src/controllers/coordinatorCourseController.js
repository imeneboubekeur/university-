
import { query } from '../config/database.js'

export async function getCoordinatorCourses(req, res, next) {
  try {
    const { search = '', requirement = 'ALL' } = req.query

    // Find the department assigned to the logged-in coordinator.
    const departmentResult = await query(
      `
      SELECT
        d.id,
        d.name,
        d.code,
        f.name AS faculty_name
      FROM department_coordinators dc
      JOIN departments d ON d.id = dc.department_id
      JOIN faculties f ON f.id = d.faculty_id
      WHERE dc.user_id = $1
      LIMIT 1
      `,
      [req.user.id]
    )

    if (departmentResult.rows.length === 0) {
      return res.status(404).json({
        message: 'No department is assigned to this coordinator.'
      })
    }

    const department = departmentResult.rows[0]

    // Find the currently active academic term.
    const termResult = await query(
      `
      SELECT id, name, academic_year, semester
      FROM academic_terms
      WHERE is_active = TRUE
      ORDER BY start_date DESC
      LIMIT 1
      `
    )

    const activeTerm = termResult.rows[0] || null

    const coursesResult = await query(
      `
      SELECT
        c.id,
        c.code,
        c.name,
        c.description,
        c.credits,
        c.ects,
        c.is_active,

        cd.id AS course_department_id,
        cd.requirement_type,
        cd.elective_group,
        cd.default_quota,
        cd.is_available,

        dcq.quota AS term_quota,

        COALESCE(curriculum.years, ARRAY[]::INTEGER[]) AS curriculum_years,

        COALESCE(section_stats.total_sections, 0)::INTEGER
          AS total_sections,

        COALESCE(section_stats.open_sections, 0)::INTEGER
          AS open_sections,

        COALESCE(section_stats.closed_sections, 0)::INTEGER
          AS closed_sections,

        COALESCE(section_stats.total_capacity, 0)::INTEGER
          AS total_capacity,

        COALESCE(section_stats.enrolled_students, 0)::INTEGER
          AS enrolled_students

      FROM course_departments cd

      JOIN courses c
        ON c.id = cd.course_id

      JOIN departments d
        ON d.id = cd.department_id

      LEFT JOIN department_course_quotas dcq
        ON dcq.course_department_id = cd.id
        AND dcq.term_id = $2

      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(DISTINCT dc.study_year ORDER BY dc.study_year)
          AS years
        FROM department_curriculum dc
        WHERE dc.department_id = cd.department_id
          AND dc.course_id = cd.course_id
          AND dc.is_active = TRUE
      ) curriculum ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT cs.id) AS total_sections,

          COUNT(DISTINCT cs.id) FILTER (
            WHERE cs.status = 'OPEN'
          ) AS open_sections,

          COUNT(DISTINCT cs.id) FILTER (
            WHERE cs.status = 'CLOSED'
          ) AS closed_sections,

          COALESCE(SUM(
            CASE
              WHEN sdq.id IS NOT NULL THEN sdq.quota
              WHEN NOT EXISTS (
                SELECT 1
                FROM section_department_quotas other_sdq
                WHERE other_sdq.section_id = cs.id
              ) THEN cs.capacity
              ELSE 0
            END
          ), 0) AS total_capacity,

          COALESCE(SUM(
            COALESCE(enrollment_stats.enrolled, 0)
          ), 0) AS enrolled_students

        FROM course_sections cs

        LEFT JOIN section_department_quotas sdq
          ON sdq.section_id = cs.id
          AND sdq.course_department_id = cd.id

        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS enrolled
          FROM enrollments e
          WHERE e.section_id = cs.id
            AND e.status = 'ENROLLED'
        ) enrollment_stats ON TRUE

        WHERE cs.course_id = c.id
          AND cs.term_id = $2
          AND (
            sdq.id IS NOT NULL
            OR NOT EXISTS (
              SELECT 1
              FROM section_department_quotas other_sdq
              WHERE other_sdq.section_id = cs.id
            )
          )
      ) section_stats ON TRUE

      WHERE cd.department_id = $1
        AND cd.is_available = TRUE
        AND c.is_active = TRUE
        AND (
          $3 = ''
          OR c.name ILIKE '%' || $3 || '%'
          OR c.code ILIKE '%' || $3 || '%'
        )
        AND (
          $4 = 'ALL'
          OR cd.requirement_type::TEXT = $4
        )

      ORDER BY
        CASE cd.requirement_type
          WHEN 'REQUIRED' THEN 1
          WHEN 'ELECTIVE' THEN 2
          WHEN 'FREE_ELECTIVE' THEN 3
          ELSE 4
        END,
        c.code ASC
      `,
      [
        department.id,
        activeTerm?.id || null,
        search.trim(),
        requirement
      ]
    )

    const courses = coursesResult.rows

    const statistics = {
      totalCourses: courses.length,

      requiredCourses: courses.filter(
        course => course.requirement_type === 'REQUIRED'
      ).length,

      electiveCourses: courses.filter(
        course => course.requirement_type === 'ELECTIVE'
      ).length,

      freeElectiveCourses: courses.filter(
        course => course.requirement_type === 'FREE_ELECTIVE'
      ).length,

      totalSections: courses.reduce(
        (sum, course) => sum + Number(course.total_sections),
        0
      ),

      openSections: courses.reduce(
        (sum, course) => sum + Number(course.open_sections),
        0
      )
    }

    return res.status(200).json({
      department,
      activeTerm,
      statistics,
      courses
    })
  } catch (error) {
    next(error)
  }
}
