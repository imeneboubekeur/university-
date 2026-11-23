
import { query } from '../config/database.js'

export async function getStudentSchedule(req, res, next) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    // Find the authenticated student's profile.
    const studentResult = await query(
      `SELECT id
       FROM students
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    )

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Student profile not found.',
      })
    }

    const studentId = studentResult.rows[0].id

    // Retrieve only sections in which the student is enrolled.
    const result = await query(
      `SELECT
          e.id AS enrollment_id,
          e.status AS enrollment_status,

          cs.id AS section_id,
          cs.section_code,
          cs.room AS section_room,
          cs.status AS section_status,

          c.id AS course_id,
          c.code AS course_code,
          c.name AS course_name,
          c.credits,
          c.ects,

          at.id AS term_id,
          at.name AS term_name,
          at.academic_year,
          at.semester,
          at.start_date AS term_start_date,
          at.end_date AS term_end_date,

          p.id AS professor_id,
          pu.first_name AS professor_first_name,
          pu.last_name AS professor_last_name,
          p.academic_title,

          sm.id AS meeting_id,
          sm.day_of_week,
          sm.start_time,
          sm.end_time,
          COALESCE(sm.room, cs.room) AS meeting_room

       FROM enrollments e

       JOIN course_sections cs
         ON cs.id = e.section_id

       JOIN courses c
         ON c.id = cs.course_id

       JOIN academic_terms at
         ON at.id = cs.term_id

       LEFT JOIN professors p
         ON p.id = cs.instructor_id

       LEFT JOIN users pu
         ON pu.id = p.user_id

       LEFT JOIN section_meetings sm
         ON sm.section_id = cs.id

       WHERE e.student_id = $1
         AND e.status = 'ENROLLED'
         AND cs.status <> 'CANCELLED'

       ORDER BY
         at.start_date DESC,
         c.code ASC,
         cs.section_code ASC,
         CASE sm.day_of_week
           WHEN 'MONDAY' THEN 1
           WHEN 'TUESDAY' THEN 2
           WHEN 'WEDNESDAY' THEN 3
           WHEN 'THURSDAY' THEN 4
           WHEN 'FRIDAY' THEN 5
           WHEN 'SATURDAY' THEN 6
           WHEN 'SUNDAY' THEN 7
           ELSE 8
         END,
         sm.start_time ASC`,
      [studentId]
    )

    // Group meeting rows under their enrolled course sections.
    const sectionsMap = new Map()

    for (const row of result.rows) {
      if (!sectionsMap.has(row.section_id)) {
        const professorName = [
          row.professor_first_name,
          row.professor_last_name,
        ]
          .filter(Boolean)
          .join(' ')

        sectionsMap.set(row.section_id, {
          enrollment_id: row.enrollment_id,
          enrollment_status: row.enrollment_status,

          section_id: row.section_id,
          section_code: row.section_code,
          room: row.section_room,
          section_status: row.section_status,

          course_id: row.course_id,
          course_code: row.course_code,
          course_name: row.course_name,
          credits: row.credits,
          ects: row.ects,

          term_id: row.term_id,
          term_name: row.term_name,
          academic_year: row.academic_year,
          semester: row.semester,
          term_start_date: row.term_start_date,
          term_end_date: row.term_end_date,

          professor_id: row.professor_id,
          professor_name: professorName || null,
          academic_title: row.academic_title,

          meetings: [],
        })
      }

      const section = sectionsMap.get(row.section_id)

      if (row.meeting_id) {
        section.meetings.push({
          id: row.meeting_id,
          day_of_week: row.day_of_week,
          start_time: row.start_time,
          end_time: row.end_time,
          room: row.meeting_room,
        })
      }
    }

    const sections = Array.from(sectionsMap.values())

    const totalMeetings = sections.reduce(
      (total, section) => total + section.meetings.length,
      0
    )

    return res.status(200).json({
      sections,
      totalSections: sections.length,
      totalMeetings,
    })
  } catch (error) {
    next(error)
  }
}
