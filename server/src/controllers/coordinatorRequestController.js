
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

async function getCoordinatorDepartment(userId) {
  const result = await query(
    `SELECT department_id
     FROM department_coordinators
     WHERE user_id = $1`,
    [userId]
  )

  return result.rows[0]?.department_id ?? null
}

function validateReview(status) {
  return ['APPROVED', 'REJECTED'].includes(status)
}

async function checkSectionAvailability(client, sectionId, departmentId) {
  const sectionResult = await client.query(
    `SELECT
       cs.id,
       cs.course_id,
       cs.term_id,
       cs.capacity,
       cs.status,
       at.is_active
     FROM course_sections cs
     JOIN academic_terms at ON at.id = cs.term_id
     WHERE cs.id = $1
     FOR UPDATE OF cs`,
    [sectionId]
  )

  const section = sectionResult.rows[0]

  if (!section) {
    throw new Error('The selected section does not exist.')
  }

  if (section.status !== 'OPEN') {
    throw new Error('The selected section is not open.')
  }

  if (!section.is_active) {
    throw new Error('The selected section does not belong to the active academic term.')
  }

  const enrollmentResult = await client.query(
    `SELECT
       COUNT(*)::int AS total_enrolled,
       COUNT(*) FILTER (
         WHERE s.department_id = $2
       )::int AS department_enrolled
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     WHERE e.section_id = $1
       AND e.status = 'ENROLLED'`,
    [sectionId, departmentId]
  )

  const enrollment = enrollmentResult.rows[0]

  if (Number(enrollment.total_enrolled) >= Number(section.capacity)) {
    throw new Error('The section has reached its total capacity.')
  }

  const allocationResult = await client.query(
    `SELECT
       sdq.quota,
       (
         SELECT COUNT(*)::int
         FROM enrollments e
         JOIN students s ON s.id = e.student_id
         WHERE e.section_id = sdq.section_id
           AND s.department_id = sdq.course_department_id_department
           AND e.status = 'ENROLLED'
       ) AS department_enrolled
     FROM (
       SELECT
         sdq.section_id,
         sdq.quota,
         cd.department_id AS course_department_id_department
       FROM section_department_quotas sdq
       JOIN course_departments cd
         ON cd.id = sdq.course_department_id
       WHERE sdq.section_id = $1
         AND cd.department_id = $2
     ) sdq`,
    [sectionId, departmentId]
  )

  const allocation = allocationResult.rows[0]

  const configuredResult = await client.query(
    `SELECT COUNT(*)::int AS allocation_count
     FROM section_department_quotas
     WHERE section_id = $1`,
    [sectionId]
  )

  const hasDepartmentAllocations =
    Number(configuredResult.rows[0].allocation_count) > 0

  if (hasDepartmentAllocations && !allocation) {
    throw new Error('This section has no allocation for your department.')
  }

  if (
    allocation &&
    Number(allocation.department_enrolled) >= Number(allocation.quota)
  ) {
    throw new Error('Your department has reached its allocated quota for this section.')
  }

  return section
}

// GET /api/coordinator/requests
export async function getCoordinatorRequests(req, res, next) {
  try {
    const departmentId = await getCoordinatorDepartment(req.user.id)

    if (!departmentId) {
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const {
      type = 'ALL',
      status = 'ALL',
      search = '',
    } = req.query

    const searchValue = `%${search.trim()}%`

    const registrationRequests =
      type === 'ALL' || type === 'REGISTRATION'
        ? await query(
            `SELECT
               rr.id,
               'REGISTRATION' AS request_category,
               rr.type AS request_type,
               rr.status,
               rr.reason,
               rr.review_note,
               rr.submitted_at,
               rr.reviewed_at,
               st.id AS student_id,
               st.student_number,
               st.year_level,
               u.first_name,
               u.last_name,
               u.email,
               c.code AS course_code,
               c.name AS course_name,
               cs.section_code,
               cs.id AS section_id,
               NULL::varchar AS target_section_code,
               NULL::text AS target_section_id
             FROM registration_requests rr
             JOIN students st ON st.id = rr.student_id
             JOIN users u ON u.id = st.user_id
             JOIN course_sections cs ON cs.id = rr.section_id
             JOIN courses c ON c.id = cs.course_id
             WHERE st.department_id = $1
               AND ($2 = 'ALL' OR rr.status::text = $2)
               AND (
                 $3 = '%%'
                 OR st.student_number ILIKE $3
                 OR u.first_name ILIKE $3
                 OR u.last_name ILIKE $3
                 OR c.code ILIKE $3
                 OR c.name ILIKE $3
               )
             ORDER BY rr.submitted_at DESC`,
            [departmentId, status, searchValue]
          )
        : { rows: [] }

    const sectionChangeRequests =
      type === 'ALL' || type === 'SECTION_CHANGE'
        ? await query(
            `SELECT
               scr.id,
               'SECTION_CHANGE' AS request_category,
               'CHANGE_SECTION' AS request_type,
               scr.status,
               scr.reason,
               scr.review_note,
               scr.submitted_at,
               scr.reviewed_at,
               st.id AS student_id,
               st.student_number,
               st.year_level,
               u.first_name,
               u.last_name,
               u.email,
               c.code AS course_code,
               c.name AS course_name,
               old_cs.section_code,
               old_cs.id AS section_id,
               target_cs.section_code AS target_section_code,
               target_cs.id AS target_section_id
             FROM section_change_requests scr
             JOIN students st ON st.id = scr.student_id
             JOIN users u ON u.id = st.user_id
             JOIN enrollments e ON e.id = scr.enrollment_id
             JOIN course_sections old_cs ON old_cs.id = e.section_id
             JOIN courses c ON c.id = old_cs.course_id
             JOIN course_sections target_cs
               ON target_cs.id = scr.target_section_id
             WHERE st.department_id = $1
               AND ($2 = 'ALL' OR scr.status::text = $2)
               AND (
                 $3 = '%%'
                 OR st.student_number ILIKE $3
                 OR u.first_name ILIKE $3
                 OR u.last_name ILIKE $3
                 OR c.code ILIKE $3
                 OR c.name ILIKE $3
               )
             ORDER BY scr.submitted_at DESC`,
            [departmentId, status, searchValue]
          )
        : { rows: [] }

    const requests = [
      ...registrationRequests.rows,
      ...sectionChangeRequests.rows,
    ].sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() -
        new Date(a.submitted_at).getTime()
    )

    return res.json({
      departmentId,
      requests,
      stats: {
        total: requests.length,
        pending: requests.filter(
          (request) => request.status === 'PENDING'
        ).length,
        underReview: requests.filter(
          (request) => request.status === 'UNDER_REVIEW'
        ).length,
        approved: requests.filter(
          (request) => request.status === 'APPROVED'
        ).length,
        rejected: requests.filter(
          (request) => request.status === 'REJECTED'
        ).length,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Shared helper for registration ADD and DROP decisions
export async function reviewRegistrationRequest(req, res, next) {
  const client = await getClient()

  try {
    const departmentId = await getCoordinatorDepartment(req.user.id)

    if (!departmentId) {
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const { requestId } = req.params
    const { status, reviewNote = '' } = req.body

    if (!validateReview(status)) {
      return res.status(400).json({
        message: 'Status must be APPROVED or REJECTED.',
      })
    }

    await client.query('BEGIN')

    const requestResult = await client.query(
      `SELECT
         rr.*,
         st.department_id
       FROM registration_requests rr
       JOIN students st ON st.id = rr.student_id
       WHERE rr.id = $1
       FOR UPDATE OF rr`,
      [requestId]
    )

    const request = requestResult.rows[0]

    if (!request || request.department_id !== departmentId) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Request not found in your department.',
      })
    }

    if (!['PENDING', 'UNDER_REVIEW'].includes(request.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'This request has already been reviewed.',
      })
    }

    if (status === 'APPROVED') {
      if (request.type === 'ADD') {
        await checkSectionAvailability(
          client,
          request.section_id,
          departmentId
        )

        const existingResult = await client.query(
          `SELECT id, status
           FROM enrollments
           WHERE student_id = $1
             AND section_id = $2
           FOR UPDATE`,
          [request.student_id, request.section_id]
        )

        if (existingResult.rows[0]?.status === 'ENROLLED') {
          throw new Error('The student is already enrolled in this section.')
        }

        await client.query(
          `INSERT INTO enrollments (
             id,
             student_id,
             section_id,
             status,
             enrolled_at,
             dropped_at
           )
           VALUES ($1, $2, $3, 'ENROLLED', CURRENT_TIMESTAMP, NULL)
           ON CONFLICT (student_id, section_id)
           DO UPDATE SET
             status = 'ENROLLED',
             enrolled_at = CURRENT_TIMESTAMP,
             dropped_at = NULL,
             updated_at = CURRENT_TIMESTAMP`,
          [
            existingResult.rows[0]?.id ?? generateId(),
            request.student_id,
            request.section_id,
          ]
        )
      } else if (request.type === 'DROP') {
        const enrollmentResult = await client.query(
          `UPDATE enrollments
           SET
             status = 'DROPPED',
             dropped_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
             AND student_id = $2
             AND section_id = $3
             AND status = 'ENROLLED'
           RETURNING id`,
          [
            request.enrollment_id,
            request.student_id,
            request.section_id,
          ]
        )

        if (enrollmentResult.rowCount === 0) {
          throw new Error('The active enrollment for this drop request was not found.')
        }
      }
    }

    await client.query(
      `UPDATE registration_requests
       SET
         status = $1,
         reviewer_id = $2,
         review_note = $3,
         reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, req.user.id, reviewNote.trim() || null, requestId]
    )

    await client.query('COMMIT')

    return res.json({
      message: `Registration request ${status.toLowerCase()} successfully.`,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}

// PATCH /api/coordinator/requests/section-change/:requestId
export async function reviewSectionChangeRequest(req, res, next) {
  const client = await getClient()

  try {
    const departmentId = await getCoordinatorDepartment(req.user.id)

    if (!departmentId) {
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const { requestId } = req.params
    const { status, reviewNote = '' } = req.body

    if (!validateReview(status)) {
      return res.status(400).json({
        message: 'Status must be APPROVED or REJECTED.',
      })
    }

    await client.query('BEGIN')

    const requestResult = await client.query(
      `SELECT
         scr.*,
         st.department_id
       FROM section_change_requests scr
       JOIN students st ON st.id = scr.student_id
       WHERE scr.id = $1
       FOR UPDATE OF scr`,
      [requestId]
    )

    const request = requestResult.rows[0]

    if (!request || request.department_id !== departmentId) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Section-change request not found in your department.',
      })
    }

    if (!['PENDING', 'UNDER_REVIEW'].includes(request.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'This request has already been reviewed.',
      })
    }

    if (status === 'APPROVED') {
      const enrollmentResult = await client.query(
        `SELECT
           e.id,
           e.student_id,
           e.section_id,
           e.status,
           old_cs.course_id AS old_course_id,
           old_cs.term_id AS old_term_id
         FROM enrollments e
         JOIN course_sections old_cs ON old_cs.id = e.section_id
         WHERE e.id = $1
           AND e.student_id = $2
         FOR UPDATE OF e`,
        [request.enrollment_id, request.student_id]
      )

      const enrollment = enrollmentResult.rows[0]

      if (!enrollment || enrollment.status !== 'ENROLLED') {
        throw new Error('The student does not have an active enrollment to change.')
      }

      const targetResult = await client.query(
        `SELECT course_id, term_id
         FROM course_sections
         WHERE id = $1`,
        [request.target_section_id]
      )

      const target = targetResult.rows[0]

      if (!target) {
        throw new Error('The target section does not exist.')
      }

      if (
        target.course_id !== enrollment.old_course_id ||
        target.term_id !== enrollment.old_term_id
      ) {
        throw new Error('The target section must belong to the same course and academic term.')
      }

      const duplicateResult = await client.query(
        `SELECT id
         FROM enrollments
         WHERE student_id = $1
           AND section_id = $2
           AND status = 'ENROLLED'
           AND id <> $3`,
        [
          request.student_id,
          request.target_section_id,
          request.enrollment_id,
        ]
      )

      if (duplicateResult.rowCount > 0) {
        throw new Error('The student is already enrolled in the target section.')
      }

      await checkSectionAvailability(
        client,
        request.target_section_id,
        departmentId
      )

      await client.query(
        `UPDATE enrollments
         SET
           section_id = $1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [request.target_section_id, request.enrollment_id]
      )
    }

    await client.query(
      `UPDATE section_change_requests
       SET
         status = $1,
         reviewer_id = $2,
         review_note = $3,
         reviewed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, req.user.id, reviewNote.trim() || null, requestId]
    )

    await client.query('COMMIT')

    return res.json({
      message: `Section-change request ${status.toLowerCase()} successfully.`,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}
