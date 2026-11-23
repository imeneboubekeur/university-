
import { query } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

function validateTerm({ name, academicYear, semester, startDate, endDate }) {
  if (
    !String(name || '').trim() ||
    !String(academicYear || '').trim() ||
    !startDate ||
    !endDate
  ) {
    return 'Name, academic year, start date and end date are required.'
  }

  if (!Number.isInteger(Number(semester)) || ![1, 2].includes(Number(semester))) {
    return 'Semester must be 1 (Fall) or 2 (Spring).'
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Please provide valid dates.'
  }

  if (start >= end) {
    return 'The end date must be after the start date.'
  }

  return null
}

// GET /api/admin/terms
export async function getAdminTerms(req, res, next) {
  try {
    const result = await query(`
      SELECT
        t.id,
        t.name,
        t.academic_year,
        t.semester,
        t.start_date,
        t.end_date,
        t.is_active,
        t.created_at,
        COUNT(DISTINCT rw.id)::INTEGER AS registration_window_count
      FROM academic_terms t
      LEFT JOIN registration_windows rw ON rw.term_id = t.id
      GROUP BY t.id
      ORDER BY t.academic_year DESC, t.semester DESC, t.start_date DESC
    `)

    return res.json({ terms: result.rows })
  } catch (error) {
    next(error)
  }
}

// POST /api/admin/terms
export async function createAdminTerm(req, res, next) {
  try {
    const {
      name,
      academicYear,
      semester,
      startDate,
      endDate,
      isActive = false,
    } = req.body

    const validationError = validateTerm({
      name,
      academicYear,
      semester,
      startDate,
      endDate,
    })

    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const result = await query(
      `
        INSERT INTO academic_terms (
          id,
          name,
          academic_year,
          semester,
          start_date,
          end_date,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        generateId(),
        String(name).trim(),
        String(academicYear).trim(),
        Number(semester),
        startDate,
        endDate,
        Boolean(isActive),
      ]
    )

    return res.status(201).json({
      message: 'Academic term created successfully.',
      term: result.rows[0],
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A term already exists for this academic year and semester.',
      })
    }
    next(error)
  }
}

// PATCH /api/admin/terms/:termId
export async function updateAdminTerm(req, res, next) {
  try {
    const { termId } = req.params
    const {
      name,
      academicYear,
      semester,
      startDate,
      endDate,
      isActive,
    } = req.body

    const existingResult = await query(
      `
        SELECT id, name, academic_year, semester, start_date, end_date, is_active
        FROM academic_terms
        WHERE id = $1
      `,
      [termId]
    )

    if (!existingResult.rowCount) {
      return res.status(404).json({ message: 'Academic term not found.' })
    }

    const existing = existingResult.rows[0]

    const updated = {
      name: name ?? existing.name,
      academicYear: academicYear ?? existing.academic_year,
      semester: semester ?? existing.semester,
      startDate: startDate ?? existing.start_date,
      endDate: endDate ?? existing.end_date,
    }

    const validationError = validateTerm(updated)

    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const activeValue =
      typeof isActive === 'boolean' ? isActive : existing.is_active

    const result = await query(
      `
        UPDATE academic_terms
        SET
          name = $1,
          academic_year = $2,
          semester = $3,
          start_date = $4,
          end_date = $5,
          is_active = $6
        WHERE id = $7
        RETURNING *
      `,
      [
        String(updated.name).trim(),
        String(updated.academicYear).trim(),
        Number(updated.semester),
        updated.startDate,
        updated.endDate,
        activeValue,
        termId,
      ]
    )

    return res.json({
      message: 'Academic term updated successfully.',
      term: result.rows[0],
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'A term already exists for this academic year and semester.',
      })
    }
    next(error)
  }
}
