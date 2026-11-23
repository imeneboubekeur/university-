
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

const MEETING_FIELDS = `
  sm.id,
  sm.section_id,
  sm.day_of_week,
  TO_CHAR(sm.start_time, 'HH24:MI') AS start_time,
  TO_CHAR(sm.end_time, 'HH24:MI') AS end_time,
  sm.room,
  cs.room AS section_room,
  c.code AS course_code,
  c.name AS course_name,
  cs.section_code,
  cs.instructor_id,
  u.first_name AS professor_first_name,
  u.last_name AS professor_last_name,
  at.name AS academic_term
`

async function getCoordinatorDepartmentId(userId, db = { query }) {
  const result = await db.query(
    `SELECT department_id
     FROM department_coordinators
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )

  return result.rows[0]?.department_id || null
}

/*
 * A coordinator can access a section when:
 * 1. Its course is associated with the coordinator's department.
 * 2. The association is available.
 * 3. If section-level quota allocations exist, the coordinator's
 *    department must have one of those allocations.
 *
 * If no section-level allocations exist, course_departments is used
 * as the fallback.
 */
async function getAccessibleSection(db, departmentId, sectionId) {
  const result = await db.query(
    `SELECT
       cs.id,
       cs.course_id,
       cs.term_id,
       cs.instructor_id,
       cs.room,
       cs.capacity,
       c.code AS course_code,
       c.name AS course_name,
       cs.section_code
     FROM course_sections cs
     JOIN courses c ON c.id = cs.course_id
     WHERE cs.id = $1
       AND EXISTS (
         SELECT 1
         FROM course_departments cd
         WHERE cd.course_id = cs.course_id
           AND cd.department_id = $2
           AND cd.is_available = TRUE
           AND (
             NOT EXISTS (
               SELECT 1
               FROM section_department_quotas sdq
               WHERE sdq.section_id = cs.id
             )
             OR EXISTS (
               SELECT 1
               FROM section_department_quotas sdq
               JOIN course_departments allocated_cd
                 ON allocated_cd.id = sdq.course_department_id
               WHERE sdq.section_id = cs.id
                 AND allocated_cd.department_id = $2
             )
           )
       )
     LIMIT 1`,
    [sectionId, departmentId]
  )

  return result.rows[0] || null
}

function validateMeetingInput({
  day_of_week,
  start_time,
  end_time,
}) {
  if (!DAYS_OF_WEEK.includes(day_of_week)) {
    return 'Please select a valid day of the week.'
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

  if (!timePattern.test(start_time) || !timePattern.test(end_time)) {
    return 'Start time and end time must use HH:MM format.'
  }

  if (start_time >= end_time) {
    return 'End time must be later than start time.'
  }

  return null
}

/*
 * Checks conflicts in the same academic term:
 * - Same room
 * - Same professor
 * - Students enrolled in both sections
 *
 * Overlap condition:
 * existing.start_time < requested.end_time
 * AND existing.end_time > requested.start_time
 */
async function findMeetingConflicts(
  db,
  section,
  meeting,
  excludedMeetingId = null
) {
  const result = await db.query(
    `SELECT conflict_type
     FROM (
       -- Room conflict
       SELECT 'ROOM' AS conflict_type
       FROM section_meetings sm
       JOIN course_sections other_cs
         ON other_cs.id = sm.section_id
       WHERE other_cs.term_id = $1
         AND sm.day_of_week = $2
         AND sm.start_time < $4::time
         AND sm.end_time > $3::time
         AND ($6::text IS NULL OR sm.id <> $6)
         AND NULLIF(BTRIM(COALESCE($5, $7)), '') IS NOT NULL
         AND LOWER(BTRIM(COALESCE(sm.room, other_cs.room, '')))
             = LOWER(BTRIM(COALESCE($5, $7)))

       UNION ALL

       -- Professor conflict
       SELECT 'PROFESSOR' AS conflict_type
       FROM section_meetings sm
       JOIN course_sections other_cs
         ON other_cs.id = sm.section_id
       WHERE other_cs.term_id = $1
         AND other_cs.instructor_id IS NOT NULL
         AND other_cs.instructor_id = $8
         AND sm.day_of_week = $2
         AND sm.start_time < $4::time
         AND sm.end_time > $3::time
         AND ($6::text IS NULL OR sm.id <> $6)

       UNION ALL

       -- Student conflict
       SELECT 'STUDENT' AS conflict_type
       FROM section_meetings sm
       JOIN course_sections other_cs
         ON other_cs.id = sm.section_id
       WHERE other_cs.term_id = $1
         AND sm.day_of_week = $2
         AND sm.start_time < $4::time
         AND sm.end_time > $3::time
         AND ($6::text IS NULL OR sm.id <> $6)
         AND EXISTS (
           SELECT 1
           FROM enrollments target_enrollment
           JOIN enrollments other_enrollment
             ON other_enrollment.student_id =
                target_enrollment.student_id
           WHERE target_enrollment.section_id = $9
             AND other_enrollment.section_id = other_cs.id
             AND target_enrollment.status = 'ENROLLED'
             AND other_enrollment.status = 'ENROLLED'
         )
     ) conflicts`,
    [
      section.term_id,
      meeting.day_of_week,
      meeting.start_time,
      meeting.end_time,
      meeting.room,
      excludedMeetingId,
      section.room,
      section.instructor_id,
      section.id,
    ]
  )

  return [...new Set(result.rows.map((row) => row.conflict_type))]
}

function getConflictMessage(conflicts) {
  const messages = {
    ROOM: 'The selected classroom is already occupied during this time.',
    PROFESSOR: 'The professor already has another class during this time.',
    STUDENT: 'Some students are already enrolled in another class during this time.',
  }

  return conflicts.map((conflict) => messages[conflict])
}

function sendDatabaseError(res, error) {
  console.error('Coordinator schedule error:', error)

  if (error.code === '23505') {
    return res.status(409).json({
      message: 'This schedule entry already exists.',
    })
  }

  if (error.code === '23503') {
    return res.status(400).json({
      message: 'The selected section or related record does not exist.',
    })
  }

  return res.status(500).json({
    message: 'An unexpected server error occurred.',
  })
}

// GET /api/department-coordinator/schedule/options
export async function getCoordinatorScheduleOptions(req, res) {
  try {
    const departmentId = await getCoordinatorDepartmentId(req.user.id)

    if (!departmentId) {
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const [termsResult, sectionsResult] = await Promise.all([
      query(
        `SELECT id, name, academic_year, semester, is_active
         FROM academic_terms
         ORDER BY start_date DESC`
      ),

      query(
        `SELECT
           cs.id AS section_id,
           cs.course_id,
           cs.term_id,
           cs.section_code,
           cs.room,
           cs.capacity,
           cs.status,
           c.code AS course_code,
           c.name AS course_name,
           cs.instructor_id,
           u.first_name AS professor_first_name,
           u.last_name AS professor_last_name,
           at.name AS academic_term
         FROM course_sections cs
         JOIN courses c ON c.id = cs.course_id
         JOIN academic_terms at ON at.id = cs.term_id
         LEFT JOIN professors p ON p.id = cs.instructor_id
         LEFT JOIN users u ON u.id = p.user_id
         WHERE EXISTS (
           SELECT 1
           FROM course_departments cd
           WHERE cd.course_id = cs.course_id
             AND cd.department_id = $1
             AND cd.is_available = TRUE
             AND (
               NOT EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 WHERE sdq.section_id = cs.id
               )
               OR EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 JOIN course_departments allocated_cd
                   ON allocated_cd.id = sdq.course_department_id
                 WHERE sdq.section_id = cs.id
                   AND allocated_cd.department_id = $1
               )
             )
         )
         ORDER BY at.start_date DESC, c.code, cs.section_code`,
        [departmentId]
      ),
    ])

    return res.json({
      terms: termsResult.rows,
      sections: sectionsResult.rows,
    })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

// GET /api/department-coordinator/schedule
export async function getCoordinatorSchedule(req, res) {
  try {
    const departmentId = await getCoordinatorDepartmentId(req.user.id)

    if (!departmentId) {
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const { termId, sectionId } = req.query

    const result = await query(
      `SELECT ${MEETING_FIELDS}
       FROM section_meetings sm
       JOIN course_sections cs ON cs.id = sm.section_id
       JOIN courses c ON c.id = cs.course_id
       JOIN academic_terms at ON at.id = cs.term_id
       LEFT JOIN professors p ON p.id = cs.instructor_id
       LEFT JOIN users u ON u.id = p.user_id
       WHERE ($1::text IS NULL OR cs.term_id = $1)
         AND ($2::text IS NULL OR cs.id = $2)
         AND EXISTS (
           SELECT 1
           FROM course_departments cd
           WHERE cd.course_id = cs.course_id
             AND cd.department_id = $3
             AND cd.is_available = TRUE
             AND (
               NOT EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 WHERE sdq.section_id = cs.id
               )
               OR EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 JOIN course_departments allocated_cd
                   ON allocated_cd.id = sdq.course_department_id
                 WHERE sdq.section_id = cs.id
                   AND allocated_cd.department_id = $3
               )
             )
         )
       ORDER BY
         CASE sm.day_of_week
           WHEN 'MONDAY' THEN 1
           WHEN 'TUESDAY' THEN 2
           WHEN 'WEDNESDAY' THEN 3
           WHEN 'THURSDAY' THEN 4
           WHEN 'FRIDAY' THEN 5
           WHEN 'SATURDAY' THEN 6
           WHEN 'SUNDAY' THEN 7
         END,
         sm.start_time`,
      [termId || null, sectionId || null, departmentId]
    )

    return res.json({
      meetings: result.rows,
    })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

// POST /api/department-coordinator/schedule
export async function createCoordinatorMeeting(req, res) {
  const {
    section_id,
    day_of_week,
    start_time,
    end_time,
    room,
  } = req.body

  const validationError = validateMeetingInput({
    day_of_week,
    start_time,
    end_time,
  })

  if (!section_id || validationError) {
    return res.status(400).json({
      message: validationError || 'A section must be selected.',
    })
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const departmentId = await getCoordinatorDepartmentId(
      req.user.id,
      client
    )

    if (!departmentId) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const section = await getAccessibleSection(
      client,
      departmentId,
      section_id
    )

    if (!section) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Section not found or you do not have access to it.',
      })
    }

    const meeting = {
      day_of_week,
      start_time,
      end_time,
      room: room?.trim() || null,
    }

    const conflicts = await findMeetingConflicts(
      client,
      section,
      meeting
    )

    if (conflicts.length) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'Schedule conflicts were detected.',
        conflicts,
        details: getConflictMessage(conflicts),
      })
    }

    const id = generateId()

    const result = await client.query(
      `INSERT INTO section_meetings (
         id,
         section_id,
         day_of_week,
         start_time,
         end_time,
         room
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         section_id,
         day_of_week,
         TO_CHAR(start_time, 'HH24:MI') AS start_time,
         TO_CHAR(end_time, 'HH24:MI') AS end_time,
         room`,
      [
        id,
        section_id,
        day_of_week,
        start_time,
        end_time,
        meeting.room,
      ]
    )

    await client.query('COMMIT')

    return res.status(201).json({
      message: 'Schedule meeting created successfully.',
      meeting: result.rows[0],
    })
  } catch (error) {
    await client.query('ROLLBACK')
    return sendDatabaseError(res, error)
  } finally {
    client.release()
  }
}

// PATCH /api/department-coordinator/schedule/:meetingId
export async function updateCoordinatorMeeting(req, res) {
  const { meetingId } = req.params
  const {
    section_id,
    day_of_week,
    start_time,
    end_time,
    room,
  } = req.body

  const validationError = validateMeetingInput({
    day_of_week,
    start_time,
    end_time,
  })

  if (!section_id || validationError) {
    return res.status(400).json({
      message: validationError || 'A section must be selected.',
    })
  }

  const client = await getClient()

  try {
    await client.query('BEGIN')

    const departmentId = await getCoordinatorDepartmentId(
      req.user.id,
      client
    )

    if (!departmentId) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const existingResult = await client.query(
      `SELECT sm.id
       FROM section_meetings sm
       JOIN course_sections cs ON cs.id = sm.section_id
       WHERE sm.id = $1
         AND EXISTS (
           SELECT 1
           FROM course_departments cd
           WHERE cd.course_id = cs.course_id
             AND cd.department_id = $2
             AND cd.is_available = TRUE
             AND (
               NOT EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 WHERE sdq.section_id = cs.id
               )
               OR EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 JOIN course_departments allocated_cd
                   ON allocated_cd.id = sdq.course_department_id
                 WHERE sdq.section_id = cs.id
                   AND allocated_cd.department_id = $2
               )
             )
         )
       LIMIT 1`,
      [meetingId, departmentId]
    )

    if (!existingResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Schedule meeting not found.',
      })
    }

    const section = await getAccessibleSection(
      client,
      departmentId,
      section_id
    )

    if (!section) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Section not found or you do not have access to it.',
      })
    }

    const meeting = {
      day_of_week,
      start_time,
      end_time,
      room: room?.trim() || null,
    }

    const conflicts = await findMeetingConflicts(
      client,
      section,
      meeting,
      meetingId
    )

    if (conflicts.length) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'Schedule conflicts were detected.',
        conflicts,
        details: getConflictMessage(conflicts),
      })
    }

    const result = await client.query(
      `UPDATE section_meetings
       SET section_id = $1,
           day_of_week = $2,
           start_time = $3,
           end_time = $4,
           room = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING
         id,
         section_id,
         day_of_week,
         TO_CHAR(start_time, 'HH24:MI') AS start_time,
         TO_CHAR(end_time, 'HH24:MI') AS end_time,
         room`,
      [
        section_id,
        day_of_week,
        start_time,
        end_time,
        meeting.room,
        meetingId,
      ]
    )

    await client.query('COMMIT')

    return res.json({
      message: 'Schedule meeting updated successfully.',
      meeting: result.rows[0],
    })
  } catch (error) {
    await client.query('ROLLBACK')
    return sendDatabaseError(res, error)
  } finally {
    client.release()
  }
}

// DELETE /api/department-coordinator/schedule/:meetingId
export async function deleteCoordinatorMeeting(req, res) {
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const departmentId = await getCoordinatorDepartmentId(
      req.user.id,
      client
    )

    if (!departmentId) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        message: 'No department is assigned to this coordinator.',
      })
    }

    const result = await client.query(
      `DELETE FROM section_meetings sm
       USING course_sections cs
       WHERE sm.id = $1
         AND cs.id = sm.section_id
         AND EXISTS (
           SELECT 1
           FROM course_departments cd
           WHERE cd.course_id = cs.course_id
             AND cd.department_id = $2
             AND cd.is_available = TRUE
             AND (
               NOT EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 WHERE sdq.section_id = cs.id
               )
               OR EXISTS (
                 SELECT 1
                 FROM section_department_quotas sdq
                 JOIN course_departments allocated_cd
                   ON allocated_cd.id = sdq.course_department_id
                 WHERE sdq.section_id = cs.id
                   AND allocated_cd.department_id = $2
               )
             )
         )
       RETURNING sm.id`,
      [req.params.meetingId, departmentId]
    )

    if (!result.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Schedule meeting not found.',
      })
    }

    await client.query('COMMIT')

    return res.json({
      message: 'Schedule meeting deleted successfully.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    return sendDatabaseError(res, error)
  } finally {
    client.release()
  }
}
