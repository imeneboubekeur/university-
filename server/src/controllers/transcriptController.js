
import { query } from '../config/database.js'

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// GET /api/student/transcripts
// Return the student's issued official transcripts and their entries.
export async function getMyTranscripts(req, res, next) {
  try {
    // Find the student's profile.
    const studentResult = await query(
      `SELECT
          s.id AS student_id,
          s.student_number,
          s.enrollment_year,
          s.year_level,
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
       WHERE s.user_id = $1
       LIMIT 1`,
      [req.user.id]
    )

    if (studentResult.rows.length === 0) {
      throw createError('Student profile not found.', 404)
    }

    const student = studentResult.rows[0]

    // Only issued transcripts are visible to students.
    const transcriptResult = await query(
      `SELECT
          tr.id,
          tr.transcript_number,
          tr.status,
          tr.issued_at,
          tr.generated_at,
          tr.cumulative_gpa,
          tr.total_credits,
          tr.term_id,
          at.name AS term_name,
          at.academic_year,
          issuer.first_name AS issuer_first_name,
          issuer.last_name AS issuer_last_name
       FROM transcripts tr
       LEFT JOIN academic_terms at ON at.id = tr.term_id
       LEFT JOIN users issuer ON issuer.id = tr.issued_by
       WHERE tr.student_id = $1
         AND tr.status = 'ISSUED'
       ORDER BY tr.issued_at DESC NULLS LAST,
                tr.generated_at DESC`,
      [student.student_id]
    )

    const transcripts = transcriptResult.rows

    if (transcripts.length === 0) {
      return res.status(200).json({
        student,
        transcripts: [],
      })
    }

    const transcriptIds = transcripts.map((transcript) => transcript.id)

    // Retrieve all entries belonging to the issued transcripts.
    const entriesResult = await query(
      `SELECT
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
       FROM transcript_entries
       WHERE transcript_id = ANY($1::TEXT[])
       ORDER BY term_label ASC, course_code ASC`,
      [transcriptIds]
    )

    const entriesByTranscript = new Map()

    for (const entry of entriesResult.rows) {
      if (!entriesByTranscript.has(entry.transcript_id)) {
        entriesByTranscript.set(entry.transcript_id, [])
      }

      entriesByTranscript.get(entry.transcript_id).push(entry)
    }

    const formattedTranscripts = transcripts.map((transcript) => ({
      ...transcript,
      entries: entriesByTranscript.get(transcript.id) || [],
    }))

    res.status(200).json({
      student,
      transcripts: formattedTranscripts,
    })
  } catch (error) {
    next(error)
  }
}


// GET /api/student/transcripts/:transcriptId
// Return one issued transcript belonging to the logged-in student.
export async function getMyTranscriptById(req, res, next) {
  try {
    const result = await query(
      `SELECT
          tr.id,
          tr.transcript_number,
          tr.status,
          tr.issued_at,
          tr.generated_at,
          tr.cumulative_gpa,
          tr.total_credits,
          tr.term_id,
          at.name AS term_name,
          at.academic_year,

          s.student_number,
          s.enrollment_year,
          s.year_level,

          u.first_name,
          u.last_name,
          u.email,

          d.name AS department_name,
          d.code AS department_code,
          f.name AS faculty_name,

          issuer.first_name AS issuer_first_name,
          issuer.last_name AS issuer_last_name

       FROM transcripts tr

       JOIN students s
         ON s.id = tr.student_id

       JOIN users u
         ON u.id = s.user_id

       LEFT JOIN departments d
         ON d.id = s.department_id

       LEFT JOIN faculties f
         ON f.id = d.faculty_id

       LEFT JOIN academic_terms at
         ON at.id = tr.term_id

       LEFT JOIN users issuer
         ON issuer.id = tr.issued_by

       WHERE tr.id = $1
         AND s.user_id = $2
         AND tr.status = 'ISSUED'

       LIMIT 1`,
      [req.params.transcriptId, req.user.id]
    )

    if (result.rows.length === 0) {
      throw createError(
        'Issued transcript not found.',
        404
      )
    }

    const transcript = result.rows[0]

    const entriesResult = await query(
      `SELECT
          id,
          course_code,
          course_name,
          credits,
          letter_grade,
          numeric_grade,
          term_label,
          quality_points,
          counts_toward_gpa
       FROM transcript_entries
       WHERE transcript_id = $1
       ORDER BY term_label ASC, course_code ASC`,
      [transcript.id]
    )

    res.status(200).json({
      transcript: {
        ...transcript,
        entries: entriesResult.rows,
      },
    })
  } catch (error) {
    next(error)
  }
}
