import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const VALID_STATUSES = new Set([
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
])

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

async function getProfessorId(userId) {
  const result = await query(
    `SELECT id
     FROM professors
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )

  return result.rows[0]?.id || null
}

async function getOwnedSection(client, sectionId, professorId) {
  const result = await client.query(
    `SELECT
       cs.id,
       cs.section_code,
       cs.room,
       cs.schedule,
       c.id AS course_id,
       c.code AS course_code,
       c.name AS course_name,
       c.credits,
       at.id AS term_id,
       at.name AS term_name,
       at.academic_year,
       at.semester
     FROM course_sections cs
     JOIN courses c ON c.id = cs.course_id
     JOIN academic_terms at ON at.id = cs.term_id
     WHERE cs.id = $1
       AND cs.instructor_id = $2
     LIMIT 1`,
    [sectionId, professorId]
  )

  if (!result.rows.length) {
    throw createError(
      'Section not found or you are not assigned to teach it.',
      404
    )
  }

  return result.rows[0]
}

// ============================================
// GET PROFESSOR'S SECTIONS
// GET /api/professor/attendance/sections
// ============================================

export async function getProfessorAttendanceSections(req, res, next) {
  try {
    const professorId = await getProfessorId(req.user?.id)

    if (!professorId) {
      throw createError('Professor profile not found.', 404)
    }

    const result = await query(
      `SELECT
         cs.id AS section_id,
         cs.section_code,
         cs.room,
         c.id AS course_id,
         c.code AS course_code,
         c.name AS course_name,
         c.credits,
         at.id AS term_id,
         at.name AS term_name,
         at.academic_year,
         at.semester,
         COUNT(DISTINCT e.id) FILTER (
           WHERE e.status = 'ENROLLED'
         )::INTEGER AS enrolled_students,
         COUNT(DISTINCT ass.id)::INTEGER AS attendance_sessions
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
       JOIN academic_terms at ON at.id = cs.term_id
       LEFT JOIN enrollments e ON e.section_id = cs.id
       LEFT JOIN attendance_sessions ass ON ass.section_id = cs.id
       WHERE cs.instructor_id = $1
       GROUP BY
         cs.id,
         cs.section_code,
         cs.room,
         c.id,
         c.code,
         c.name,
         c.credits,
         at.id,
         at.name,
         at.academic_year,
         at.semester
       ORDER BY at.start_date DESC, c.code, cs.section_code`,
      [professorId]
    )

    res.status(200).json({
      sections: result.rows,
    })
  } catch (error) {
    next(error)
  }
}

// ============================================
// GET STUDENTS FOR A SECTION AND CLASS DATE
// GET /api/professor/attendance/sections/:sectionId/students
// ============================================

export async function getAttendanceStudents(req, res, next) {
  try {
    const professorId = await getProfessorId(req.user?.id)

    if (!professorId) {
      throw createError('Professor profile not found.', 404)
    }

    const { sectionId } = req.params
    const { date, meetingId } = req.query

    if (!isValidDate(date)) {
      throw createError('A valid attendance date is required.')
    }

    const section = await getOwnedSection(
      { query },
      sectionId,
      professorId
    )

    if (meetingId) {
      const meetingResult = await query(
        `SELECT id
         FROM section_meetings
         WHERE id = $1 AND section_id = $2
         LIMIT 1`,
        [meetingId, sectionId]
      )

      if (!meetingResult.rows.length) {
        throw createError(
          'The selected class meeting does not belong to this section.'
        )
      }
    }

    const result = await query(
      `SELECT
         s.id AS student_id,
         s.student_number,
         u.first_name,
         u.last_name,
         u.email,
         ar.status AS attendance_status,
         ar.remarks
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN attendance_sessions ass
         ON ass.section_id = e.section_id
        AND ass.attendance_date = $2::date
        AND ass.meeting_id IS NOT DISTINCT FROM $3::text
       LEFT JOIN attendance_records ar
         ON ar.session_id = ass.id
        AND ar.student_id = s.id
       WHERE e.section_id = $1
         AND e.status = 'ENROLLED'
       ORDER BY u.last_name, u.first_name`,
      [sectionId, date, meetingId || null]
    )

    res.status(200).json({
      section,
      date,
      meetingId: meetingId || null,
      students: result.rows,
    })
  } catch (error) {
    next(error)
  }
}

// ============================================
// GET ATTENDANCE HISTORY FOR A SECTION
// GET /api/professor/attendance/sections/:sectionId
// ============================================

export async function getSectionAttendanceHistory(req, res, next) {
  try {
    const professorId = await getProfessorId(req.user?.id)

    if (!professorId) {
      throw createError('Professor profile not found.', 404)
    }

    const { sectionId } = req.params

    const section = await getOwnedSection(
      { query },
      sectionId,
      professorId
    )

    const result = await query(
      `SELECT
         ass.id,
         ass.attendance_date,
         ass.meeting_id,
         ass.notes,
         ass.created_at,
         COUNT(ar.id)::INTEGER AS total_records,
         COUNT(ar.id) FILTER (
           WHERE ar.status = 'PRESENT'
         )::INTEGER AS present_count,
         COUNT(ar.id) FILTER (
           WHERE ar.status = 'ABSENT'
         )::INTEGER AS absent_count,
         COUNT(ar.id) FILTER (
           WHERE ar.status = 'LATE'
         )::INTEGER AS late_count,
         COUNT(ar.id) FILTER (
           WHERE ar.status = 'EXCUSED'
         )::INTEGER AS excused_count
       FROM attendance_sessions ass
       LEFT JOIN attendance_records ar
         ON ar.session_id = ass.id
       WHERE ass.section_id = $1
       GROUP BY ass.id
       ORDER BY ass.attendance_date DESC, ass.created_at DESC`,
      [sectionId]
    )

    res.status(200).json({
      section,
      sessions: result.rows,
    })
  } catch (error) {
    next(error)
  }
}

// ============================================
// SAVE OR UPDATE ATTENDANCE
// POST /api/professor/attendance
// ============================================

export async function saveAttendance(req, res, next) {
  const client = await getClient()

  try {
    const professorId = await getProfessorId(req.user?.id)

    if (!professorId) {
      throw createError('Professor profile not found.', 404)
    }

    const {
      sectionId,
      attendanceDate,
      meetingId = null,
      notes = null,
      records,
    } = req.body

    if (!sectionId) {
      throw createError('Section is required.')
    }

    if (!isValidDate(attendanceDate)) {
      throw createError('A valid attendance date is required.')
    }

    if (!Array.isArray(records) || records.length === 0) {
      throw createError('Attendance records are required.')
    }

    const seenStudents = new Set()

    for (const record of records) {
      if (
        !record.studentId ||
        !VALID_STATUSES.has(record.status) ||
        seenStudents.has(record.studentId)
      ) {
        throw createError('Invalid or duplicate attendance records.')
      }

      seenStudents.add(record.studentId)
    }

    await client.query('BEGIN')

    await getOwnedSection(client, sectionId, professorId)

    if (meetingId) {
      const meetingResult = await client.query(
        `SELECT id
         FROM section_meetings
         WHERE id = $1 AND section_id = $2
         LIMIT 1`,
        [meetingId, sectionId]
      )

      if (!meetingResult.rows.length) {
        throw createError(
          'The selected class meeting does not belong to this section.'
        )
      }
    }

    const enrolledResult = await client.query(
      `SELECT student_id
       FROM enrollments
       WHERE section_id = $1
         AND status = 'ENROLLED'`,
      [sectionId]
    )

    const enrolledStudentIds = new Set(
      enrolledResult.rows.map((row) => row.student_id)
    )

    if (records.length !== enrolledStudentIds.size) {
      throw createError(
        'Attendance must be submitted for every currently enrolled student.'
      )
    }

    for (const record of records) {
      if (!enrolledStudentIds.has(record.studentId)) {
        throw createError(
          'One or more selected students are not enrolled in this section.'
        )
      }
    }

    const sessionResult = await client.query(
      `INSERT INTO attendance_sessions (
         id,
         section_id,
         meeting_id,
         attendance_date,
         recorded_by,
         notes
       )
       VALUES ($1, $2, $3, $4::date, $5, $6)
       ON CONFLICT (
         section_id,
         attendance_date,
         (COALESCE(meeting_id, ''::text))
       )
       DO UPDATE SET
         recorded_by = EXCLUDED.recorded_by,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING id, attendance_date, meeting_id, notes`,
      [
        generateId(),
        sectionId,
        meetingId,
        attendanceDate,
        professorId,
        notes,
      ]
    )

    const session = sessionResult.rows[0]

    for (const record of records) {
      await client.query(
        `INSERT INTO attendance_records (
           id,
           session_id,
           student_id,
           status,
           remarks
         )
         VALUES ($1, $2, $3, $4::attendance_status, $5)
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks,
           updated_at = NOW()`,
        [
          generateId(),
          session.id,
          record.studentId,
          record.status,
          record.remarks || null,
        ]
      )
    }

    await client.query('COMMIT')

    res.status(200).json({
      message: 'Attendance saved successfully.',
      session,
      totalStudents: records.length,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}