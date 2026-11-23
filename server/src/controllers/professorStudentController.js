
import { query } from '../config/database.js'

export async function getProfessorStudents(req, res, next) {
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
    const { sectionId } = req.query

    // Only return sections assigned to this professor.
    const sectionsResult = await query(
      `SELECT
         cs.id,
         cs.section_code,
         cs.status AS section_status,
         c.code AS course_code,
         c.name AS course_name,
         at.name AS term_name,
         at.academic_year,
         COUNT(e.id) FILTER (
           WHERE e.status = 'ENROLLED'
         )::INTEGER AS enrolled_count
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
       JOIN academic_terms at ON at.id = cs.term_id
       LEFT JOIN enrollments e ON e.section_id = cs.id
       WHERE cs.instructor_id = $1
       GROUP BY cs.id, c.id, at.id
       ORDER BY at.start_date DESC, c.code, cs.section_code`,
      [professorId]
    )

    const sections = sectionsResult.rows

    if (!sectionId) {
      return res.status(200).json({
        sections,
        students: [],
        selectedSection: null,
        totalStudents: 0,
      })
    }

    // Confirm that the requested section belongs to this professor.
    const selectedSection = sections.find(
      (section) => section.id === sectionId
    )

    if (!selectedSection) {
      return res.status(403).json({
        message: 'You are not authorized to view students in this section.',
      })
    }

    const studentsResult = await query(
      `SELECT
         e.id AS enrollment_id,
         e.status AS enrollment_status,
         e.enrolled_at,
         s.id AS student_id,
         s.student_number,
         s.year_level,
         s.enrollment_year,
         s.status AS student_status,
         u.first_name,
         u.last_name,
         u.email,
         d.name AS department_name,
         d.code AS department_code
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       JOIN departments d ON d.id = s.department_id
       WHERE e.section_id = $1
         AND e.status = 'ENROLLED'
       ORDER BY u.last_name, u.first_name`,
      [sectionId]
    )

    return res.status(200).json({
      sections,
      selectedSection,
      students: studentsResult.rows,
      totalStudents: studentsResult.rows.length,
    })
  } catch (error) {
    next(error)
  }
}
