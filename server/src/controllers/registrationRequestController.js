
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// GET /api/student/registration-requests
export async function getMyRegistrationRequests(req, res, next) {
  try {
    const result = await query(
      `SELECT
          rr.id,
          rr.type,
          rr.status,
          rr.reason,
          rr.review_note,
          rr.submitted_at,
          rr.reviewed_at,
          rr.enrollment_id,
          rr.section_id,
          c.code AS course_code,
          c.name AS course_name,
          c.credits,
          c.ects,
          cs.section_code,
          cs.room,
          t.name AS term_name,
          t.academic_year
       FROM registration_requests rr
       JOIN students s ON s.id = rr.student_id
       JOIN course_sections cs ON cs.id = rr.section_id
       JOIN courses c ON c.id = cs.course_id
       JOIN academic_terms t ON t.id = cs.term_id
       WHERE s.user_id = $1
       ORDER BY rr.submitted_at DESC`,
      [req.user.id]
    )

    res.status(200).json({ requests: result.rows })
  } catch (error) {
    next(error)
  }
}

// POST /api/student/registration-requests/drop
export async function createDropRequest(req, res, next) {
  const client = await getClient()

  try {
    const { enrollmentId, reason } = req.body

    if (!enrollmentId) {
      throw createError('Please select an enrolled course.')
    }

    await client.query('BEGIN')

    // Lock the student's active enrollment.
    const enrollmentResult = await client.query(
      `SELECT
          e.id AS enrollment_id,
          e.student_id,
          e.section_id,
          e.status AS enrollment_status,
          cs.term_id,
          c.name AS course_name
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN course_sections cs ON cs.id = e.section_id
       JOIN courses c ON c.id = cs.course_id
       WHERE e.id = $1
         AND s.user_id = $2
         AND e.status = 'ENROLLED'
       FOR UPDATE OF e`,
      [enrollmentId, req.user.id]
    )

    if (enrollmentResult.rows.length === 0) {
      throw createError(
        'This course is not currently enrolled or does not belong to your account.',
        404
      )
    }

    const enrollment = enrollmentResult.rows[0]

    // Ensure the add/drop period is open for this enrollment's term.
    const windowResult = await client.query(
      `SELECT id
       FROM registration_windows
       WHERE term_id = $1
         AND is_active = TRUE
         AND CURRENT_TIMESTAMP BETWEEN add_drop_opens_at AND add_drop_closes_at
       LIMIT 1
       FOR UPDATE`,
      [enrollment.term_id]
    )

    if (windowResult.rows.length === 0) {
      throw createError('The add/drop period is currently closed.')
    }

    // Prevent multiple pending DROP requests for the same enrollment.
    const duplicateResult = await client.query(
      `SELECT id
       FROM registration_requests
       WHERE enrollment_id = $1
         AND type = 'DROP'
         AND status IN ('PENDING', 'UNDER_REVIEW')
       LIMIT 1`,
      [enrollmentId]
    )

    if (duplicateResult.rows.length > 0) {
      throw createError(
        'You already have an active drop request for this course.',
        409
      )
    }

    const requestId = generateId()

    const result = await client.query(
      `INSERT INTO registration_requests (
          id,
          student_id,
          section_id,
          enrollment_id,
          type,
          status,
          reason
       )
       VALUES ($1, $2, $3, $4, 'DROP', 'PENDING', $5)
       RETURNING *`,
      [
        requestId,
        enrollment.student_id,
        enrollment.section_id,
        enrollment.enrollment_id,
        reason?.trim() || null,
      ]
    )

    await client.query('COMMIT')

    res.status(201).json({
      message: 'Your drop request has been submitted.',
      request: result.rows[0],
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}

// PATCH /api/student/registration-requests/:requestId/cancel
export async function cancelRegistrationRequest(req, res, next) {
  try {
    const { requestId } = req.params

    const result = await query(
      `UPDATE registration_requests rr
       SET status = 'CANCELLED',
           updated_at = CURRENT_TIMESTAMP
       FROM students s
       WHERE rr.id = $1
         AND rr.student_id = s.id
         AND s.user_id = $2
         AND rr.status = 'PENDING'
       RETURNING rr.id, rr.status, rr.updated_at`,
      [requestId, req.user.id]
    )

    if (result.rows.length === 0) {
      throw createError(
        'Request not found or it can no longer be cancelled.',
        404
      )
    }

    res.status(200).json({
      message: 'Your request has been cancelled.',
      request: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}
