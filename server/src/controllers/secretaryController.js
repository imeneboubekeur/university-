
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'
import { randomUUID } from 'node:crypto'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// Standard 4.00 grading scale.
// Adjust this mapping if your university uses a different official scale.
const GRADE_POINTS = {
  AA: 4.0,
  BA: 3.5,
  BB: 3.0,
  CB: 2.5,
  CC: 2.0,
  DC: 1.5,
  DD: 1.0,
  FD: 0.5,
  FF: 0.0,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  D: 1.0,
  F: 0.0,
}

function getGradePoints(letterGrade) {
  if (!letterGrade) return null

  const normalized = String(letterGrade).trim().toUpperCase()
  return Object.prototype.hasOwnProperty.call(GRADE_POINTS, normalized)
    ? GRADE_POINTS[normalized]
    : null
}

function calculateTranscriptSummary(courses) {
  let totalCredits = 0
  let gpaCredits = 0
  let totalQualityPoints = 0

  const entries = courses.map((course) => {
    const credits = Number(course.credits || 0)
    const qualityPoints = getGradePoints(course.letter_grade)

    totalCredits += credits

    const countsTowardGpa = qualityPoints !== null

    if (countsTowardGpa) {
      gpaCredits += credits
      totalQualityPoints += credits * qualityPoints
    }

    return {
      id: generateId(),
      course_code: course.course_code,
      course_name: course.course_name,
      credits,
      letter_grade: course.letter_grade,
      numeric_grade: course.numeric_grade,
      term_label: course.term_label,
      quality_points: qualityPoints,
      counts_toward_gpa: countsTowardGpa,
    }
  })

  return {
    entries,
    totalCredits,
    cumulativeGpa:
      gpaCredits > 0
        ? Number((totalQualityPoints / gpaCredits).toFixed(2))
        : null,
  }
}

// Shared query: only completed enrollments with published FINAL grades.
async function getEligibleTranscriptCourses(studentId, termId) {
  const result = await query(
    `SELECT DISTINCT ON (e.id)
        e.id AS enrollment_id,
        c.id AS course_id,
        c.code AS course_code,
        c.name AS course_name,
        c.credits,
        g.letter_grade,
        g.score AS numeric_grade,
        at.name AS term_label,
        at.academic_year,
        at.semester,
        g.published_at

     FROM enrollments e

     JOIN course_sections cs
       ON cs.id = e.section_id

     JOIN courses c
       ON c.id = cs.course_id

     JOIN academic_terms at
       ON at.id = cs.term_id

     JOIN grades g
       ON g.enrollment_id = e.id
      AND g.student_id = e.student_id
      AND g.course_id = c.id

     JOIN assessments a
       ON a.id = g.assessment_id
      AND a.course_id = c.id
      AND a.type = 'FINAL'

     WHERE e.student_id = $1
       AND e.status = 'COMPLETED'
       AND g.status = 'PUBLISHED'
       AND ($2::TEXT IS NULL OR cs.term_id = $2)

     ORDER BY e.id, g.published_at DESC NULLS LAST`,
    [studentId, termId || null]
  )

  return result.rows
}

// GET /api/secretary/students
export async function searchStudents(req, res, next) {
  try {
    const search = String(req.query.search || '').trim()
    const limit = Math.min(Number(req.query.limit) || 20, 50)

    const result = await query(
      `SELECT
          s.id AS student_id,
          s.student_number,
          s.year_level,
          s.status AS student_status,
          s.enrollment_year,
          u.first_name,
          u.last_name,
          u.email,
          d.name AS department_name,
          d.code AS department_code,
          f.name AS faculty_name

       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN departments d ON d.id = s.department_id
       LEFT JOIN faculties f ON f.id = d.faculty_id

       WHERE (
         $1 = ''
         OR s.student_number ILIKE '%' || $1 || '%'
         OR u.first_name ILIKE '%' || $1 || '%'
         OR u.last_name ILIKE '%' || $1 || '%'
         OR u.email ILIKE '%' || $1 || '%'
         OR (u.first_name || ' ' || u.last_name) ILIKE '%' || $1 || '%'
       )

       ORDER BY u.last_name, u.first_name
       LIMIT $2`,
      [search, limit]
    )

    res.status(200).json({
      students: result.rows,
    })
  } catch (error) {
    next(error)
  }
}


// GET /api/secretary/students/:studentId/transcript-preview?termId=...
export async function getTranscriptPreview(req, res, next) {
  try {
    const { studentId } = req.params
    const { termId } = req.query

    const studentResult = await query(
      `SELECT
          s.id AS student_id,
          s.student_number,
          s.year_level,
          s.enrollment_year,
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
      throw createError('Student not found.', 404)
    }

    const courses = await getEligibleTranscriptCourses(
      studentId,
      termId || null
    )

    const summary = calculateTranscriptSummary(courses)

    res.status(200).json({
      student: studentResult.rows[0],
      termId: termId || null,
      courses: summary.entries,
      summary: {
        totalCourses: summary.entries.length,
        totalCredits: summary.totalCredits,
        cumulativeGpa: summary.cumulativeGpa,
      },
    })
  } catch (error) {
    next(error)
  }
}


// POST /api/secretary/transcripts/drafts
// Body: { studentId, termId }
export async function createTranscriptDraft(req, res, next) {
  const client = await getClient()
  let transactionStarted = false

  try {
    const { studentId, termId } = req.body

    if (!studentId || !termId) {
      throw createError('Student and academic term are required.')
    }

    await client.query('BEGIN')
    transactionStarted = true

    const studentResult = await client.query(
      `SELECT id
       FROM students
       WHERE id = $1
       FOR UPDATE`,
      [studentId]
    )

    if (studentResult.rows.length === 0) {
      throw createError('Student not found.', 404)
    }

    const termResult = await client.query(
      `SELECT id, name
       FROM academic_terms
       WHERE id = $1`,
      [termId]
    )

    if (termResult.rows.length === 0) {
      throw createError('Academic term not found.', 404)
    }

    const existingResult = await client.query(
      `SELECT id, status
       FROM transcripts
       WHERE student_id = $1
         AND term_id = $2
         AND status IN ('DRAFT', 'ISSUED')
       LIMIT 1`,
      [studentId, termId]
    )

    if (existingResult.rows.length > 0) {
      throw createError(
        'A draft or issued transcript already exists for this student and term.',
        409
      )
    }

    const courseResult = await client.query(
      `SELECT DISTINCT ON (e.id)
          e.id AS enrollment_id,
          c.code AS course_code,
          c.name AS course_name,
          c.credits,
          g.letter_grade,
          g.score AS numeric_grade,
          at.name AS term_label,
          g.published_at

       FROM enrollments e

       JOIN course_sections cs
         ON cs.id = e.section_id

       JOIN courses c
         ON c.id = cs.course_id

       JOIN academic_terms at
         ON at.id = cs.term_id

       JOIN grades g
         ON g.enrollment_id = e.id
        AND g.student_id = e.student_id
        AND g.course_id = c.id

       JOIN assessments a
         ON a.id = g.assessment_id
        AND a.course_id = c.id
        AND a.type = 'FINAL'

       WHERE e.student_id = $1
         AND e.status = 'COMPLETED'
         AND cs.term_id = $2
         AND g.status = 'PUBLISHED'

       ORDER BY e.id, g.published_at DESC NULLS LAST`,
      [studentId, termId]
    )

    if (courseResult.rows.length === 0) {
      throw createError(
        'There are no completed courses with published final grades for this term.',
        422
      )
    }

    const summary = calculateTranscriptSummary(courseResult.rows)
    const transcriptId = generateId()
    const transcriptNumber = `TR-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`

    await client.query(
      `INSERT INTO transcripts (
          id,
          student_id,
          term_id,
          transcript_number,
          status,
          generated_at,
          cumulative_gpa,
          total_credits
       )
       VALUES ($1, $2, $3, $4, 'DRAFT', CURRENT_TIMESTAMP, $5, $6)`,
      [
        transcriptId,
        studentId,
        termId,
        transcriptNumber,
        summary.cumulativeGpa,
        summary.totalCredits,
      ]
    )

    for (const entry of summary.entries) {
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
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          entry.id,
          transcriptId,
          entry.course_code,
          entry.course_name,
          entry.credits,
          entry.letter_grade,
          entry.numeric_grade,
          entry.term_label,
          entry.quality_points,
          entry.counts_toward_gpa,
        ]
      )
    }

    await client.query('COMMIT')
    transactionStarted = false

    res.status(201).json({
      message: 'Transcript draft created successfully.',
      transcript: {
        id: transcriptId,
        transcript_number: transcriptNumber,
        status: 'DRAFT',
        cumulative_gpa: summary.cumulativeGpa,
        total_credits: summary.totalCredits,
        total_courses: summary.entries.length,
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


// PATCH /api/secretary/transcripts/:transcriptId/issue
export async function issueTranscript(req, res, next) {
  const client = await getClient()
  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    const result = await client.query(
      `SELECT id, status, student_id
       FROM transcripts
       WHERE id = $1
       FOR UPDATE`,
      [req.params.transcriptId]
    )

    if (result.rows.length === 0) {
      throw createError('Transcript not found.', 404)
    }

    const transcript = result.rows[0]

    if (transcript.status !== 'DRAFT') {
      throw createError(
        'Only draft transcripts can be issued.',
        409
      )
    }

    const entriesResult = await client.query(
      `SELECT COUNT(*)::INTEGER AS entry_count
       FROM transcript_entries
       WHERE transcript_id = $1`,
      [transcript.id]
    )

    if (entriesResult.rows[0].entry_count === 0) {
      throw createError(
        'A transcript without course entries cannot be issued.',
        422
      )
    }

    const updatedResult = await client.query(
      `UPDATE transcripts
       SET status = 'ISSUED',
           issued_at = CURRENT_TIMESTAMP,
           issued_by = $2
       WHERE id = $1
         AND status = 'DRAFT'
       RETURNING
         id,
         transcript_number,
         status,
         issued_at,
         cumulative_gpa,
         total_credits`,
      [transcript.id, req.user.id]
    )

    await client.query('COMMIT')
    transactionStarted = false

    res.status(200).json({
      message: 'Transcript issued successfully.',
      transcript: updatedResult.rows[0],
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

// GET /api/secretary/terms
export async function getSecretaryTerms(req, res, next) {
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
       ORDER BY academic_year DESC, semester DESC`
    )

    res.status(200).json({
      terms: result.rows,
    })
  } catch (error) {
    next(error)
  }
}
