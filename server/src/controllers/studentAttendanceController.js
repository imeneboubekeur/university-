
import { query } from '../config/database.js'

async function getStudentId(userId) {
  const result = await query(
    `SELECT id
     FROM students
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )

  return result.rows[0]?.id || null
}

// GET /api/student/attendance
export async function getStudentAttendanceSummary(req, res, next) {
  try {
    const studentId = await getStudentId(req.user?.id)

    if (!studentId) {
      return res.status(404).json({
        message: 'Student profile not found.',
      })
    }

    const result = await query(
      `SELECT
         cs.id AS section_id,
         cs.section_code,
         c.id AS course_id,
         c.code AS course_code,
         c.name AS course_name,
         c.credits,
         t.name AS term_name,

         COUNT(ar.id) FILTER (
           WHERE ar.status = 'PRESENT'
         )::int AS present_count,

         COUNT(ar.id) FILTER (
           WHERE ar.status = 'ABSENT'
         )::int AS absent_count,

         COUNT(ar.id) FILTER (
           WHERE ar.status = 'LATE'
         )::int AS late_count,

         COUNT(ar.id) FILTER (
           WHERE ar.status = 'EXCUSED'
         )::int AS excused_count,

         COUNT(ar.id)::int AS total_sessions

       FROM enrollments e
       JOIN course_sections cs
         ON cs.id = e.section_id
       JOIN courses c
         ON c.id = cs.course_id
       LEFT JOIN academic_terms t
         ON t.id = cs.term_id
       LEFT JOIN attendance_sessions ass
         ON ass.section_id = cs.id
       LEFT JOIN attendance_records ar
         ON ar.session_id = ass.id
        AND ar.student_id = e.student_id

       WHERE e.student_id = $1
         AND e.status IN ('ENROLLED', 'COMPLETED')

       GROUP BY
         cs.id,
         cs.section_code,
         c.id,
         c.code,
         c.name,
         c.credits,
         t.name

       ORDER BY
         t.name DESC NULLS LAST,
         c.code ASC`,
      [studentId]
    )

    const attendance = result.rows.map((row) => {
      const present = Number(row.present_count)
      const absent = Number(row.absent_count)
      const late = Number(row.late_count)
      const excused = Number(row.excused_count)

      // Excused sessions are excluded from the attendance-rate denominator.
      // Late sessions count as attended.
      const countedSessions = present + absent + late
      const attendanceRate =
        countedSessions > 0
          ? Number((((present + late) / countedSessions) * 100).toFixed(1))
          : null

      return {
        ...row,
        present_count: present,
        absent_count: absent,
        late_count: late,
        excused_count: excused,
        total_sessions: Number(row.total_sessions),
        attendance_rate: attendanceRate,
      }
    })

    return res.status(200).json({
      attendance,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/student/attendance/sections/:sectionId
export async function getStudentSectionAttendance(req, res, next) {
  try {
    const studentId = await getStudentId(req.user?.id)

    if (!studentId) {
      return res.status(404).json({
        message: 'Student profile not found.',
      })
    }

    const { sectionId } = req.params

    // Confirm that this section belongs to the student's enrollment history.
    const enrollmentResult = await query(
      `SELECT id
       FROM enrollments
       WHERE student_id = $1
         AND section_id = $2
       LIMIT 1`,
      [studentId, sectionId]
    )

    if (!enrollmentResult.rows.length) {
      return res.status(403).json({
        message: 'You are not authorized to view this section.',
      })
    }

    const sectionResult = await query(
      `SELECT
         cs.id AS section_id,
         cs.section_code,
         c.code AS course_code,
         c.name AS course_name,
         c.credits,
         t.name AS term_name
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
       LEFT JOIN academic_terms t ON t.id = cs.term_id
       WHERE cs.id = $1
       LIMIT 1`,
      [sectionId]
    )

    if (!sectionResult.rows.length) {
      return res.status(404).json({
        message: 'Course section not found.',
      })
    }

    const historyResult = await query(
      `SELECT
         ass.id AS session_id,
         ass.attendance_date,
         ass.notes,
         ar.status,
         ar.remarks
       FROM attendance_sessions ass
       JOIN attendance_records ar
         ON ar.session_id = ass.id
       WHERE ass.section_id = $1
         AND ar.student_id = $2
       ORDER BY ass.attendance_date DESC, ass.created_at DESC`,
      [sectionId, studentId]
    )

    const history = historyResult.rows

    const counts = {
      present: history.filter((item) => item.status === 'PRESENT').length,
      absent: history.filter((item) => item.status === 'ABSENT').length,
      late: history.filter((item) => item.status === 'LATE').length,
      excused: history.filter((item) => item.status === 'EXCUSED').length,
    }

    const countedSessions =
      counts.present + counts.absent + counts.late

    const attendanceRate =
      countedSessions > 0
        ? Number(
            (
              ((counts.present + counts.late) / countedSessions) *
              100
            ).toFixed(1)
          )
        : null

    return res.status(200).json({
      section: sectionResult.rows[0],
      summary: {
        ...counts,
        total: history.length,
        attendance_rate: attendanceRate,
      },
      history,
    })
  } catch (error) {
    next(error)
  }
}
