
import { query } from '../config/database.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// GET /api/student/grades/current-term
export async function getMyCurrentTermGrades(req, res, next) {
  try {
    const studentResult = await query(
      `SELECT id
       FROM students
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.id]
    )

    if (studentResult.rows.length === 0) {
      throw createError('Student profile not found.', 404)
    }

    const studentId = studentResult.rows[0].id

    const termResult = await query(
      `SELECT
          id,
          name,
          academic_year,
          semester,
          start_date,
          end_date
       FROM academic_terms
       WHERE is_active = TRUE
       LIMIT 1`
    )

    if (termResult.rows.length === 0) {
      return res.status(200).json({
        term: null,
        courses: [],
        totalCourses: 0,
        totalPublishedGrades: 0,
      })
    }

    const term = termResult.rows[0]

    const gradesResult = await query(
      `SELECT
          e.id AS enrollment_id,

          cs.id AS section_id,
          cs.section_code,

          c.id AS course_id,
          c.code AS course_code,
          c.name AS course_name,
          c.credits,
          c.ects,

          g.id AS grade_id,
          g.assessment_id,
          g.score,
          g.letter_grade,
          g.status AS grade_status,
          g.published_at,

          a.name AS assessment_name,
          a.type AS assessment_type,
          a.percentage AS assessment_percentage,
          a.max_score

       FROM enrollments e

       JOIN course_sections cs
         ON cs.id = e.section_id

       JOIN courses c
         ON c.id = cs.course_id

       LEFT JOIN grades g
         ON g.enrollment_id = e.id
        AND g.student_id = e.student_id
        AND g.course_id = c.id
        AND g.status IN ('SUBMITTED', 'PUBLISHED')

       LEFT JOIN assessments a
         ON a.id = g.assessment_id

       WHERE e.student_id = $1
         AND e.status = 'ENROLLED'
         AND cs.term_id = $2
         AND cs.status <> 'CANCELLED'

       ORDER BY c.code ASC, a.name ASC`,
      [studentId, term.id]
    )

    const coursesById = new Map()

    for (const row of gradesResult.rows) {
      if (!coursesById.has(row.course_id)) {
        coursesById.set(row.course_id, {
          enrollmentId: row.enrollment_id,
          sectionId: row.section_id,
          sectionCode: row.section_code,

          courseId: row.course_id,
          courseCode: row.course_code,
          courseName: row.course_name,
          credits: row.credits,
          ects: row.ects,

          assessments: [],
        })
      }

      if (row.grade_id) {
        coursesById.get(row.course_id).assessments.push({
          id: row.grade_id,
          assessmentId: row.assessment_id,
          name: row.assessment_name || 'Assessment',
          type: row.assessment_type,
          percentage: row.assessment_percentage,
          maxScore: row.max_score,
          score: row.score,
          letterGrade: row.letter_grade,
          status: row.grade_status,
          publishedAt: row.published_at,
        })
      }
    }

    const courses = Array.from(coursesById.values())

    const totalVisibleGrades = courses.reduce(
      (total, course) => total + course.assessments.length,
      0
    )

    return res.status(200).json({
      term,
      courses,
      totalCourses: courses.length,
      totalPublishedGrades: totalVisibleGrades,
      totalVisibleGrades,
    })
  } catch (error) {
    next(error)
  }
}
