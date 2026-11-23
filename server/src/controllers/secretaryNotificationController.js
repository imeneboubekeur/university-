
import { query } from '../config/database.js'

// GET /api/secretary/notifications
export async function getSecretaryNotifications(req, res, next) {
  try {
    const {
      status = 'ALL',
      type = 'ALL',
      search = '',
    } = req.query

    const allowedStatuses = [
      'ALL',
      'PENDING',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ]

    const allowedTypes = [
      'ALL',
      'REGISTRATION',
      'SECTION_CHANGE',
    ]

    const normalizedStatus = String(status).toUpperCase()
    const normalizedType = String(type).toUpperCase()
    const normalizedSearch = String(search).trim()

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid status filter.' })
    }

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({ message: 'Invalid notification type.' })
    }

    const result = await query(
      `
      WITH notifications AS (
        SELECT
          rr.id,
          'REGISTRATION'::TEXT AS notification_type,
          rr.type::TEXT AS action,
          rr.status::TEXT AS status,
          rr.reason,
          rr.submitted_at,
          s.student_number,
          u.first_name,
          u.last_name,
          c.code AS course_code,
          c.name AS course_name,
          cs.section_code
        FROM registration_requests rr
        JOIN students s ON s.id = rr.student_id
        JOIN users u ON u.id = s.user_id
        JOIN course_sections cs ON cs.id = rr.section_id
        JOIN courses c ON c.id = cs.course_id

        UNION ALL

        SELECT
          scr.id,
          'SECTION_CHANGE'::TEXT AS notification_type,
          'SECTION_CHANGE'::TEXT AS action,
          scr.status::TEXT AS status,
          scr.reason,
          scr.submitted_at,
          s.student_number,
          u.first_name,
          u.last_name,
          c.code AS course_code,
          c.name AS course_name,
          target.section_code
        FROM section_change_requests scr
        JOIN students s ON s.id = scr.student_id
        JOIN users u ON u.id = s.user_id
        JOIN course_sections target
          ON target.id = scr.target_section_id
        JOIN courses c ON c.id = target.course_id
      )
      SELECT *
      FROM notifications
      WHERE
        ($1 = 'ALL' OR status = $1)
        AND ($2 = 'ALL' OR notification_type = $2)
        AND (
          $3 = ''
          OR student_number ILIKE '%' || $3 || '%'
          OR first_name ILIKE '%' || $3 || '%'
          OR last_name ILIKE '%' || $3 || '%'
          OR course_code ILIKE '%' || $3 || '%'
          OR course_name ILIKE '%' || $3 || '%'
        )
      ORDER BY submitted_at DESC
      LIMIT 100
      `,
      [normalizedStatus, normalizedType, normalizedSearch]
    )

    const notifications = result.rows

    res.json({
      notifications,
      summary: {
        total: notifications.length,
        pending: notifications.filter(
          (item) => item.status === 'PENDING'
        ).length,
        underReview: notifications.filter(
          (item) => item.status === 'UNDER_REVIEW'
        ).length,
        approved: notifications.filter(
          (item) => item.status === 'APPROVED'
        ).length,
        rejected: notifications.filter(
          (item) => item.status === 'REJECTED'
        ).length,
      },
    })
  } catch (error) {
    next(error)
  }
}
