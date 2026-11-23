
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

// Get the department assigned to the logged-in coordinator.
async function getCoordinatorDepartment(userId) {
  const result = await query(
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
    [userId]
  )

  return result.rows[0] || null
}

// Get the currently active academic term.
async function getActiveTerm() {
  const result = await query(
    `
    SELECT id, name, academic_year, semester
    FROM academic_terms
    WHERE is_active = TRUE
    ORDER BY start_date DESC
    LIMIT 1
    `
  )

  return result.rows[0] || null
}

function validateQuota(value) {
  const quota = Number(value)

  return Number.isSafeInteger(quota) && quota >= 0
}

// GET /api/coordinator/quotas
export async function getCoordinatorQuotas(req, res, next) {
  try {
    const department = await getCoordinatorDepartment(req.user.id)

    if (!department) {
      return res.status(404).json({
        message: 'No department is assigned to this coordinator.'
      })
    }

    const activeTerm = await getActiveTerm()

    if (!activeTerm) {
      return res.status(200).json({
        department,
        activeTerm: null,
        statistics: {
          totalCourses: 0,
          configuredQuotas: 0,
          totalCourseQuota: 0,
          allocatedSectionPlaces: 0,
          enrolledStudents: 0
        },
        courses: [],
        sections: []
      })
    }

    // Course quotas and department-specific section allocations.
    const coursesResult = await query(
      `
      SELECT
        cd.id AS course_department_id,
        c.id AS course_id,
        c.code,
        c.name,
        c.credits,
        c.ects,
        cd.requirement_type,
        cd.default_quota,
        cd.is_available,

        dcq.id AS quota_id,
        dcq.quota AS configured_quota,

        COALESCE(section_data.section_count, 0)::INTEGER
          AS section_count,

        COALESCE(section_data.allocated_places, 0)::INTEGER
          AS allocated_places,

        COALESCE(section_data.enrolled_students, 0)::INTEGER
          AS enrolled_students

      FROM course_departments cd

      JOIN courses c
        ON c.id = cd.course_id

      LEFT JOIN department_course_quotas dcq
        ON dcq.course_department_id = cd.id
        AND dcq.term_id = $2

      LEFT JOIN LATERAL (
        SELECT
          COUNT(DISTINCT cs.id) AS section_count,

          COALESCE(SUM(DISTINCT sdq.quota), 0) AS allocated_places,

          COUNT(DISTINCT e.id) FILTER (
            WHERE e.status = 'ENROLLED'
              AND s.id IS NOT NULL
          ) AS enrolled_students

        FROM course_sections cs

        LEFT JOIN section_department_quotas sdq
          ON sdq.section_id = cs.id
          AND sdq.course_department_id = cd.id

        LEFT JOIN enrollments e
          ON e.section_id = cs.id
          AND e.status = 'ENROLLED'

        LEFT JOIN students s
          ON s.id = e.student_id
          AND s.department_id = cd.department_id

        WHERE cs.course_id = c.id
          AND cs.term_id = $2
          AND cs.status <> 'CANCELLED'
      ) section_data ON TRUE

      WHERE cd.department_id = $1
        AND cd.is_available = TRUE
        AND c.is_active = TRUE

      ORDER BY c.code ASC
      `,
      [department.id, activeTerm.id]
    )

    // Individual section allocations.
    const sectionsResult = await query(
      `
      SELECT
        cs.id AS section_id,
        cs.section_code,
        cs.status,
        cs.capacity,
        cs.room,
        cs.schedule,

        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,

        cd.id AS course_department_id,
        cd.default_quota,

        sdq.id AS section_quota_id,
        sdq.quota AS allocated_quota,

        COALESCE(enrollment_data.enrolled_students, 0)::INTEGER
          AS enrolled_students,

        COALESCE(other_allocations.allocated_to_others, 0)::INTEGER
          AS allocated_to_others

      FROM course_departments cd

      JOIN courses c
        ON c.id = cd.course_id

      JOIN course_sections cs
        ON cs.course_id = c.id
        AND cs.term_id = $2
        AND cs.status <> 'CANCELLED'

      LEFT JOIN section_department_quotas sdq
        ON sdq.section_id = cs.id
        AND sdq.course_department_id = cd.id

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS enrolled_students
        FROM enrollments e
        JOIN students s
          ON s.id = e.student_id
        WHERE e.section_id = cs.id
          AND e.status = 'ENROLLED'
          AND s.department_id = cd.department_id
      ) enrollment_data ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(other_sdq.quota), 0)
          AS allocated_to_others
        FROM section_department_quotas other_sdq
        WHERE other_sdq.section_id = cs.id
          AND other_sdq.course_department_id <> cd.id
      ) other_allocations ON TRUE

      WHERE cd.department_id = $1
        AND cd.is_available = TRUE
        AND c.is_active = TRUE

      ORDER BY c.code, cs.section_code
      `,
      [department.id, activeTerm.id]
    )

    const courses = coursesResult.rows
    const sections = sectionsResult.rows

    const statistics = {
      totalCourses: courses.length,

      configuredQuotas: courses.filter(
        course => course.configured_quota !== null
      ).length,

      totalCourseQuota: courses.reduce(
        (sum, course) =>
          sum + Number(
            course.configured_quota ?? course.default_quota ?? 0
          ),
        0
      ),

      allocatedSectionPlaces: courses.reduce(
        (sum, course) => sum + Number(course.allocated_places),
        0
      ),

      enrolledStudents: courses.reduce(
        (sum, course) => sum + Number(course.enrolled_students),
        0
      )
    }

    return res.status(200).json({
      department,
      activeTerm,
      statistics,
      courses,
      sections
    })
  } catch (error) {
    next(error)
  }
}

// PUT /api/coordinator/quotas/course/:courseDepartmentId
export async function updateCoordinatorCourseQuota(req, res, next) {
  const client = await getClient()

  try {
    const { courseDepartmentId } = req.params
    const { quota } = req.body

    if (!validateQuota(quota)) {
      return res.status(400).json({
        message: 'Quota must be a non-negative whole number.'
      })
    }

    const department = await getCoordinatorDepartment(req.user.id)

    if (!department) {
      return res.status(404).json({
        message: 'No department is assigned to this coordinator.'
      })
    }

    const activeTerm = await getActiveTerm()

    if (!activeTerm) {
      return res.status(400).json({
        message: 'There is no active academic term.'
      })
    }

    await client.query('BEGIN')

    const courseResult = await client.query(
      `
      SELECT
        cd.id,
        cd.default_quota,
        c.name,
        c.code
      FROM course_departments cd
      JOIN courses c ON c.id = cd.course_id
      WHERE cd.id = $1
        AND cd.department_id = $2
        AND cd.is_available = TRUE
        AND c.is_active = TRUE
      FOR UPDATE OF cd
      `,
      [courseDepartmentId, department.id]
    )

    if (courseResult.rows.length === 0) {
      await client.query('ROLLBACK')

      return res.status(404).json({
        message: 'Course not found in your department.'
      })
    }

    const allocatedResult = await client.query(
      `
      SELECT
        COALESCE(SUM(sdq.quota), 0)::INTEGER AS allocated,
        COALESCE(SUM(enrollment_data.enrolled), 0)::INTEGER AS enrolled

      FROM course_sections cs

      LEFT JOIN section_department_quotas sdq
        ON sdq.section_id = cs.id
        AND sdq.course_department_id = $1

      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS enrolled
        FROM enrollments e
        JOIN students s ON s.id = e.student_id
        WHERE e.section_id = cs.id
          AND e.status = 'ENROLLED'
          AND s.department_id = $2
      ) enrollment_data ON TRUE

      WHERE cs.course_id = (
        SELECT course_id
        FROM course_departments
        WHERE id = $1
      )
        AND cs.term_id = $3
        AND cs.status <> 'CANCELLED'
      `,
      [courseDepartmentId, department.id, activeTerm.id]
    )

    const allocated = Number(allocatedResult.rows[0].allocated)
    const enrolled = Number(allocatedResult.rows[0].enrolled)

    if (Number(quota) < enrolled) {
      await client.query('ROLLBACK')

      return res.status(400).json({
        message: `The quota cannot be lower than the ${enrolled} students already enrolled in this course.`
      })
    }

    if (Number(quota) < allocated) {
      await client.query('ROLLBACK')

      return res.status(400).json({
        message: `The quota cannot be lower than the ${allocated} places already allocated to sections.`
      })
    }

    const result = await client.query(
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

      RETURNING id, quota
      `,
      [
        generateId(),
        courseDepartmentId,
        activeTerm.id,
        Number(quota)
      ]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      message: 'Course quota updated successfully.',
      quota: result.rows[0].quota,
      course: courseResult.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    next(error)
  } finally {
    client.release()
  }
}

// PUT /api/coordinator/quotas/section/:sectionId
export async function updateCoordinatorSectionQuota(req, res, next) {
  const client = await getClient()

  try {
    const { sectionId } = req.params
    const { courseDepartmentId, quota } = req.body

    if (!courseDepartmentId) {
      return res.status(400).json({
        message: 'Course department is required.'
      })
    }

    if (!validateQuota(quota)) {
      return res.status(400).json({
        message: 'Quota must be a non-negative whole number.'
      })
    }

    const department = await getCoordinatorDepartment(req.user.id)

    if (!department) {
      return res.status(404).json({
        message: 'No department is assigned to this coordinator.'
      })
    }

    const activeTerm = await getActiveTerm()

    if (!activeTerm) {
      return res.status(400).json({
        message: 'There is no active academic term.'
      })
    }

    await client.query('BEGIN')

    const sectionResult = await client.query(
      `
      SELECT
        cs.id,
        cs.capacity,
        cs.section_code,
        cs.status,
        cs.course_id,

        c.code AS course_code,
        c.name AS course_name,

        cd.id AS course_department_id,
        cd.default_quota,

        dcq.quota AS course_quota

      FROM course_sections cs

      JOIN courses c
        ON c.id = cs.course_id

      JOIN course_departments cd
        ON cd.course_id = c.id
        AND cd.department_id = $2
        AND cd.is_available = TRUE

      LEFT JOIN department_course_quotas dcq
        ON dcq.course_department_id = cd.id
        AND dcq.term_id = $3

      WHERE cs.id = $1
        AND cs.term_id = $3
        AND cs.status <> 'CANCELLED'
        AND cd.id = $4

      FOR UPDATE OF cs, cd
      `,
      [sectionId, department.id, activeTerm.id, courseDepartmentId]
    )

    if (sectionResult.rows.length === 0) {
      await client.query('ROLLBACK')

      return res.status(404).json({
        message: 'Section not found for this department and academic term.'
      })
    }

    const section = sectionResult.rows[0]

    const enrolledResult = await client.query(
      `
      SELECT COUNT(*)::INTEGER AS enrolled
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE e.section_id = $1
        AND e.status = 'ENROLLED'
        AND s.department_id = $2
      `,
      [sectionId, department.id]
    )

    const enrolled = Number(enrolledResult.rows[0].enrolled)

    if (Number(quota) < enrolled) {
      await client.query('ROLLBACK')

      return res.status(400).json({
        message: `Section quota cannot be lower than its ${enrolled} currently enrolled students.`
      })
    }

    const otherAllocationsResult = await client.query(
      `
      SELECT COALESCE(SUM(quota), 0)::INTEGER AS allocated
      FROM section_department_quotas
      WHERE section_id = $1
        AND course_department_id <> $2
      `,
      [sectionId, courseDepartmentId]
    )

    const allocatedToOthers = Number(
      otherAllocationsResult.rows[0].allocated
    )

    if (allocatedToOthers + Number(quota) > Number(section.capacity)) {
      await client.query('ROLLBACK')

      return res.status(400).json({
        message: `This section has a capacity of ${section.capacity}. Other departments have already been allocated ${allocatedToOthers} places.`
      })
    }

    const courseAllocatedResult = await client.query(
      `
      SELECT COALESCE(SUM(sdq.quota), 0)::INTEGER AS allocated
      FROM course_sections cs

      JOIN section_department_quotas sdq
        ON sdq.section_id = cs.id

      WHERE cs.course_id = $1
        AND cs.term_id = $2
        AND cs.status <> 'CANCELLED'
        AND sdq.course_department_id = $3
        AND cs.id <> $4
      `,
      [
        section.course_id,
        activeTerm.id,
        courseDepartmentId,
        sectionId
      ]
    )

    const allocatedInOtherSections = Number(
      courseAllocatedResult.rows[0].allocated
    )

    const effectiveCourseQuota =
      section.course_quota ?? section.default_quota

    if (
      effectiveCourseQuota !== null &&
      effectiveCourseQuota !== undefined &&
      allocatedInOtherSections + Number(quota) >
        Number(effectiveCourseQuota)
    ) {
      await client.query('ROLLBACK')

      return res.status(400).json({
        message: `This allocation would exceed the department's course quota of ${effectiveCourseQuota}.`
      })
    }

    const result = await client.query(
      `
      INSERT INTO section_department_quotas (
        id,
        section_id,
        course_department_id,
        quota
      )
      VALUES ($1, $2, $3, $4)

      ON CONFLICT (section_id, course_department_id)
      DO UPDATE SET quota = EXCLUDED.quota

      RETURNING id, quota
      `,
      [
        generateId(),
        sectionId,
        courseDepartmentId,
        Number(quota)
      ]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      message: 'Section quota updated successfully.',
      allocation: result.rows[0],
      section: {
        id: section.id,
        section_code: section.section_code,
        course_code: section.course_code,
        course_name: section.course_name
      }
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    next(error)
  } finally {
    client.release()
  }
}
