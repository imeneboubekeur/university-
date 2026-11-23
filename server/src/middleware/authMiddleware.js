
import { verifyToken } from '../utils/jwt.js'
import { query } from '../config/database.js'

export async function protect(req, res, next) {
  try {
    const token = req.cookies?.token

    if (!token) {
      return res.status(401).json({
        message: 'Authentication required.',
      })
    }

    const payload = await verifyToken(token)

    const result = await query(
      `SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        image_url,
        is_active
      FROM users
      WHERE id = $1`,
      [payload.sub]
    )

    const user = result.rows[0]

    if (!user || !user.is_active) {
      return res.status(401).json({
        message: 'Your account is unavailable.',
      })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired authentication token.',
    })
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'You do not have permission to access this resource.',
      })
    }

    next()
  }
}
