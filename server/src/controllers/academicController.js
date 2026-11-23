
import { query } from '../config/database.js'

export async function getAcademicStructure(req, res, next) {
  try {
    const result = await query(`
      SELECT
        f.id AS faculty_id,
        f.name AS faculty_name,
        f.code AS faculty_code,
        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code
      FROM faculties f
      LEFT JOIN departments d
        ON d.faculty_id = f.id
      ORDER BY f.name, d.name
    `)

    const facultyMap = new Map()

    for (const row of result.rows) {
      if (!facultyMap.has(row.faculty_id)) {
        facultyMap.set(row.faculty_id, {
          id: row.faculty_id,
          name: row.faculty_name,
          code: row.faculty_code,
          departments: [],
        })
      }

      if (row.department_id) {
        facultyMap.get(row.faculty_id).departments.push({
          id: row.department_id,
          name: row.department_name,
          code: row.department_code,
        })
      }
    }

    res.status(200).json({
      faculties: Array.from(facultyMap.values()),
    })
  } catch (error) {
    next(error)
  }
}
