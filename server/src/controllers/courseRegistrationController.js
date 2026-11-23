
import { getClient, query } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

// Convert academic term semester values into the curriculum's numeric semester.
// Supports values such as FALL/SPRING or 1/2.
function getSemesterNumber(value) {
  const semester = String(value ?? '').trim().toLowerCase()

  if (['1', 'fall', 'autumn', 'first', 'first semester'].includes(semester)) {
    return 1
  }

  if (['2', 'spring', 'second', 'second semester'].includes(semester)) {
    return 2
  }

  return null
}

// GET /api/student/courses/catalog
export async function getCourseCatalog(req, res, next) {
  try {
    const studentResult = await query(
      `SELECT id, department_id, year_level
       FROM students
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.id]
    )

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Student profile not found.',
      })
    }

    const student = studentResult.rows[0]

    const termResult = await query(
      `SELECT
          t.id,
          t.name,
          t.academic_year,
          t.semester,
          rw.registration_opens_at,
          rw.registration_closes_at,
          rw.id AS registration_window_id
       FROM academic_terms t
       LEFT JOIN LATERAL (
          SELECT
              id,
              registration_opens_at,
              registration_closes_at
          FROM registration_windows
          WHERE term_id = t.id
            AND is_active = TRUE
          ORDER BY registration_opens_at DESC
          LIMIT 1
       ) rw ON TRUE
       WHERE t.is_active = TRUE
       ORDER BY t.start_date DESC
       LIMIT 1`
    )

    const term = termResult.rows[0] || null

    if (!term) {
      return res.status(200).json({
        currentTerm: null,
        registrationOpen: false,
        courses: [],
      })
    }

    const now = new Date()

    const opensAt = term.registration_opens_at
      ? new Date(term.registration_opens_at)
      : null

    const closesAt = term.registration_closes_at
      ? new Date(term.registration_closes_at)
      : null

    const registrationOpen =
      Boolean(term.registration_window_id) &&
      opensAt &&
      closesAt &&
      now >= opensAt &&
      now <= closesAt

    const semesterNumber = getSemesterNumber(term.semester)

    const coursesResult = await query(
      `SELECT
          c.id AS course_id,
          c.code AS course_code,
          c.name AS course_name,
          c.description,
          c.credits,
          c.ects,

          curriculum.study_year,
          curriculum.semester AS curriculum_semester,

          cd.id AS course_department_id,
          cd.requirement_type,
          cd.elective_group,

          cs.id AS section_id,
          cs.section_code,
          cs.capacity,
          cs.status AS section_status,
          cs.room,
          cs.schedule,

          p.academic_title,
          instructor.first_name AS instructor_first_name,
          instructor.last_name AS instructor_last_name,

          COALESCE(enrolled.enrolled_count, 0)::INTEGER
              AS enrolled_count,

          COALESCE(pending.pending_count, 0)::INTEGER
              AS pending_count,

          GREATEST(
              cs.capacity
              - COALESCE(enrolled.enrolled_count, 0)
              - COALESCE(pending.pending_count, 0),
              0
          )::INTEGER AS remaining_seats,

          COALESCE(sdq.quota, dcq.quota, cd.default_quota)
              AS department_quota,

          CASE
              WHEN COALESCE(sdq.quota, dcq.quota, cd.default_quota) IS NULL
                  THEN NULL
              WHEN sdq.quota IS NOT NULL
                  THEN GREATEST(
                      sdq.quota
                      - COALESCE(department_section_enrolled.enrolled_count, 0)
                      - COALESCE(department_section_pending.pending_count, 0),
                      0
                  )
              ELSE GREATEST(
                  COALESCE(dcq.quota, cd.default_quota)
                  - COALESCE(department_course_enrolled.enrolled_count, 0)
                  - COALESCE(department_course_pending.pending_count, 0),
                  0
              )
          END AS department_remaining_seats,

          COALESCE(dcq.quota, cd.default_quota)
              AS department_course_quota,

          CASE
              WHEN COALESCE(dcq.quota, cd.default_quota) IS NULL
                  THEN NULL
              ELSE GREATEST(
                  COALESCE(dcq.quota, cd.default_quota)
                  - COALESCE(department_course_enrolled.enrolled_count, 0)
                  - COALESCE(department_course_pending.pending_count, 0),
                  0
              )
          END AS department_course_remaining_seats,

          sdq.quota AS section_department_quota,

          CASE
              WHEN sdq.quota IS NULL THEN NULL
              ELSE GREATEST(
                  sdq.quota
                  - COALESCE(department_section_enrolled.enrolled_count, 0)
                  - COALESCE(department_section_pending.pending_count, 0),
                  0
              )
          END AS section_department_remaining_seats,

          EXISTS (
              SELECT 1
              FROM enrollments existing
              WHERE existing.student_id = $1
                AND existing.section_id = cs.id
                AND existing.status = 'ENROLLED'
          ) AS already_enrolled,

          EXISTS (
              SELECT 1
              FROM registration_requests existing_request
              WHERE existing_request.student_id = $1
                AND existing_request.section_id = cs.id
                AND existing_request.type = 'ADD'
                AND existing_request.status IN ('PENDING', 'UNDER_REVIEW')
          ) AS request_pending

      FROM course_departments cd

      INNER JOIN courses c
          ON c.id = cd.course_id

      INNER JOIN department_curriculum curriculum
          ON curriculum.course_id = c.id
          AND curriculum.department_id = cd.department_id
          AND curriculum.study_year = $4
          AND curriculum.is_active = TRUE
          AND curriculum.semester = COALESCE($5, curriculum.semester)

      INNER JOIN course_sections cs
          ON cs.course_id = c.id
          AND cs.term_id = $2

      LEFT JOIN professors p
          ON p.id = cs.instructor_id

      LEFT JOIN users instructor
          ON instructor.id = p.user_id

      LEFT JOIN department_course_quotas dcq
          ON dcq.course_department_id = cd.id
          AND dcq.term_id = $2

      LEFT JOIN section_department_quotas sdq
          ON sdq.section_id = cs.id
          AND sdq.course_department_id = cd.id

      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS enrolled_count
          FROM enrollments e
          WHERE e.section_id = cs.id
            AND e.status = 'ENROLLED'
      ) enrolled ON TRUE

      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS pending_count
          FROM registration_requests rr
          WHERE rr.section_id = cs.id
            AND rr.type = 'ADD'
            AND rr.status IN ('PENDING', 'UNDER_REVIEW')
      ) pending ON TRUE

      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS enrolled_count
          FROM enrollments e
          INNER JOIN students s ON s.id = e.student_id
          WHERE e.section_id = cs.id
            AND e.status = 'ENROLLED'
            AND s.department_id = $3
      ) department_section_enrolled ON TRUE

      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS pending_count
          FROM registration_requests rr
          INNER JOIN students s ON s.id = rr.student_id
          WHERE rr.section_id = cs.id
            AND rr.type = 'ADD'
            AND rr.status IN ('PENDING', 'UNDER_REVIEW')
            AND s.department_id = $3
      ) department_section_pending ON TRUE

      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS enrolled_count
          FROM enrollments e
          INNER JOIN course_sections enrolled_section
              ON enrolled_section.id = e.section_id
          INNER JOIN students s
              ON s.id = e.student_id
          WHERE enrolled_section.course_id = c.id
            AND enrolled_section.term_id = $2
            AND e.status = 'ENROLLED'
            AND s.department_id = $3
      ) department_course_enrolled ON TRUE

      LEFT JOIN LATERAL (
          SELECT COUNT(*) AS pending_count
          FROM registration_requests rr
          INNER JOIN course_sections requested_section
              ON requested_section.id = rr.section_id
          INNER JOIN students s
              ON s.id = rr.student_id
          WHERE requested_section.course_id = c.id
            AND requested_section.term_id = $2
            AND rr.type = 'ADD'
            AND rr.status IN ('PENDING', 'UNDER_REVIEW')
            AND s.department_id = $3
      ) department_course_pending ON TRUE

      WHERE cd.department_id = $3
        AND cd.is_available = TRUE
        AND c.is_active = TRUE
        AND cs.status = 'OPEN'

      ORDER BY c.code, cs.section_code`,
      [
        student.id,
        term.id,
        student.department_id,
        student.year_level,
        semesterNumber,
      ]
    )

    return res.status(200).json({
      currentTerm: term,
      registrationOpen: Boolean(registrationOpen),
      courses: coursesResult.rows,
    })
  } catch (error) {
    next(error)
  }
}


// GET /api/student/courses/my-courses
export async function getMyCourses(req, res, next) {
  try {
    const result = await query(
      `SELECT
          e.id AS enrollment_id,
          e.status AS enrollment_status,
          e.enrolled_at,

          c.id AS course_id,
          c.code AS course_code,
          c.name AS course_name,
          c.credits,
          c.ects,

          cs.id AS section_id,
          cs.section_code,
          cs.room,
          cs.schedule,

          t.name AS term_name,
          t.academic_year,
          t.semester,

          p.academic_title,
          instructor.first_name AS instructor_first_name,
          instructor.last_name AS instructor_last_name

      FROM students s

      INNER JOIN enrollments e
          ON e.student_id = s.id

      INNER JOIN course_sections cs
          ON cs.id = e.section_id

      INNER JOIN courses c
          ON c.id = cs.course_id

      INNER JOIN academic_terms t
          ON t.id = cs.term_id

      LEFT JOIN professors p
          ON p.id = cs.instructor_id

      LEFT JOIN users instructor
          ON instructor.id = p.user_id

      WHERE s.user_id = $1
        AND e.status = 'ENROLLED'

      ORDER BY t.start_date DESC, c.code`,
      [req.user.id]
    )

    return res.status(200).json({
      courses: result.rows,
    })
  } catch (error) {
    next(error)
  }
}


// POST /api/student/courses/requests
export async function createCourseRegistrationRequest(req, res, next) {
  let client
  let transactionStarted = false

  try {
    const { sectionId, reason = null } = req.body

    if (!sectionId || typeof sectionId !== 'string') {
      return res.status(400).json({
        message: 'A valid section is required.',
      })
    }

    client = await getClient()

    await client.query('BEGIN')
    transactionStarted = true

    // Lock the student's record.
    const studentResult = await client.query(
      `SELECT id, department_id, year_level
       FROM students
       WHERE user_id = $1
       FOR UPDATE`,
      [req.user.id]
    )

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(404).json({
        message: 'Student profile not found.',
      })
    }

    const student = studentResult.rows[0]

    // Find and lock the active registration window.
    const termResult = await client.query(
      `SELECT
          t.id,
          t.semester,
          rw.registration_opens_at,
          rw.registration_closes_at
       FROM academic_terms t
       INNER JOIN registration_windows rw
          ON rw.term_id = t.id
       WHERE t.is_active = TRUE
         AND rw.is_active = TRUE
       ORDER BY t.start_date DESC, rw.registration_opens_at DESC
       LIMIT 1
       FOR UPDATE OF rw`
    )

    if (termResult.rows.length === 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(400).json({
        message: 'There is no active registration window.',
      })
    }

    const term = termResult.rows[0]
    const now = new Date()

    if (
      !term.registration_opens_at ||
      !term.registration_closes_at ||
      now < new Date(term.registration_opens_at) ||
      now > new Date(term.registration_closes_at)
    ) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(400).json({
        message: 'Course registration is currently closed.',
      })
    }

    const semesterNumber = getSemesterNumber(term.semester)

    // Lock the section and its department-course association.
    // Locking cd also serializes quota checks across sections
    // belonging to the same department and course.
    const sectionResult = await client.query(
      `SELECT
          cs.id AS section_id,
          cs.capacity,
          cs.status,
          cs.term_id,

          c.id AS course_id,
          c.code AS course_code,
          c.name AS course_name,
          c.is_active,

          cd.id AS course_department_id,
          cd.requirement_type,
          cd.default_quota,

          curriculum.study_year,
          curriculum.semester AS curriculum_semester,

          dcq.quota AS course_quota,
          sdq.quota AS section_quota

      FROM course_sections cs

      INNER JOIN courses c
          ON c.id = cs.course_id

      INNER JOIN course_departments cd
          ON cd.course_id = c.id
          AND cd.department_id = $2
          AND cd.is_available = TRUE

      INNER JOIN department_curriculum curriculum
          ON curriculum.course_id = c.id
          AND curriculum.department_id = cd.department_id
          AND curriculum.study_year = $4
          AND curriculum.is_active = TRUE
          AND curriculum.semester = COALESCE($5, curriculum.semester)

      LEFT JOIN department_course_quotas dcq
          ON dcq.course_department_id = cd.id
          AND dcq.term_id = cs.term_id

      LEFT JOIN section_department_quotas sdq
          ON sdq.section_id = cs.id
          AND sdq.course_department_id = cd.id

      WHERE cs.id = $1
        AND cs.term_id = $3

      FOR UPDATE OF cs, cd`,
      [
        sectionId,
        student.department_id,
        term.id,
        student.year_level,
        semesterNumber,
      ]
    )

    if (sectionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(404).json({
        message: 'This course section is not available for your department or study year.',
      })
    }

    const section = sectionResult.rows[0]

    if (!section.is_active || section.status !== 'OPEN') {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(400).json({
        message: 'This course section is not open for registration.',
      })
    }

    // Prevent duplicate enrollments or pending ADD requests.
    const duplicateResult = await client.query(
      `SELECT id
       FROM enrollments
       WHERE student_id = $1
         AND section_id = $2
         AND status = 'ENROLLED'

       UNION ALL

       SELECT id
       FROM registration_requests
       WHERE student_id = $1
         AND section_id = $2
         AND type = 'ADD'
         AND status IN ('PENDING', 'UNDER_REVIEW')

       LIMIT 1`,
      [student.id, sectionId]
    )

    if (duplicateResult.rows.length > 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(409).json({
        message: 'You are already enrolled or have a pending request for this section.',
      })
    }

    // Count section occupancy and department occupancy.
    // Course-level department occupancy is counted across all
    // sections of the course in the active term.
    const occupancyResult = await client.query(
      `SELECT

          (
              SELECT COUNT(*)
              FROM enrollments
              WHERE section_id = $1
                AND status = 'ENROLLED'
          ) AS section_enrolled,

          (
              SELECT COUNT(*)
              FROM registration_requests
              WHERE section_id = $1
                AND type = 'ADD'
                AND status IN ('PENDING', 'UNDER_REVIEW')
          ) AS section_pending,

          (
              SELECT COUNT(*)
              FROM enrollments e
              INNER JOIN course_sections cs
                  ON cs.id = e.section_id
              WHERE cs.course_id = $2
                AND cs.term_id = $3
                AND e.status = 'ENROLLED'
          ) AS course_enrolled,

          (
              SELECT COUNT(*)
              FROM registration_requests rr
              INNER JOIN course_sections cs
                  ON cs.id = rr.section_id
              WHERE cs.course_id = $2
                AND cs.term_id = $3
                AND rr.type = 'ADD'
                AND rr.status IN ('PENDING', 'UNDER_REVIEW')
          ) AS course_pending,

          (
              SELECT COUNT(*)
              FROM enrollments e
              INNER JOIN students s
                  ON s.id = e.student_id
              WHERE e.section_id = $1
                AND e.status = 'ENROLLED'
                AND s.department_id = $4
          ) AS department_section_enrolled,

          (
              SELECT COUNT(*)
              FROM registration_requests rr
              INNER JOIN students s
                  ON s.id = rr.student_id
              WHERE rr.section_id = $1
                AND rr.type = 'ADD'
                AND rr.status IN ('PENDING', 'UNDER_REVIEW')
                AND s.department_id = $4
          ) AS department_section_pending,

          (
              SELECT COUNT(*)
              FROM enrollments e
              INNER JOIN course_sections cs
                  ON cs.id = e.section_id
              INNER JOIN students s
                  ON s.id = e.student_id
              WHERE cs.course_id = $2
                AND cs.term_id = $3
                AND e.status = 'ENROLLED'
                AND s.department_id = $4
          ) AS department_course_enrolled,

          (
              SELECT COUNT(*)
              FROM registration_requests rr
              INNER JOIN course_sections cs
                  ON cs.id = rr.section_id
              INNER JOIN students s
                  ON s.id = rr.student_id
              WHERE cs.course_id = $2
                AND cs.term_id = $3
                AND rr.type = 'ADD'
                AND rr.status IN ('PENDING', 'UNDER_REVIEW')
                AND s.department_id = $4
          ) AS department_course_pending`,
      [
        sectionId,
        section.course_id,
        term.id,
        student.department_id,
      ]
    )

    const occupancy = occupancyResult.rows[0]

    // Check total section capacity.
    const sectionOccupancy =
      Number(occupancy.section_enrolled) +
      Number(occupancy.section_pending)

    if (sectionOccupancy >= Number(section.capacity)) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(409).json({
        message: 'This section has no remaining seats.',
      })
    }

    // Check department's course-level quota.
    const courseDepartmentQuota =
      section.course_quota ?? section.default_quota

    if (courseDepartmentQuota !== null) {
      const courseDepartmentOccupancy =
        Number(occupancy.department_course_enrolled) +
        Number(occupancy.department_course_pending)

      if (courseDepartmentOccupancy >= Number(courseDepartmentQuota)) {
        await client.query('ROLLBACK')
        transactionStarted = false

        return res.status(409).json({
          message: 'Your department has reached its quota for this course.',
        })
      }
    }

    // Check department's section-specific quota independently.
    if (section.section_quota !== null) {
      const sectionDepartmentOccupancy =
        Number(occupancy.department_section_enrolled) +
        Number(occupancy.department_section_pending)

      if (sectionDepartmentOccupancy >= Number(section.section_quota)) {
        await client.query('ROLLBACK')
        transactionStarted = false

        return res.status(409).json({
          message: 'Your department has reached its quota for this section.',
        })
      }
    }

    // Create the ADD registration request.
    const requestId = generateId()

    const requestResult = await client.query(
      `INSERT INTO registration_requests (
          id,
          student_id,
          section_id,
          type,
          status,
          reason,
          submitted_at,
          updated_at
      )
      VALUES (
          $1,
          $2,
          $3,
          'ADD',
          'PENDING',
          $4,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
      )
      RETURNING
          id,
          student_id,
          section_id,
          type,
          status,
          reason,
          submitted_at`,
      [requestId, student.id, sectionId, reason]
    )

    await client.query('COMMIT')
    transactionStarted = false

    return res.status(201).json({
      message: 'Course registration request submitted successfully.',
      request: requestResult.rows[0],
    })
  } catch (error) {
    if (client && transactionStarted) {
      await client.query('ROLLBACK')
    }

    next(error)
  } finally {
    if (client) {
      client.release()
    }
  }
}
