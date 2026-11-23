
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'
export async function getSecretaryRequests(req, res, next) {
  try {
    const { status = 'PENDING', type = 'ALL' } = req.query

    const allowedStatuses = [
      'ALL',
      'PENDING',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ]

    const allowedTypes = ['ALL', 'REGISTRATION', 'SECTION_CHANGE']

    if (!allowedStatuses.includes(status) || !allowedTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid filter.' })
    }

    const params = []
    const conditions = []

    if (status !== 'ALL') {
      params.push(status)
      conditions.push(`request_status = $${params.length}`)
    }

    if (type !== 'ALL') {
      params.push(type)
      conditions.push(`request_type = $${params.length}`)
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    const result = await query(
      `
      SELECT *
      FROM (
        SELECT
          rr.id,
          'REGISTRATION'::TEXT AS request_type,
          rr.type::TEXT AS action_type,
          rr.status::TEXT AS request_status,
          rr.reason,
          rr.review_note,
          rr.submitted_at,
          rr.reviewed_at,
          s.id AS student_id,
          s.student_number,
          u.first_name,
          u.last_name,
          u.email,
          c.code AS course_code,
          c.name AS course_name,
          cs.section_code,
          cs.id AS section_id,
          NULL::TEXT AS target_section_code,
          NULL::TEXT AS target_section_id
        FROM registration_requests rr
        JOIN students s ON s.id = rr.student_id
        JOIN users u ON u.id = s.user_id
        JOIN course_sections cs ON cs.id = rr.section_id
        JOIN courses c ON c.id = cs.course_id

        UNION ALL

        SELECT
          scr.id,
          'SECTION_CHANGE'::TEXT AS request_type,
          'CHANGE_SECTION'::TEXT AS action_type,
          scr.status::TEXT AS request_status,
          scr.reason,
          scr.review_note,
          scr.submitted_at,
          scr.reviewed_at,
          s.id AS student_id,
          s.student_number,
          u.first_name,
          u.last_name,
          u.email,
          c.code AS course_code,
          c.name AS course_name,
          current_section.section_code,
          current_section.id AS section_id,
          target_section.section_code AS target_section_code,
          target_section.id AS target_section_id
        FROM section_change_requests scr
        JOIN students s ON s.id = scr.student_id
        JOIN users u ON u.id = s.user_id
        JOIN enrollments e ON e.id = scr.enrollment_id
        JOIN course_sections current_section ON current_section.id = e.section_id
        JOIN course_sections target_section ON target_section.id = scr.target_section_id
        JOIN courses c ON c.id = current_section.course_id
      ) AS requests
      ${whereClause}
      ORDER BY submitted_at DESC
      `,
      params
    )

    res.json({ requests: result.rows })
  } catch (error) {
    next(error)
  }
}

export async function reviewSecretaryRequest(req, res, next) {
  const client = await getClient()

  try {
    const { requestId, requestType } = req.params
    const { decision, reviewNote = '' } = req.body

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        message: 'Decision must be APPROVED or REJECTED.',
      })
    }

    if (!['REGISTRATION', 'SECTION_CHANGE'].includes(requestType)) {
      return res.status(400).json({ message: 'Invalid request type.' })
    }

    await client.query('BEGIN')

    const table =
      requestType === 'REGISTRATION'
        ? 'registration_requests'
        : 'section_change_requests'

    const requestResult = await client.query(
      `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`,
      [requestId]
    )

    if (!requestResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Request not found.' })
    }

    const request = requestResult.rows[0]

    if (!['PENDING', 'UNDER_REVIEW'].includes(request.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'This request has already been processed.',
      })
    }

    if (decision === 'APPROVED') {
      if (requestType === 'REGISTRATION') {
        if (request.type === 'ADD') {
          const sectionResult = await client.query(
            `SELECT id, capacity, status
             FROM course_sections
             WHERE id = $1
             FOR UPDATE`,
            [request.section_id]
          )

          const section = sectionResult.rows[0]

          if (!section || section.status !== 'OPEN') {
            throw new Error('The requested section is not open.')
          }

          const existingEnrollment = await client.query(
            `SELECT id FROM enrollments
             WHERE student_id = $1
               AND section_id = $2
               AND status = 'ENROLLED'`,
            [request.student_id, request.section_id]
          )

          if (existingEnrollment.rows.length) {
            throw new Error('The student is already enrolled in this section.')
          }

          const countResult = await client.query(
            `SELECT COUNT(*)::INTEGER AS enrolled_count
             FROM enrollments
             WHERE section_id = $1 AND status = 'ENROLLED'`,
            [request.section_id]
          )

          if (countResult.rows[0].enrolled_count >= section.capacity) {
            throw new Error('This section has reached its capacity.')
          }

          if (request.enrollment_id) {
            await client.query(
              `UPDATE enrollments
               SET status = 'ENROLLED',
                   section_id = $1,
                   dropped_at = NULL,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [request.section_id, request.enrollment_id]
            )
          } else {
            await client.query(
              `INSERT INTO enrollments
                (id, student_id, section_id, status)
               VALUES ($1, $2, $3, 'ENROLLED')`,
              [
                generateId(),
                request.student_id,
                request.section_id,
              ]
            )
          }
        } else if (request.type === 'DROP') {
          if (!request.enrollment_id) {
            throw new Error('The enrollment linked to this request was not found.')
          }

          await client.query(
            `UPDATE enrollments
             SET status = 'DROPPED',
                 dropped_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND student_id = $2`,
            [request.enrollment_id, request.student_id]
          )
        }
      } else {
        const enrollmentResult = await client.query(
          `SELECT id, section_id
           FROM enrollments
           WHERE id = $1 AND student_id = $2
             AND status = 'ENROLLED'
           FOR UPDATE`,
          [request.enrollment_id, request.student_id]
        )

        if (!enrollmentResult.rows.length) {
          throw new Error('The active enrollment was not found.')
        }

        const targetResult = await client.query(
          `SELECT id, capacity, status
           FROM course_sections
           WHERE id = $1
           FOR UPDATE`,
          [request.target_section_id]
        )

        const targetSection = targetResult.rows[0]

        if (!targetSection || targetSection.status !== 'OPEN') {
          throw new Error('The target section is not open.')
        }

        const countResult = await client.query(
          `SELECT COUNT(*)::INTEGER AS enrolled_count
           FROM enrollments
           WHERE section_id = $1 AND status = 'ENROLLED'`,
          [request.target_section_id]
        )

        if (countResult.rows[0].enrolled_count >= targetSection.capacity) {
          throw new Error('The target section has reached its capacity.')
        }

        await client.query(
          `UPDATE enrollments
           SET section_id = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [request.target_section_id, request.enrollment_id]
        )
      }
    }

    await client.query(
      `UPDATE ${table}
       SET status = $1,
           reviewer_id = $2,
           review_note = $3,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [decision, req.user.id, reviewNote, requestId]
    )

    await client.query('COMMIT')

    res.json({
      message: `Request ${decision.toLowerCase()} successfully.`,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}
