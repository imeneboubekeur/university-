
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

async function getProfessorId(userId) {
  const result = await query(
    'SELECT id FROM professors WHERE user_id = $1 LIMIT 1',
    [userId]
  )

  return result.rows[0]?.id || null
}

async function getOwnedSection(client, sectionId, professorId) {
  const result = await client.query(
    `SELECT
        cs.id,
        cs.course_id,
        cs.section_code,
        c.code AS course_code,
        c.name AS course_name,
        at.name AS term_name,
        at.academic_year,
        at.semester
     FROM course_sections cs
     JOIN courses c ON c.id = cs.course_id
     JOIN academic_terms at ON at.id = cs.term_id
     WHERE cs.id = $1 AND cs.instructor_id = $2
     LIMIT 1`,
    [sectionId, professorId]
  )

  return result.rows[0] || null
}

export async function getProfessorGradebook(req, res, next) {
  try {
    const userId = req.user?.id
    const { sectionId, assessmentId } = req.query

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    const professorId = await getProfessorId(userId)

    if (!professorId) {
      return res.status(404).json({ message: 'Professor profile not found.' })
    }

    const sectionsResult = await query(
      `SELECT
          cs.id AS section_id,
          cs.section_code,
          c.code AS course_code,
          c.name AS course_name,
          at.name AS term_name,
          at.academic_year,
          at.semester
       FROM course_sections cs
       JOIN courses c ON c.id = cs.course_id
       JOIN academic_terms at ON at.id = cs.term_id
       WHERE cs.instructor_id = $1
       ORDER BY at.start_date DESC, c.code, cs.section_code`,
      [professorId]
    )

    const sections = sectionsResult.rows

    if (!sectionId) {
      return res.status(200).json({
        sections,
        selectedSection: null,
        assessments: [],
        selectedAssessment: null,
        students: [],
      })
    }

    const section = sections.find(
      (item) => item.section_id === sectionId
    )

    if (!section) {
      return res.status(403).json({
        message: 'You are not authorized to access this section.',
      })
    }

    const assessmentsResult = await query(
      `SELECT
          id,
          name,
          type,
          percentage,
          max_score
       FROM assessments
       WHERE section_id = $1
       ORDER BY created_at ASC`,
      [sectionId]
    )

    const assessments = assessmentsResult.rows

    if (!assessmentId) {
      return res.status(200).json({
        sections,
        selectedSection: section,
        assessments,
        selectedAssessment: null,
        students: [],
      })
    }

    const selectedAssessment = assessments.find(
      (item) => item.id === assessmentId
    )

    if (!selectedAssessment) {
      return res.status(404).json({
        message: 'Assessment not found for this section.',
      })
    }

    const studentsResult = await query(
      `SELECT
          e.id AS enrollment_id,
          e.status AS enrollment_status,
          s.id AS student_id,
          s.student_number,
          s.year_level,
          u.first_name,
          u.last_name,
          u.email,
          g.id AS grade_id,
          g.score,
          g.letter_grade,
          g.status AS grade_status,
          g.published_at
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN grades g
         ON g.enrollment_id = e.id
        AND g.assessment_id = $2
       WHERE e.section_id = $1
         AND e.status = 'ENROLLED'
       ORDER BY u.last_name, u.first_name`,
      [sectionId, assessmentId]
    )

    return res.status(200).json({
      sections,
      selectedSection: section,
      assessments,
      selectedAssessment,
      students: studentsResult.rows,
    })
  } catch (error) {
    next(error)
  }
}

export async function saveProfessorGrades(req, res, next) {
  const client = await getClient()

  try {
    const userId = req.user?.id
    const { sectionId, assessmentId, grades } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    if (
      !sectionId ||
      !assessmentId ||
      !Array.isArray(grades) ||
      grades.length === 0
    ) {
      return res.status(400).json({
        message: 'Section, assessment, and grade entries are required.',
      })
    }

    const professorId = await getProfessorId(userId)

    if (!professorId) {
      return res.status(404).json({ message: 'Professor profile not found.' })
    }

    await client.query('BEGIN')

    const section = await getOwnedSection(client, sectionId, professorId)

    if (!section) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        message: 'You are not authorized to manage this section.',
      })
    }

    const assessmentResult = await client.query(
      `SELECT id, course_id, max_score
       FROM assessments
       WHERE id = $1 AND section_id = $2
       FOR UPDATE`,
      [assessmentId, sectionId]
    )

    if (assessmentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Assessment not found for this section.',
      })
    }

    const assessment = assessmentResult.rows[0]
    const maxScore = Number(assessment.max_score)

    const enrollmentResult = await client.query(
      `SELECT id, student_id
       FROM enrollments
       WHERE section_id = $1 AND status = 'ENROLLED'
       FOR UPDATE`,
      [sectionId]
    )

    const enrollmentMap = new Map(
      enrollmentResult.rows.map((row) => [row.id, row])
    )

    const submittedEnrollmentIds = new Set()

    for (const item of grades) {
      const enrollmentId = item.enrollmentId
      const score =
        item.score === '' || item.score === null || item.score === undefined
          ? null
          : Number(item.score)

      if (!enrollmentId || submittedEnrollmentIds.has(enrollmentId)) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: 'Each enrollment must appear only once.',
        })
      }

      submittedEnrollmentIds.add(enrollmentId)

      if (!enrollmentMap.has(enrollmentId)) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: 'One or more students are not enrolled in this section.',
        })
      }

      if (
        score !== null &&
        (!Number.isFinite(score) || score < 0 || score > maxScore)
      ) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: `Scores must be between 0 and ${maxScore}.`,
        })
      }

      const enrollment = enrollmentMap.get(enrollmentId)

      const existingResult = await client.query(
        `SELECT id, status
         FROM grades
         WHERE enrollment_id = $1 AND assessment_id = $2
         FOR UPDATE`,
        [enrollmentId, assessmentId]
      )

      if (
        existingResult.rows.length > 0 &&
        existingResult.rows[0].status !== 'DRAFT'
      ) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          message: 'Submitted, approved, or published grades cannot be edited.',
        })
      }

      if (existingResult.rows.length === 0) {
        await client.query(
          `INSERT INTO grades (
            id,
            student_id,
            course_id,
            enrollment_id,
            assessment_id,
            score,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')`,
          [
            generateId(),
            enrollment.student_id,
            section.course_id,
            enrollmentId,
            assessmentId,
            score,
          ]
        )
      } else {
        await client.query(
          `UPDATE grades
           SET score = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE enrollment_id = $2
             AND assessment_id = $3
             AND status = 'DRAFT'`,
          [score, enrollmentId, assessmentId]
        )
      }
    }

    await client.query('COMMIT')

    return res.status(200).json({
      message: 'Draft grades saved successfully.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}

export async function submitProfessorGrades(req, res, next) {
  const client = await getClient()

  try {
    const userId = req.user?.id
    const { sectionId, assessmentId } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    if (!sectionId || !assessmentId) {
      return res.status(400).json({
        message: 'Section and assessment are required.',
      })
    }

    const professorId = await getProfessorId(userId)

    if (!professorId) {
      return res.status(404).json({ message: 'Professor profile not found.' })
    }

    await client.query('BEGIN')

    const section = await getOwnedSection(client, sectionId, professorId)

    if (!section) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        message: 'You are not authorized to submit grades for this section.',
      })
    }

    const assessmentResult = await client.query(
      `SELECT id, max_score
       FROM assessments
       WHERE id = $1 AND section_id = $2
       FOR UPDATE`,
      [assessmentId, sectionId]
    )

    if (assessmentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Assessment not found.',
      })
    }

    const maxScore = Number(assessmentResult.rows[0].max_score)

    const enrollmentResult = await client.query(
      `SELECT id
       FROM enrollments
       WHERE section_id = $1 AND status = 'ENROLLED'
       FOR UPDATE`,
      [sectionId]
    )

    const enrollmentIds = enrollmentResult.rows.map((row) => row.id)

    if (enrollmentIds.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: 'There are no enrolled students in this section.',
      })
    }

    const gradesResult = await client.query(
      `SELECT enrollment_id, score, status
       FROM grades
       WHERE assessment_id = $1
         AND enrollment_id = ANY($2::TEXT[])
       FOR UPDATE`,
      [assessmentId, enrollmentIds]
    )

    const gradeMap = new Map(
      gradesResult.rows.map((grade) => [grade.enrollment_id, grade])
    )

    for (const enrollmentId of enrollmentIds) {
      const grade = gradeMap.get(enrollmentId)

      if (!grade || grade.score === null) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: 'Enter a score for every enrolled student before submitting.',
        })
      }

      if (Number(grade.score) < 0 || Number(grade.score) > maxScore) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          message: `Every score must be between 0 and ${maxScore}.`,
        })
      }

      if (grade.status !== 'DRAFT') {
        await client.query('ROLLBACK')
        return res.status(409).json({
          message: 'This assessment contains grades that have already been submitted or finalized.',
        })
      }
    }

    await client.query(
      `UPDATE grades
       SET status = 'SUBMITTED',
           updated_at = CURRENT_TIMESTAMP
       WHERE assessment_id = $1
         AND enrollment_id = ANY($2::TEXT[])
         AND status = 'DRAFT'`,
      [assessmentId, enrollmentIds]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      message: 'Grades submitted successfully for review.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}
