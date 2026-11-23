import { Router } from 'express'
import multer from 'multer'

import {
  getProfile,
  updateProfile,
  updatePassword,
  updateProfilePhoto,
} from '../controllers/profileController.js'

import { protect } from '../middleware/authMiddleware.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed.'))
    }

    cb(null, true)
  },
})

router.use(protect)

router.get('/', getProfile)
router.patch('/', updateProfile)
router.patch('/password', updatePassword)
router.patch('/photo', upload.single('profilePicture'), updateProfilePhoto)

export default router