
import { query } from '../config/database.js'

export async function getStudentDashboard(req, res, next) {
  try {
    // 1. Get the student's profile
    const studentResult = await query(
      `SELECT
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.image_url,

        s.id AS student_id,
        s.student_number,
        s.enrollment_year,
        s.year_level,
        s.status,

        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code,

        f.id AS faculty_id,
        f.name AS faculty_name,
        f.code AS faculty_code

      FROM users u
      INNER JOIN students s ON s.user_id = u.id
      LEFT JOIN departments d ON d.id = s.department_id
      LEFT JOIN faculties f ON f.id = d.faculty_id

      WHERE u.id = $1
      LIMIT 1`,
      [req.user.id]
    )

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Student profile not found.',
      })
    }

    const student = studentResult.rows[0]

    // 2. Get the active academic term and its registration window
    const termResult = await query(
      `SELECT
        t.id,
        t.name,
        t.academic_year,
        t.semester,
        t.start_date,
        t.end_date,

        rw.id AS registration_window_id,
        rw.registration_opens_at,
        rw.registration_closes_at,
        rw.add_drop_opens_at,
        rw.add_drop_closes_at,
        rw.section_change_opens_at,
        rw.section_change_closes_at,
        rw.is_active AS registration_window_active

      FROM academic_terms t

      LEFT JOIN LATERAL (
        SELECT *
        FROM registration_windows
        WHERE term_id = t.id
          AND is_active = TRUE
        ORDER BY registration_opens_at DESC
        LIMIT 1
      ) rw ON TRUE

      WHERE t.is_active = TRUE
      ORDER BY t.start_date DESC
      LIMIT 1`
    )

    const currentTerm = termResult.rows[0] || null

    // 3. Get current-term enrollment statistics
    
const enrollmentResult = await query(
  `SELECT
    COUNT(e.id)::INTEGER AS enrolled_courses,

    COALESCE(SUM(c.credits), 0)::INTEGER AS enrolled_credits,

    (
      SELECT COUNT(DISTINCT g.course_id)::INTEGER
      FROM grades g
      INNER JOIN enrollments eg
        ON eg.id = g.enrollment_id
      INNER JOIN course_sections gcs
        ON gcs.id = eg.section_id
      WHERE g.student_id = $1
        AND g.status = 'PUBLISHED'
        AND gcs.term_id = $2
        AND eg.status = 'ENROLLED'
    ) AS courses_with_published_grades

  FROM enrollments e

  INNER JOIN course_sections cs
    ON cs.id = e.section_id

  INNER JOIN courses c
    ON c.id = cs.course_id

  WHERE e.student_id = $1
    AND e.status = 'ENROLLED'
    AND cs.term_id = $2`,
  [student.student_id, currentTerm?.id || null]
)

    // 4. Get the latest issued transcript
    const transcriptResult = await query(
      `SELECT
        cumulative_gpa,
        total_credits,
        issued_at,
        transcript_number

      FROM transcripts

      WHERE student_id = $1
        AND status = 'ISSUED'

      ORDER BY issued_at DESC NULLS LAST, generated_at DESC
      LIMIT 1`,
      [student.student_id]
    )

    const transcript = transcriptResult.rows[0] || null

    // 5. Count pending registration requests
    const requestsResult = await query(
      `SELECT
        COUNT(*)::INTEGER AS pending_requests

      FROM registration_requests

      WHERE student_id = $1
        AND status IN ('PENDING', 'UNDER_REVIEW')`,
      [student.student_id]
    )

    // 6. Prepare the response
    return res.status(200).json({
      student,

      stats: {
        gpa: transcript?.cumulative_gpa ?? null,
        completedCredits: transcript?.total_credits ?? 0,
        enrolledCourses: enrollmentResult.rows[0].enrolled_courses,
        enrolledCredits: enrollmentResult.rows[0].enrolled_credits,
        coursesWithPublishedGrades:
          enrollmentResult.rows[0].courses_with_published_grades,
        pendingRequests: requestsResult.rows[0].pending_requests,
      },

      currentTerm,

      latestTranscript: transcript,
    })
  } catch (error) {
    next(error)
  }
}
