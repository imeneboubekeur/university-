
import { query, getClient } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const ALLOWED_TYPES = [
  'MIDTERM',
  'FINAL',
  'ASSIGNMENT',
  'PROJECT',
  'QUIZ',
  'OTHER',
]

async function getProfessorId(userId) {
  const result = await query(
    'SELECT id FROM professors WHERE user_id = $1 LIMIT 1',
    [userId]
  )

  return result.rows[0]?.id || null
}

export async function getProfessorAssessments(req, res, next) {
  try {
    const userId = req.user?.id

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
          cs.status AS section_status,
          c.id AS course_id,
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
    const { sectionId } = req.query

    if (!sectionId) {
      return res.status(200).json({
        sections,
        assessments: [],
        selectedSection: null,
      })
    }

    const selectedSection = sections.find(
      (section) => section.section_id === sectionId
    )

    if (!selectedSection) {
      return res.status(403).json({
        message: 'You are not authorized to view this section.',
      })
    }

    const assessmentsResult = await query(
      `SELECT
          a.id,
          a.course_id,
          a.section_id,
          a.name,
          a.type,
          a.percentage,
          a.max_score,
          a.created_at,
          COUNT(g.id)::INTEGER AS grade_count
       FROM assessments a
       LEFT JOIN grades g ON g.assessment_id = a.id
       WHERE a.section_id = $1
       GROUP BY a.id
       ORDER BY a.created_at ASC`,
      [sectionId]
    )

    return res.status(200).json({
      sections,
      assessments: assessmentsResult.rows,
      selectedSection,
    })
  } catch (error) {
    next(error)
  }
}

export async function createProfessorAssessment(req, res, next) {
  const client = await getClient()

  try {
    const userId = req.user?.id
    const { sectionId, name, type, percentage, maxScore } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    if (!sectionId || !name?.trim() || !type) {
      return res.status(400).json({
        message: 'Section, assessment name, and type are required.',
      })
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid assessment type.' })
    }

    const parsedPercentage = Number(percentage)
    const parsedMaxScore = Number(maxScore)

    if (
      !Number.isFinite(parsedPercentage) ||
      parsedPercentage <= 0 ||
      parsedPercentage > 100
    ) {
      return res.status(400).json({
        message: 'Percentage must be greater than 0 and at most 100.',
      })
    }

    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      return res.status(400).json({
        message: 'Maximum score must be greater than 0.',
      })
    }

    const professorId = await getProfessorId(userId)

    if (!professorId) {
      return res.status(404).json({ message: 'Professor profile not found.' })
    }

    await client.query('BEGIN')

    const sectionResult = await client.query(
      `SELECT id, course_id
       FROM course_sections
       WHERE id = $1 AND instructor_id = $2
       FOR UPDATE`,
      [sectionId, professorId]
    )

    if (sectionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(403).json({
        message: 'You are not authorized to manage this section.',
      })
    }

    const section = sectionResult.rows[0]

    const totalResult = await client.query(
      `SELECT COALESCE(SUM(percentage), 0) AS total
       FROM assessments
       WHERE section_id = $1`,
      [sectionId]
    )

    const currentTotal = Number(totalResult.rows[0].total)

    if (currentTotal + parsedPercentage > 100) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: `The total assessment percentage cannot exceed 100%. Currently assigned: ${currentTotal}%.`,
      })
    }

    const assessmentId = generateId()

    const result = await client.query(
      `INSERT INTO assessments (
        id, course_id, section_id, name, type, percentage, max_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        assessmentId,
        section.course_id,
        section.id,
        name.trim(),
        type,
        parsedPercentage,
        parsedMaxScore,
      ]
    )

    await client.query('COMMIT')

    return res.status(201).json({
      message: 'Assessment created successfully.',
      assessment: result.rows[0],
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}

export async function updateProfessorAssessment(req, res, next) {
  const client = await getClient()

  try {
    const userId = req.user?.id
    const { assessmentId } = req.params
    const { name, type, percentage, maxScore } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    if (!name?.trim() || !type) {
      return res.status(400).json({
        message: 'Assessment name and type are required.',
      })
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid assessment type.' })
    }

    const parsedPercentage = Number(percentage)
    const parsedMaxScore = Number(maxScore)

    if (
      !Number.isFinite(parsedPercentage) ||
      parsedPercentage <= 0 ||
      parsedPercentage > 100
    ) {
      return res.status(400).json({
        message: 'Percentage must be greater than 0 and at most 100.',
      })
    }

    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore <= 0) {
      return res.status(400).json({
        message: 'Maximum score must be greater than 0.',
      })
    }

    const professorId = await getProfessorId(userId)

    if (!professorId) {
      return res.status(404).json({ message: 'Professor profile not found.' })
    }

    await client.query('BEGIN')

    const assessmentResult = await client.query(
      `SELECT a.id, a.section_id
       FROM assessments a
       JOIN course_sections cs ON cs.id = a.section_id
       WHERE a.id = $1 AND cs.instructor_id = $2
       FOR UPDATE OF a, cs`,
      [assessmentId, professorId]
    )

    if (assessmentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Assessment not found or access denied.',
      })
    }

    const sectionId = assessmentResult.rows[0].section_id

    const totalResult = await client.query(
      `SELECT COALESCE(SUM(percentage), 0) AS total
       FROM assessments
       WHERE section_id = $1 AND id <> $2`,
      [sectionId, assessmentId]
    )

    const otherTotal = Number(totalResult.rows[0].total)

    if (otherTotal + parsedPercentage > 100) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        message: `The total assessment percentage cannot exceed 100%. Other assessments currently use ${otherTotal}%.`,
      })
    }

    const result = await client.query(
      `UPDATE assessments
       SET name = $1,
           type = $2,
           percentage = $3,
           max_score = $4
       WHERE id = $5
       RETURNING *`,
      [
        name.trim(),
        type,
        parsedPercentage,
        parsedMaxScore,
        assessmentId,
      ]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      message: 'Assessment updated successfully.',
      assessment: result.rows[0],
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}

export async function deleteProfessorAssessment(req, res, next) {
  const client = await getClient()

  try {
    const userId = req.user?.id
    const { assessmentId } = req.params

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    const professorId = await getProfessorId(userId)

    if (!professorId) {
      return res.status(404).json({ message: 'Professor profile not found.' })
    }

    await client.query('BEGIN')

    const assessmentResult = await client.query(
      `SELECT a.id
       FROM assessments a
       JOIN course_sections cs ON cs.id = a.section_id
       WHERE a.id = $1 AND cs.instructor_id = $2
       FOR UPDATE OF a`,
      [assessmentId, professorId]
    )

    if (assessmentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({
        message: 'Assessment not found or access denied.',
      })
    }

    const gradesResult = await client.query(
      'SELECT COUNT(*)::INTEGER AS count FROM grades WHERE assessment_id = $1',
      [assessmentId]
    )

    if (gradesResult.rows[0].count > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'This assessment already has grades and cannot be deleted.',
      })
    }

    await client.query(
      'DELETE FROM assessments WHERE id = $1',
      [assessmentId]
    )

    await client.query('COMMIT')

    return res.status(200).json({
      message: 'Assessment deleted successfully.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
}
