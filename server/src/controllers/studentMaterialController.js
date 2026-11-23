
import { query } from '../config/database.js'
import cloudinary from '../config/cloudinary.js'

// GET /api/student/sections/:sectionId/materials
export async function getStudentSectionMaterials(req, res, next) {
  try {
    const userId = req.user?.id
    const { sectionId } = req.params

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    const studentResult = await query(
      `SELECT id
       FROM students
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    )

    if (!studentResult.rows.length) {
      return res.status(404).json({
        message: 'Student profile not found.',
      })
    }

    const studentId = studentResult.rows[0].id

    // Verify that the student is enrolled in this section
    // and that the section belongs to the active academic term.
    const enrollmentResult = await query(
      `SELECT cs.id
       FROM enrollments e
       JOIN course_sections cs ON cs.id = e.section_id
       JOIN academic_terms at ON at.id = cs.term_id
       WHERE e.student_id = $1
         AND e.section_id = $2
         AND e.status = 'ENROLLED'
         AND at.is_active = TRUE
       LIMIT 1`,
      [studentId, sectionId]
    )

    if (!enrollmentResult.rows.length) {
      return res.status(403).json({
        message: 'You are not enrolled in this active course section.',
      })
    }

    const materialsResult = await query(
      `SELECT
         id,
         title,
         original_filename,
         public_id,
         file_size_bytes,
         created_at
       FROM professor_course_materials
       WHERE section_id = $1
       ORDER BY created_at DESC`,
      [sectionId]
    )

    const materials = materialsResult.rows.map((material) => ({
      id: material.id,
      title: material.title,
      originalFilename: material.original_filename,
      fileSizeBytes: Number(material.file_size_bytes),
      createdAt: material.created_at,
      downloadUrl: `/api/student/materials/${material.id}/download`,
    }))

    return res.status(200).json({ materials })
  } catch (error) {
    next(error)
  }
}

// GET /api/student/materials/:materialId/download
export async function downloadStudentMaterial(req, res, next) {
  try {
    const userId = req.user?.id
    const { materialId } = req.params

    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    // The enrollment check is performed again here.
    // A student cannot download a file just by guessing its ID.
    const result = await query(
      `SELECT
         m.id,
         m.public_id,
         m.original_filename
       FROM professor_course_materials m
       JOIN course_sections cs ON cs.id = m.section_id
       JOIN academic_terms at ON at.id = cs.term_id
       JOIN enrollments e ON e.section_id = cs.id
       JOIN students s ON s.id = e.student_id
       WHERE m.id = $1
         AND s.user_id = $2
         AND e.status = 'ENROLLED'
         AND at.is_active = TRUE
       LIMIT 1`,
      [materialId, userId]
    )

    if (!result.rows.length) {
      return res.status(404).json({
        message: 'Material not found or you do not have access to it.',
      })
    }

    const material = result.rows[0]

    const downloadUrl = cloudinary.utils.private_download_url(
      material.public_id,
      'pdf',
      {
        resource_type: 'raw',
        type: 'authenticated',
        attachment: true,
        expires_at: Math.floor(Date.now() / 1000) + 300,
      }
    )

    return res.redirect(302, downloadUrl)
  } catch (error) {
    next(error)
  }
}
