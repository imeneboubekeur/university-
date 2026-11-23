
import { query } from '../config/database.js'

export async function getProfessorDashboard(req, res, next) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    // Find the professor profile linked to the authenticated account.
    const professorResult = await query(
      `SELECT
         p.id,
         p.employee_number,
         p.academic_title,
         u.first_name,
         u.last_name,
         u.email,
         d.name AS department_name,
         d.code AS department_code,
         f.name AS faculty_name
       FROM professors p
       JOIN users u ON u.id = p.user_id
       JOIN departments d ON d.id = p.department_id
       JOIN faculties f ON f.id = d.faculty_id
       WHERE p.user_id = $1
       LIMIT 1`,
      [userId]
    )

    if (professorResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Professor profile not found.',
      })
    }

    const professor = professorResult.rows[0]

    // Find the active academic term, if one exists.
    const termResult = await query(
      `SELECT id, name, academic_year, semester, start_date, end_date
       FROM academic_terms
       WHERE is_active = TRUE
       ORDER BY start_date DESC
       LIMIT 1`
    )

    const activeTerm = termResult.rows[0] || null

    // Get the professor's assigned sections.
    // If there is no active term, show all assigned sections.
    const sectionsResult = await query(
      `SELECT
         cs.id AS section_id,
         cs.section_code,
         cs.status AS section_status,
         cs.room,
         cs.schedule,
         cs.capacity,
         c.id AS course_id,
         c.code AS course_code,
         c.name AS course_name,
         c.credits,
         c.ects,
         at.id AS term_id,
         at.name AS term_name,
         at.academic_year,
         at.semester,
         COUNT(e.id) FILTER (
           WHERE e.status = 'ENROLLED'
         )::INTEGER AS enrolled_count
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
       JOIN academic_terms at ON at.id = cs.term_id
       LEFT JOIN enrollments e ON e.section_id = cs.id
       WHERE cs.instructor_id = $1
         AND ($2::TEXT IS NULL OR cs.term_id = $2)
       GROUP BY
         cs.id,
         c.id,
         at.id
       ORDER BY c.code, cs.section_code`,
      [professor.id, activeTerm?.id || null]
    )

    const sections = sectionsResult.rows

    const summary = {
      totalSections: sections.length,
      totalStudents: sections.reduce(
        (total, section) => total + Number(section.enrolled_count || 0),
        0
      ),
      openSections: sections.filter(
        (section) => section.section_status === 'OPEN'
      ).length,
      totalCapacity: sections.reduce(
        (total, section) => total + Number(section.capacity || 0),
        0
      ),
    }

    return res.status(200).json({
      professor,
      activeTerm,
      summary,
      sections,
    })
  } catch (error) {
    next(error)
  }
}
