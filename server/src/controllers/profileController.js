
import bcrypt from 'bcryptjs'
import { query } from '../config/database.js'
import { Readable } from 'node:stream'
import cloudinary from '../config/cloudinary.js'
// GET /api/profile
export async function getProfile(req, res, next) {
  try {
    const userId = req.user.id

    const userResult = await query(
      `SELECT
         id,
         email,
         first_name,
         last_name,
         phone,
         image_url,
         role,
         is_active,
         created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const user = userResult.rows[0]
    let roleDetails = {}

    if (user.role === 'STUDENT') {
      const result = await query(
        `SELECT
           s.student_number,
           s.enrollment_year,
           s.year_level,
           s.status,
           d.id AS department_id,
           d.name AS department_name,
           d.code AS department_code,
           f.name AS faculty_name
         FROM students s
         JOIN departments d ON d.id = s.department_id
         JOIN faculties f ON f.id = d.faculty_id
         WHERE s.user_id = $1
         LIMIT 1`,
        [userId]
      )

      roleDetails = result.rows[0] || {}
    }

    if (user.role === 'PROFESSOR') {
      const result = await query(
        `SELECT
           p.employee_number,
           p.academic_title,
           d.id AS department_id,
           d.name AS department_name,
           d.code AS department_code,
           f.name AS faculty_name
         FROM professors p
         JOIN departments d ON d.id = p.department_id
         JOIN faculties f ON f.id = d.faculty_id
         WHERE p.user_id = $1
         LIMIT 1`,
        [userId]
      )

      roleDetails = result.rows[0] || {}
    }

    if (user.role === 'DEPARTMENT_COORDINATOR') {
      const result = await query(
        `SELECT
           d.id AS department_id,
           d.name AS department_name,
           d.code AS department_code,
           f.name AS faculty_name
         FROM department_coordinators dc
         JOIN departments d ON d.id = dc.department_id
         JOIN faculties f ON f.id = d.faculty_id
         WHERE dc.user_id = $1
         LIMIT 1`,
        [userId]
      )

      roleDetails = result.rows[0] || {}
    }

    res.json({
      profile: {
        ...user,
        ...roleDetails,
      },
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/profile
export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id
    const { first_name, last_name, phone } = req.body

    if (
      typeof first_name !== 'string' ||
      typeof last_name !== 'string' ||
      !first_name.trim() ||
      !last_name.trim()
    ) {
      return res.status(400).json({
        message: 'First name and last name are required.',
      })
    }

    if (
      phone !== undefined &&
      phone !== null &&
      typeof phone !== 'string'
    ) {
      return res.status(400).json({
        message: 'Phone number must be a valid string.',
      })
    }

    const result = await query(
      `UPDATE users
       SET
         first_name = $1,
         last_name = $2,
         phone = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING
         id,
         email,
         first_name,
         last_name,
         phone,
         image_url,
         role,
         is_active`,
      [
        first_name.trim(),
        last_name.trim(),
        phone?.trim() || null,
        userId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' })
    }

    res.json({
      message: 'Profile updated successfully.',
      profile: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}

// PATCH /api/profile/password
export async function updatePassword(req, res, next) {
  try {
    const userId = req.user.id
    const { currentPassword, newPassword, confirmPassword } = req.body

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: 'Please complete all password fields.',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'The new password must contain at least 8 characters.',
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: 'The new passwords do not match.',
      })
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: 'Your new password must be different from your current password.',
      })
    }

    const userResult = await query(
      `SELECT password_hash
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' })
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      userResult.rows[0].password_hash
    )

    if (!passwordMatches) {
      return res.status(400).json({
        message: 'Your current password is incorrect.',
      })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, userId]
    )

    res.json({
      message: 'Password changed successfully.',
    })
  } catch (error) {
    next(error)
  }
}
// PATCH /api/profile/photo
export async function updateProfilePhoto(req, res, next) {
  try {
    const userId = req.user.id

    if (!req.file) {
      return res.status(400).json({
        message: 'Please select a profile picture.',
      })
    }

    // Upload the image to Cloudinary
    const uploadedImage = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'profile-images',
          resource_type: 'image',
          transformation: [
            {
              width: 600,
              height: 600,
              crop: 'fill',
              gravity: 'face',
            },
            {
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error) {
            return reject(error)
          }

          resolve(result)
        }
      )

      Readable.from(req.file.buffer).pipe(uploadStream)
    })

    // Save the Cloudinary URL in PostgreSQL
    const result = await query(
      `UPDATE users
       SET image_url = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING
         id,
         email,
         first_name,
         last_name,
         phone,
         image_url,
         role,
         is_active`,
      [uploadedImage.secure_url, userId]
    )

    if (!result.rows.length) {
      return res.status(404).json({
        message: 'User not found.',
      })
    }

    return res.status(200).json({
      message: 'Profile picture updated successfully.',
      profile: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}
