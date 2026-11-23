
import { query } from '../config/database.js'

export async function getProfessorCourses(req, res, next) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

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

    const coursesResult = await query(
      `SELECT
         c.id AS course_id,
         c.code AS course_code,
         c.name AS course_name,
         c.description,
         c.credits,
         c.ects,
         cs.id AS section_id,
         cs.section_code,
         cs.status AS section_status,
         cs.capacity,
         cs.room,
         cs.schedule,
         at.id AS term_id,
         at.name AS term_name,
         at.academic_year,
         at.semester,
         at.start_date,
         at.end_date,
         COUNT(e.id) FILTER (
           WHERE e.status = 'ENROLLED'
         )::INTEGER AS enrolled_count
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
       JOIN academic_terms at ON at.id = cs.term_id
       LEFT JOIN enrollments e ON e.section_id = cs.id
       WHERE cs.instructor_id = $1
       GROUP BY c.id, cs.id, at.id
       ORDER BY
         at.start_date DESC,
         c.code ASC,
         cs.section_code ASC`,
      [professorId]
    )

    const coursesMap = new Map()

    for (const row of coursesResult.rows) {
      if (!coursesMap.has(row.course_id)) {
        coursesMap.set(row.course_id, {
          id: row.course_id,
          code: row.course_code,
          name: row.course_name,
          description: row.description,
          credits: row.credits,
          ects: row.ects,
          sections: [],
        })
      }

      coursesMap.get(row.course_id).sections.push({
        id: row.section_id,
        sectionCode: row.section_code,
        status: row.section_status,
        capacity: row.capacity,
        room: row.room,
        schedule: row.schedule,
        enrolledCount: Number(row.enrolled_count || 0),
        term: {
          id: row.term_id,
          name: row.term_name,
          academicYear: row.academic_year,
          semester: row.semester,
          startDate: row.start_date,
          endDate: row.end_date,
        },
      })
    }

    const courses = Array.from(coursesMap.values())

    const summary = {
      totalCourses: courses.length,
      totalSections: courses.reduce(
        (total, course) => total + course.sections.length,
        0
      ),
      totalStudents: courses.reduce(
        (total, course) =>
          total +
          course.sections.reduce(
            (sectionTotal, section) =>
              sectionTotal + section.enrolledCount,
            0
          ),
        0
      ),
    }

    return res.status(200).json({
      courses,
      summary,
    })
  } catch (error) {
    next(error)
  }
}
