
import { Router } from 'express'

import {
  getSecretaryNotifications,
} from '../controllers/secretaryNotificationController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('SECRETARY', 'ADMIN'))

router.get('/', getSecretaryNotifications)

export default router
