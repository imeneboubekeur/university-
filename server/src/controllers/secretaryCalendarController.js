
import { query } from '../config/database.js'
import { generateId } from '../utils/generateId.js'

const isValidDate = (value) => {
  return value && !Number.isNaN(new Date(value).getTime())
}

const validateTerm = ({ name, academicYear, semester, startDate, endDate }) => {
  if (!name?.trim() || !academicYear?.trim()) {
    return 'Term name and academic year are required.'
  }

  if (![1, 2].includes(Number(semester))) {
    return 'Semester must be 1 (Fall) or 2 (Spring).'
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return 'Valid start and end dates are required.'
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return 'The end date must be after the start date.'
  }

  return null
}

const validateWindow = (body) => {
  const fields = [
    'registrationOpensAt',
    'registrationClosesAt',
    'addDropOpensAt',
    'addDropClosesAt',
    'sectionChangeOpensAt',
    'sectionChangeClosesAt',
  ]

  for (const field of fields) {
    if (!isValidDate(body[field])) {
      return `${field} must be a valid date and time.`
    }
  }

  const pairs = [
    ['registrationOpensAt', 'registrationClosesAt'],
    ['addDropOpensAt', 'addDropClosesAt'],
    ['sectionChangeOpensAt', 'sectionChangeClosesAt'],
  ]

  for (const [start, end] of pairs) {
    if (new Date(body[start]) >= new Date(body[end])) {
      return `${end} must be after ${start}.`
    }
  }

  return null
}

// GET /api/secretary/calendar
export async function getAcademicCalendar(req, res, next) {
  try {
    const termsResult = await query(`
      SELECT
        id,
        name,
        academic_year,
        semester,
        start_date,
        end_date,
        is_active,
        created_at
      FROM academic_terms
      ORDER BY academic_year DESC, semester ASC
    `)

    const windowsResult = await query(`
      SELECT
        rw.id,
        rw.term_id,
        rw.registration_opens_at,
        rw.registration_closes_at,
        rw.add_drop_opens_at,
        rw.add_drop_closes_at,
        rw.section_change_opens_at,
        rw.section_change_closes_at,
        rw.is_active
      FROM registration_windows rw
      ORDER BY rw.registration_opens_at DESC
    `)

    const windowsByTerm = new Map()

    for (const window of windowsResult.rows) {
      const existing = windowsByTerm.get(window.term_id) || []
      existing.push(window)
      windowsByTerm.set(window.term_id, existing)
    }

    const terms = termsResult.rows.map((term) => ({
      ...term,
      registration_windows: windowsByTerm.get(term.id) || [],
    }))

    res.json({ terms })
  } catch (error) {
    next(error)
  }
}

// POST /api/secretary/calendar/terms
export async function createAcademicTerm(req, res, next) {
  try {
    const {
      name,
      academicYear,
      semester,
      startDate,
      endDate,
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

    const id = generateId()

    const result = await query(
      `INSERT INTO academic_terms (
        id, name, academic_year, semester,
        start_date, end_date, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *`,
      [
        id,
        name.trim(),
        academicYear.trim(),
        Number(semester),
        startDate,
        endDate,
      ]
    )

    res.status(201).json({
      message: 'Academic term created successfully.',
      term: result.rows[0],
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'An academic term already exists for this academic year and semester.',
      })
    }

    next(error)
  }
}

// PATCH /api/secretary/calendar/terms/:termId
export async function updateAcademicTerm(req, res, next) {
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

    if (typeof isActive === 'boolean' &&
        name === undefined &&
        academicYear === undefined &&
        semester === undefined &&
        startDate === undefined &&
        endDate === undefined) {
      const result = await query(
        `UPDATE academic_terms
         SET is_active = $1
         WHERE id = $2
         RETURNING *`,
        [isActive, termId]
      )

      if (!result.rowCount) {
        return res.status(404).json({ message: 'Academic term not found.' })
      }

      return res.json({
        message: 'Academic term status updated.',
        term: result.rows[0],
      })
    }

    const existingResult = await query(
      'SELECT * FROM academic_terms WHERE id = $1',
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

    const result = await query(
      `UPDATE academic_terms
       SET name = $1,
           academic_year = $2,
           semester = $3,
           start_date = $4,
           end_date = $5
       WHERE id = $6
       RETURNING *`,
      [
        updated.name.trim(),
        updated.academicYear.trim(),
        Number(updated.semester),
        updated.startDate,
        updated.endDate,
        termId,
      ]
    )

    res.json({
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

// POST /api/secretary/calendar/terms/:termId/windows
export async function createRegistrationWindow(req, res, next) {
  try {
    const { termId } = req.params

    const validationError = validateWindow(req.body)

    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    const termResult = await query(
      'SELECT id FROM academic_terms WHERE id = $1',
      [termId]
    )

    if (!termResult.rowCount) {
      return res.status(404).json({ message: 'Academic term not found.' })
    }

    const {
      registrationOpensAt,
      registrationClosesAt,
      addDropOpensAt,
      addDropClosesAt,
      sectionChangeOpensAt,
      sectionChangeClosesAt,
    } = req.body

    const result = await query(
      `INSERT INTO registration_windows (
        id,
        term_id,
        registration_opens_at,
        registration_closes_at,
        add_drop_opens_at,
        add_drop_closes_at,
        section_change_opens_at,
        section_change_closes_at,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING *`,
      [
        generateId(),
        termId,
        registrationOpensAt,
        registrationClosesAt,
        addDropOpensAt,
        addDropClosesAt,
        sectionChangeOpensAt,
        sectionChangeClosesAt,
      ]
    )

    res.status(201).json({
      message: 'Registration window created successfully.',
      window: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/secretary/calendar/windows/:windowId
export async function updateRegistrationWindowStatus(req, res, next) {
  try {
    const { windowId } = req.params
    const { isActive } = req.body

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        message: 'isActive must be true or false.',
      })
    }

    const result = await query(
      `UPDATE registration_windows
       SET is_active = $1
       WHERE id = $2
       RETURNING *`,
      [isActive, windowId]
    )

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Registration window not found.',
      })
    }

    res.json({
      message: 'Registration window status updated.',
      window: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}
