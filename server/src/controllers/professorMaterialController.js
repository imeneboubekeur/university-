
import cloudinary from '../config/cloudinary.js'
import { query } from '../config/database.js'
import { generateId } from '../utils/generateId.js'
async function getProfessorId(userId) {
  const result = await query(
    `SELECT id
     FROM professors
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  )

  return result.rows[0]?.id || null
}

async function getOwnedActiveSection(sectionId, professorId) {
  const result = await query(
    `SELECT cs.id
     FROM course_sections cs
     JOIN academic_terms at ON at.id = cs.term_id
     WHERE cs.id = $1
       AND cs.instructor_id = $2
       AND at.is_active = TRUE
     LIMIT 1`,
    [sectionId, professorId]
  )

  return result.rows[0] || null
}

function createDownloadUrl(publicId) {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    flags: 'attachment',
  })
}

// GET /api/professor/sections/:sectionId/materials
export async function getSectionMaterials(req, res, next) {
  try {
    const professorId = await getProfessorId(req.user.id)

    if (!professorId) {
      return res.status(404).json({
        message: 'Professor profile not found.',
      })
    }

    const section = await getOwnedActiveSection(
      req.params.sectionId,
      professorId
    )

    if (!section) {
      return res.status(403).json({
        message: 'You do not have access to this section.',
      })
    }

    const result = await query(
      `SELECT
         id,
         title,
         original_filename,
         file_size_bytes,
         created_at,
         public_id
       FROM professor_course_materials
       WHERE section_id = $1
         AND professor_id = $2
       ORDER BY created_at DESC`,
      [req.params.sectionId, professorId]
    )

    const materials = result.rows.map((material) => ({
      id: material.id,
      title: material.title,
      originalFilename: material.original_filename,
      fileSizeBytes: Number(material.file_size_bytes),
      createdAt: material.created_at,
      downloadUrl: createDownloadUrl(material.public_id),
    }))

    return res.json({ materials })
  } catch (error) {
    next(error)
  }
}

// POST /api/professor/sections/:sectionId/materials
export async function uploadSectionMaterial(req, res, next) {
  let uploadedPublicId = null

  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please select a PDF file.',
      })
    }

    // Validate the actual PDF signature.
    const pdfSignature = req.file.buffer
      .subarray(0, 5)
      .toString('ascii')

    if (pdfSignature !== '%PDF-') {
      return res.status(400).json({
        message: 'The uploaded file is not a valid PDF.',
      })
    }

    const professorId = await getProfessorId(req.user.id)

    if (!professorId) {
      return res.status(404).json({
        message: 'Professor profile not found.',
      })
    }

    const section = await getOwnedActiveSection(
      req.params.sectionId,
      professorId
    )

    if (!section) {
      return res.status(403).json({
        message: 'You can only upload materials to your own sections in the active term.',
      })
    }

    const materialId = generateId()
    const originalFilename = req.file.originalname
      .replace(/[\\/]/g, '_')
      .slice(0, 255)

    const title =
      typeof req.body.title === 'string' && req.body.title.trim()
        ? req.body.title.trim().slice(0, 255)
        : originalFilename.replace(/\.pdf$/i, '')

    const publicId = `course-materials/${req.params.sectionId}/${materialId}.pdf`

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          type: 'authenticated',
          access_mode: 'authenticated',
          public_id: publicId,
          overwrite: false,
          use_filename: false,
        },
        (error, result) => {
          if (error) return reject(error)
          resolve(result)
        }
      )

      stream.end(req.file.buffer)
    })

    uploadedPublicId = uploadResult.public_id

    const saved = await query(
      `INSERT INTO professor_course_materials (
         id,
         section_id,
         professor_id,
         title,
         original_filename,
         public_id,
         file_size_bytes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         title,
         original_filename,
         file_size_bytes,
         created_at,
         public_id`,
      [
        materialId,
        req.params.sectionId,
        professorId,
        title,
        originalFilename,
        uploadedPublicId,
        req.file.size,
      ]
    )

    const material = saved.rows[0]

    return res.status(201).json({
      message: 'PDF uploaded successfully.',
      material: {
        id: material.id,
        title: material.title,
        originalFilename: material.original_filename,
        fileSizeBytes: Number(material.file_size_bytes),
        createdAt: material.created_at,
        downloadUrl: createDownloadUrl(material.public_id),
      },
    })
  } catch (error) {
    // Remove the Cloudinary file if saving its database record failed.
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: 'raw',
          type: 'authenticated',
          invalidate: true,
        })
      } catch (cleanupError) {
        console.error('Cloudinary cleanup failed:', cleanupError)
      }
    }

    next(error)
  }
}

// DELETE /api/professor/sections/:sectionId/materials/:materialId
export async function deleteSectionMaterial(req, res, next) {
  try {
    const professorId = await getProfessorId(req.user.id)

    if (!professorId) {
      return res.status(404).json({
        message: 'Professor profile not found.',
      })
    }

    const section = await getOwnedActiveSection(
      req.params.sectionId,
      professorId
    )

    if (!section) {
      return res.status(403).json({
        message: 'You do not have access to this section.',
      })
    }

    const materialResult = await query(
      `SELECT id, public_id
       FROM professor_course_materials
       WHERE id = $1
         AND section_id = $2
         AND professor_id = $3
       LIMIT 1`,
      [
        req.params.materialId,
        req.params.sectionId,
        professorId,
      ]
    )

    if (materialResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Course material not found.',
      })
    }

    const material = materialResult.rows[0]

    await cloudinary.uploader.destroy(material.public_id, {
      resource_type: 'raw',
      type: 'authenticated',
      invalidate: true,
    })

    await query(
      `DELETE FROM professor_course_materials
       WHERE id = $1
         AND section_id = $2
         AND professor_id = $3`,
      [
        material.id,
        req.params.sectionId,
        professorId,
      ]
    )

    return res.json({
      message: 'Course material deleted successfully.',
    })
  } catch (error) {
    next(error)
  }
}
