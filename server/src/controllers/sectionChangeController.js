
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// GET /api/student/section-changes/options
// Get alternative sections for the student's current enrollments.
export async function getSectionChangeOptions(req, res, next) {
  try {
    const result = await query(
      `SELECT
          e.id AS enrollment_id,
          e.section_id AS current_section_id,

          c.id AS course_id,
          c.code AS course_code,
          c.name AS course_name,
          c.credits,
          c.ects,

          current_section.section_code AS current_section_code,

          target.id AS target_section_id,
          target.section_code AS target_section_code,
          target.room AS target_room,
          target.schedule AS target_schedule,
          target.capacity,

          t.id AS term_id,
          t.name AS term_name,
          t.academic_year,

          -- Total students enrolled in the target section.
          (
            SELECT COUNT(*)::INTEGER
            FROM enrollments target_enrollment
            WHERE target_enrollment.section_id = target.id
              AND target_enrollment.status = 'ENROLLED'
          ) AS enrolled_count,

          -- Section-specific department quota.
          sdq.quota AS section_department_quota,

          -- Course-wide department quota.
          dcq.quota AS course_department_quota,

          -- Default department quota.
          cd.default_quota,

          -- Department students in this target section.
          (
            SELECT COUNT(*)::INTEGER
            FROM enrollments department_enrollment
            JOIN students department_student
              ON department_student.id = department_enrollment.student_id
            WHERE department_enrollment.section_id = target.id
              AND department_enrollment.status = 'ENROLLED'
              AND department_student.department_id = s.department_id
          ) AS department_enrolled_count,

          -- Department students enrolled in this course
          -- across all sections of the same term.
          (
            SELECT COUNT(*)::INTEGER
            FROM enrollments course_enrollment
            JOIN course_sections enrolled_section
              ON enrolled_section.id = course_enrollment.section_id
            JOIN students course_student
              ON course_student.id = course_enrollment.student_id
            WHERE enrolled_section.course_id = c.id
              AND enrolled_section.term_id = t.id
              AND course_enrollment.status = 'ENROLLED'
              AND course_student.department_id = s.department_id
          ) AS course_department_enrolled_count,

          -- Effective section quota for displaying availability.
          COALESCE(
            sdq.quota,
            cd.default_quota,
            target.capacity
          ) AS department_quota

       FROM enrollments e

       JOIN students s
         ON s.id = e.student_id

       JOIN course_sections current_section
         ON current_section.id = e.section_id

       JOIN courses c
         ON c.id = current_section.course_id

       JOIN academic_terms t
         ON t.id = current_section.term_id

       JOIN course_departments cd
         ON cd.course_id = c.id
        AND cd.department_id = s.department_id
        AND cd.is_available = TRUE

       JOIN course_sections target
         ON target.course_id = current_section.course_id
        AND target.term_id = current_section.term_id
        AND target.id <> current_section.id
        AND target.status = 'OPEN'

       LEFT JOIN section_department_quotas sdq
         ON sdq.section_id = target.id
        AND sdq.course_department_id = cd.id

       LEFT JOIN department_course_quotas dcq
         ON dcq.course_department_id = cd.id
        AND dcq.term_id = target.term_id

       WHERE s.user_id = $1
         AND e.status = 'ENROLLED'

         -- Only show alternatives during the section-change window.
         AND EXISTS (
           SELECT 1
           FROM registration_windows rw
           WHERE rw.term_id = t.id
             AND rw.is_active = TRUE
             AND CURRENT_TIMESTAMP BETWEEN
                 rw.section_change_opens_at
                 AND rw.section_change_closes_at
         )

         -- Do not allow another active request for this enrollment.
         AND NOT EXISTS (
           SELECT 1
           FROM section_change_requests scr
           WHERE scr.enrollment_id = e.id
             AND scr.status IN ('PENDING', 'UNDER_REVIEW')
         )

       ORDER BY c.code, target.section_code`,
      [req.user.id]
    )

    res.status(200).json({
      options: result.rows,
    })
  } catch (error) {
    next(error)
  }
}


// GET /api/student/section-changes
// Get the student's section-change request history.
export async function getMySectionChangeRequests(req, res, next) {
  try {
    const result = await query(
      `SELECT
          scr.id,
          scr.enrollment_id,
          scr.target_section_id,
          scr.status,
          scr.reason,
          scr.review_note,
          scr.submitted_at,
          scr.reviewed_at,

          c.code AS course_code,
          c.name AS course_name,

          current_section.section_code AS current_section_code,
          target_section.section_code AS target_section_code,

          t.name AS term_name,
          t.academic_year

       FROM section_change_requests scr

       JOIN students s
         ON s.id = scr.student_id

       JOIN enrollments e
         ON e.id = scr.enrollment_id

       JOIN course_sections current_section
         ON current_section.id = e.section_id

       JOIN course_sections target_section
         ON target_section.id = scr.target_section_id

       JOIN courses c
         ON c.id = current_section.course_id

       JOIN academic_terms t
         ON t.id = current_section.term_id

       WHERE s.user_id = $1

       ORDER BY scr.submitted_at DESC`,
      [req.user.id]
    )

    res.status(200).json({
      requests: result.rows,
    })
  } catch (error) {
    next(error)
  }
}


// POST /api/student/section-changes
// Submit a new section-change request.
export async function createSectionChangeRequest(req, res, next) {
  const client = await getClient()
  let transactionStarted = false

  try {
    const { enrollmentId, targetSectionId, reason } = req.body

    if (!enrollmentId || !targetSectionId) {
      throw createError(
        'Please select your current course and a target section.'
      )
    }

    if (reason !== undefined && typeof reason !== 'string') {
      throw createError('The request reason must be text.')
    }

    if (reason && reason.length > 1000) {
      throw createError('The request reason cannot exceed 1000 characters.')
    }

    await client.query('BEGIN')
    transactionStarted = true

    // 1. Lock the student's current enrollment.
    const enrollmentResult = await client.query(
      `SELECT
          e.id,
          e.student_id,
          e.section_id,
          e.status,

          cs.course_id,
          cs.term_id,

          s.department_id

       FROM enrollments e

       JOIN students s
         ON s.id = e.student_id

       JOIN course_sections cs
         ON cs.id = e.section_id

       WHERE e.id = $1
         AND s.user_id = $2
         AND e.status = 'ENROLLED'

       FOR UPDATE OF e`,
      [enrollmentId, req.user.id]
    )

    if (enrollmentResult.rows.length === 0) {
      throw createError(
        'Your current enrollment was not found.',
        404
      )
    }

    const enrollment = enrollmentResult.rows[0]

    if (enrollment.section_id === targetSectionId) {
      throw createError(
        'You are already enrolled in this section.'
      )
    }


    // 2. Lock the target section.
    // This prevents concurrent requests from exceeding its capacity.
    const targetResult = await client.query(
      `SELECT
          id,
          course_id,
          term_id,
          capacity,
          status

       FROM course_sections

       WHERE id = $1

       FOR UPDATE`,
      [targetSectionId]
    )

    if (targetResult.rows.length === 0) {
      throw createError(
        'The selected target section does not exist.',
        404
      )
    }

    const target = targetResult.rows[0]


    // 3. Make sure the target belongs to the same course and term.
    if (
      target.course_id !== enrollment.course_id ||
      target.term_id !== enrollment.term_id
    ) {
      throw createError(
        'You can only change to another section of the same course and term.'
      )
    }

    if (target.status !== 'OPEN') {
      throw createError(
        'The selected section is not open.'
      )
    }


    // 4. Check the section-change registration window.
    const windowResult = await client.query(
      `SELECT id

       FROM registration_windows

       WHERE term_id = $1
         AND is_active = TRUE
         AND CURRENT_TIMESTAMP BETWEEN
             section_change_opens_at
             AND section_change_closes_at

       LIMIT 1

       FOR UPDATE`,
      [enrollment.term_id]
    )

    if (windowResult.rows.length === 0) {
      throw createError(
        'The section-change period is currently closed.'
      )
    }


    // 5. Lock the course-department association.
    // This serializes quota checks for the same course and department.
    const departmentCourseResult = await client.query(
      `SELECT
          id,
          default_quota

       FROM course_departments

       WHERE course_id = $1
         AND department_id = $2
         AND is_available = TRUE

       FOR UPDATE`,
      [
        enrollment.course_id,
        enrollment.department_id,
      ]
    )

    if (departmentCourseResult.rows.length === 0) {
      throw createError(
        'This course is not available to your department.'
      )
    }

    const departmentCourse = departmentCourseResult.rows[0]


    // 6. Check total section capacity.
    // This counts students from every department.
    const capacityResult = await client.query(
      `SELECT COUNT(*)::INTEGER AS enrolled_count

       FROM enrollments

       WHERE section_id = $1
         AND status = 'ENROLLED'`,
      [targetSectionId]
    )

    const totalEnrolled = capacityResult.rows[0].enrolled_count

    if (totalEnrolled >= target.capacity) {
      throw createError(
        'The selected section is full.'
      )
    }


    // 7. Retrieve the two department quotas independently.
    const quotaResult = await client.query(
      `SELECT
          sdq.quota AS section_quota,
          dcq.quota AS course_quota,
          cd.default_quota

       FROM course_departments cd

       LEFT JOIN section_department_quotas sdq
         ON sdq.course_department_id = cd.id
        AND sdq.section_id = $1

       LEFT JOIN department_course_quotas dcq
         ON dcq.course_department_id = cd.id
        AND dcq.term_id = $2

       WHERE cd.id = $3`,
      [
        targetSectionId,
        target.term_id,
        departmentCourse.id,
      ]
    )

    const quotas = quotaResult.rows[0]

    if (!quotas) {
      throw createError(
        'Department quota information could not be found.'
      )
    }


    // 8. Check section-specific department quota.
    // If no explicit section quota exists, use the department default.
    // If neither exists, total section capacity still applies.
    const sectionDepartmentQuota =
      quotas.section_quota ?? quotas.default_quota

    const sectionDepartmentCountResult = await client.query(
      `SELECT COUNT(*)::INTEGER AS enrolled_count

       FROM enrollments e

       JOIN students s
         ON s.id = e.student_id

       WHERE e.section_id = $1
         AND e.status = 'ENROLLED'
         AND s.department_id = $2`,
      [
        targetSectionId,
        enrollment.department_id,
      ]
    )

    const sectionDepartmentCount =
      sectionDepartmentCountResult.rows[0].enrolled_count

    if (
      sectionDepartmentQuota !== null &&
      sectionDepartmentQuota !== undefined &&
      sectionDepartmentCount >= sectionDepartmentQuota
    ) {
      throw createError(
        'Your department has reached its quota for this section.'
      )
    }


    // 9. Check course-wide department quota independently.
    // Count all active enrollments in this course and term,
    // across every section, for this department.
    //
    // A section change does not add a new course enrollment.
    // Therefore, the existing enrollment is included in this count,
    // and the check rejects only if the course quota is already exceeded.
    const courseDepartmentCountResult = await client.query(
      `SELECT COUNT(*)::INTEGER AS enrolled_count

       FROM enrollments e

       JOIN course_sections cs
         ON cs.id = e.section_id

       JOIN students s
         ON s.id = e.student_id

       WHERE cs.course_id = $1
         AND cs.term_id = $2
         AND e.status = 'ENROLLED'
         AND s.department_id = $3`,
      [
        enrollment.course_id,
        target.term_id,
        enrollment.department_id,
      ]
    )

    const courseDepartmentCount =
      courseDepartmentCountResult.rows[0].enrolled_count

    const courseDepartmentQuota =
      quotas.course_quota ?? quotas.default_quota

    if (
      courseDepartmentQuota !== null &&
      courseDepartmentQuota !== undefined &&
      courseDepartmentCount > courseDepartmentQuota
    ) {
      throw createError(
        'Your department has exceeded its quota for this course.'
      )
    }


    // 10. Prevent duplicate active requests.
    const duplicateResult = await client.query(
      `SELECT id

       FROM section_change_requests

       WHERE enrollment_id = $1
         AND status IN ('PENDING', 'UNDER_REVIEW')

       LIMIT 1`,
      [enrollmentId]
    )

    if (duplicateResult.rows.length > 0) {
      throw createError(
        'You already have an active section-change request.',
        409
      )
    }


    // 11. Insert the request.
    // The actual enrollment remains unchanged until approval.
    const requestId = generateId()

    const requestResult = await client.query(
      `INSERT INTO section_change_requests (
          id,
          student_id,
          enrollment_id,
          target_section_id,
          status,
          reason
       )

       VALUES ($1, $2, $3, $4, 'PENDING', $5)

       RETURNING *`,
      [
        requestId,
        enrollment.student_id,
        enrollment.id,
        targetSectionId,
        reason?.trim() || null,
      ]
    )

    await client.query('COMMIT')
    transactionStarted = false

    res.status(201).json({
      message: 'Your section-change request has been submitted.',
      request: requestResult.rows[0],
    })

  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK')
    }

    next(error)

  } finally {
    client.release()
  }
}


// PATCH /api/student/section-changes/:requestId/cancel
// A student can cancel only their own pending request.
export async function cancelSectionChangeRequest(req, res, next) {
  try {
    const result = await query(
      `UPDATE section_change_requests scr

       SET status = 'CANCELLED',
           updated_at = CURRENT_TIMESTAMP

       FROM students s

       WHERE scr.id = $1
         AND scr.student_id = s.id
         AND s.user_id = $2
         AND scr.status = 'PENDING'

       RETURNING
          scr.id,
          scr.status,
          scr.updated_at`,
      [
        req.params.requestId,
        req.user.id,
      ]
    )

    if (result.rows.length === 0) {
      throw createError(
        'Request not found or it can no longer be cancelled.',
        404
      )
    }

    res.status(200).json({
      message: 'Your section-change request has been cancelled.',
      request: result.rows[0],
    })

  } catch (error) {
    next(error)
  }
}
