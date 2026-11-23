
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const ALLOWED_ENROLLMENT_STATUSES = ['ENROLLED', 'COMPLETED']
const VISIBLE_GRADE_STATUSES = ['SUBMITTED', 'PUBLISHED']

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function getLetterGrade(numericGrade) {
  if (numericGrade >= 90) return 'AA'
  if (numericGrade >= 85) return 'BA'
  if (numericGrade >= 80) return 'BB'
  if (numericGrade >= 75) return 'CB'
  if (numericGrade >= 70) return 'CC'
  if (numericGrade >= 65) return 'DC'
  if (numericGrade >= 60) return 'DD'
  return 'FF'
}

async function getStudentAndTerm(client, studentId, termId) {
  const studentResult = await client.query(
    `SELECT
        s.id,
        s.student_number,
        s.year_level,
        u.first_name,
        u.last_name,
        u.email,
        d.name AS department_name,
        f.name AS faculty_name
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN departments d ON d.id = s.department_id
     LEFT JOIN faculties f ON f.id = d.faculty_id
     WHERE s.id = $1
     LIMIT 1`,
    [studentId]
  )

  if (studentResult.rows.length === 0) {
    return { error: 'Student not found.', status: 404 }
  }

  const termResult = await client.query(
    `SELECT
        id,
        name,
        academic_year,
        semester,
        start_date,
        end_date
     FROM academic_terms
     WHERE id = $1
     LIMIT 1`,
    [termId]
  )

  if (termResult.rows.length === 0) {
    return { error: 'Academic term not found.', status: 404 }
  }

  return {
    student: studentResult.rows[0],
    term: termResult.rows[0],
  }
}

async function buildTranscriptPreview(client, studentId, termId) {
  const details = await getStudentAndTerm(client, studentId, termId)

  if (details.error) {
    return details
  }

  const coursesResult = await client.query(
    `SELECT
        e.id AS enrollment_id,
        e.status AS enrollment_status,
        cs.id AS section_id,
        cs.section_code,
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        c.ects,
        at.name AS term_name,
        at.academic_year,
        at.semester
     FROM enrollments e
     JOIN course_sections cs ON cs.id = e.section_id
     JOIN courses c ON c.id = cs.course_id
     JOIN academic_terms at ON at.id = cs.term_id
     WHERE e.student_id = $1
       AND cs.term_id = $2
       AND e.status = ANY($3::enrollment_status[])
     ORDER BY c.code, cs.section_code`,
    [studentId, termId, ALLOWED_ENROLLMENT_STATUSES]
  )

  const courses = []

  for (const course of coursesResult.rows) {
    const assessmentsResult = await client.query(
      `SELECT
          a.id AS assessment_id,
          a.name AS assessment_name,
          a.type AS assessment_type,
          a.percentage,
          a.max_score,
          g.id AS grade_id,
          g.score,
          g.status AS grade_status
       FROM assessments a
       LEFT JOIN grades g
         ON g.assessment_id = a.id
        AND g.enrollment_id = $2
       WHERE a.section_id = $1
       ORDER BY a.created_at, a.name`,
      [course.section_id, course.enrollment_id]
    )

    const assessments = assessmentsResult.rows.map((assessment) => ({
      assessmentId: assessment.assessment_id,
      name: assessment.assessment_name,
      type: assessment.assessment_type,
      percentage: Number(assessment.percentage),
      maxScore: Number(assessment.max_score),
      score:
        assessment.score === null
          ? null
          : Number(assessment.score),
      status: assessment.grade_status,
      isSubmitted:
        VISIBLE_GRADE_STATUSES.includes(assessment.grade_status),
    }))

    const totalWeight = roundToTwo(
      assessments.reduce(
        (total, assessment) => total + assessment.percentage,
        0
      )
    )

    const allAssessmentsSubmitted =
      assessments.length > 0 &&
      assessments.every(
        (assessment) =>
          assessment.isSubmitted &&
          assessment.score !== null &&
          assessment.maxScore > 0
      )

    const weightsAreValid = Math.abs(totalWeight - 100) <= 0.01

    let numericGrade = null
    let letterGrade = null

    if (allAssessmentsSubmitted && weightsAreValid) {
      const weightedResult = assessments.reduce(
        (total, assessment) =>
          total +
          (assessment.score / assessment.maxScore) *
            assessment.percentage,
        0
      )

      numericGrade = roundToTwo(weightedResult)
      letterGrade = getLetterGrade(numericGrade)
    }

    courses.push({
      enrollmentId: course.enrollment_id,
      enrollmentStatus: course.enrollment_status,
      sectionId: course.section_id,
      sectionCode: course.section_code,
      courseId: course.course_id,
      courseCode: course.course_code,
      courseName: course.course_name,
      credits: Number(course.credits),
      ects: course.ects === null ? null : Number(course.ects),
      assessments,
      totalAssessmentWeight: totalWeight,
      allAssessmentsSubmitted,
      weightsAreValid,
      numericGrade,
      letterGrade,
      readyForIssuance:
        allAssessmentsSubmitted && weightsAreValid,
    })
  }

  const allCoursesReady =
    courses.length > 0 &&
    courses.every((course) => course.readyForIssuance)

  return {
    student: details.student,
    term: details.term,
    courses,
    summary: {
      totalCourses: courses.length,
      totalCredits: courses.reduce(
        (total, course) => total + course.credits,
        0
      ),
      readyCourses: courses.filter(
        (course) => course.readyForIssuance
      ).length,
      allCoursesReady,
    },
  }
}

// GET /api/secretary/transcripts/students
export async function getTranscriptStudents(req, res, next) {
  try {
    const search = String(req.query.search || '').trim()

    const result = await query(
      `SELECT
          s.id AS student_id,
          s.student_number,
          s.year_level,
          u.first_name,
          u.last_name,
          u.email,
          d.name AS department_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE (
         $1 = ''
         OR s.student_number ILIKE $2
         OR u.first_name ILIKE $2
         OR u.last_name ILIKE $2
         OR u.email ILIKE $2
       )
       ORDER BY u.last_name, u.first_name
       LIMIT 100`,
      [search, `%${search}%`]
    )

    return res.status(200).json({
      students: result.rows,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/secretary/transcripts/terms
export async function getTranscriptTerms(req, res, next) {
  try {
    const result = await query(
      `SELECT
          id,
          name,
          academic_year,
          semester,
          start_date,
          end_date,
          is_active
       FROM academic_terms
       ORDER BY start_date DESC`
    )

    return res.status(200).json({
      terms: result.rows,
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/secretary/transcripts/preview?studentId=...&termId=...
export async function previewTranscript(req, res, next) {
  try {
    const { studentId, termId } = req.query

    if (!studentId || !termId) {
      return res.status(400).json({
        message: 'Student and academic term are required.',
      })
    }

    const client = await getClient()

    try {
      const preview = await buildTranscriptPreview(
        client,
        studentId,
        termId
      )

      if (preview.error) {
        return res.status(preview.status).json({
          message: preview.error,
        })
      }

      return res.status(200).json({ preview })
    } finally {
      client.release()
    }
  } catch (error) {
    next(error)
  }
}

// POST /api/secretary/transcripts/issue
export async function issueTranscript(req, res, next) {
  const client = await getClient()
  let transactionStarted = false

  try {
    const userId = req.user?.id
    const { studentId, termId } = req.body

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    if (!studentId || !termId) {
      return res.status(400).json({
        message: 'Student and academic term are required.',
      })
    }

    await client.query('BEGIN')
    transactionStarted = true

    // Serialize issuance attempts for the same student.
    const studentLock = await client.query(
      `SELECT id
       FROM students
       WHERE id = $1
       FOR UPDATE`,
      [studentId]
    )

    if (studentLock.rows.length === 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(404).json({
        message: 'Student not found.',
      })
    }

    const existingTranscript = await client.query(
      `SELECT id, transcript_number, status
       FROM transcripts
       WHERE student_id = $1
         AND term_id = $2
         AND status IN ('DRAFT', 'ISSUED')
       LIMIT 1`,
      [studentId, termId]
    )

    if (existingTranscript.rows.length > 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(409).json({
        message:
          'A transcript already exists for this student and academic term.',
        transcript: existingTranscript.rows[0],
      })
    }

    const preview = await buildTranscriptPreview(
      client,
      studentId,
      termId
    )

    if (preview.error) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(preview.status).json({
        message: preview.error,
      })
    }

    if (preview.courses.length === 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(400).json({
        message: 'This student has no courses in the selected term.',
      })
    }

    const incompleteCourses = preview.courses.filter(
      (course) => !course.readyForIssuance
    )

    if (incompleteCourses.length > 0) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return res.status(400).json({
        message:
          'The transcript cannot be issued because some course grades are incomplete or their assessment weights do not total 100%.',
        incompleteCourses: incompleteCourses.map((course) => ({
          courseCode: course.courseCode,
          courseName: course.courseName,
          totalAssessmentWeight: course.totalAssessmentWeight,
          assessments: course.assessments,
        })),
      })
    }

    const transcriptId = generateId()
    const transcriptNumber =
      `TR-${new Date().getFullYear()}-${generateId().toUpperCase()}`

    const totalCredits = preview.summary.totalCredits

    await client.query(
      `INSERT INTO transcripts (
          id,
          student_id,
          term_id,
          transcript_number,
          status,
          issued_at,
          generated_at,
          issued_by,
          cumulative_gpa,
          total_credits
       )
       VALUES (
          $1, $2, $3, $4, 'ISSUED',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          $5,
          NULL,
          $6
       )`,
      [
        transcriptId,
        studentId,
        termId,
        transcriptNumber,
        userId,
        totalCredits,
      ]
    )

    for (const course of preview.courses) {
      await client.query(
        `INSERT INTO transcript_entries (
            id,
            transcript_id,
            course_code,
            course_name,
            credits,
            letter_grade,
            numeric_grade,
            term_label,
            quality_points,
            counts_toward_gpa
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, TRUE)`,
        [
          generateId(),
          transcriptId,
          course.courseCode,
          course.courseName,
          course.credits,
          course.letterGrade,
          course.numericGrade,
          `${preview.term.name} ${preview.term.academic_year}`,
        ]
      )
    }

    await client.query('COMMIT')
    transactionStarted = false

    return res.status(201).json({
      message: 'Official transcript issued successfully.',
      transcript: {
        id: transcriptId,
        transcriptNumber,
        status: 'ISSUED',
        issuedAt: new Date().toISOString(),
        student: preview.student,
        term: preview.term,
        totalCredits,
        cumulativeGpa: null,
        entries: preview.courses.map((course) => ({
          courseCode: course.courseCode,
          courseName: course.courseName,
          credits: course.credits,
          numericGrade: course.numericGrade,
          letterGrade: course.letterGrade,
        })),
      },
    })
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK')
    }

    next(error)
  } finally {
    client.release()
  }
}
