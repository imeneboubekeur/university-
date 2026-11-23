
import { query } from '../config/database.js'

export async function getProfessorSchedule(req, res, next) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    // Find the authenticated professor's profile.
    const professorResult = await query(
      `SELECT id
       FROM professors
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    )

    if (professorResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Professor profile not found.',
      })
    }

    const professorId = professorResult.rows[0].id

    // Retrieve the professor's assigned sections and their meetings.
    const result = await query(
      `SELECT
          cs.id AS section_id,
          cs.section_code,
          cs.room AS section_room,
          cs.schedule AS legacy_schedule,
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

          sm.id AS meeting_id,
          sm.day_of_week,
          sm.start_time,
          sm.end_time,
          COALESCE(sm.room, cs.room) AS meeting_room

       FROM course_sections cs

       JOIN courses c
         ON c.id = cs.course_id

       JOIN academic_terms at
         ON at.id = cs.term_id

       LEFT JOIN section_meetings sm
         ON sm.section_id = cs.id

       WHERE cs.instructor_id = $1
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
      [professorId]
    )

    // Group meeting rows under their corresponding course sections.
    const sectionsMap = new Map()

    for (const row of result.rows) {
      if (!sectionsMap.has(row.section_id)) {
        sectionsMap.set(row.section_id, {
          section_id: row.section_id,
          section_code: row.section_code,
          room: row.section_room,
          schedule: row.legacy_schedule || [],
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

    return res.status(200).json({
      sections,
      totalSections: sections.length,
    })
  } catch (error) {
    next(error)
  }
}
