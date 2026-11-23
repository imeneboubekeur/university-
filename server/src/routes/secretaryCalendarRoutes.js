
import { Router } from 'express'

import {
  getAcademicCalendar,
  createAcademicTerm,
  updateAcademicTerm,
  createRegistrationWindow,
  updateRegistrationWindowStatus,
} from '../controllers/secretaryCalendarController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('SECRETARY', 'ADMIN'))

router.get('/', getAcademicCalendar)

router.post('/terms', createAcademicTerm)
router.patch('/terms/:termId', updateAcademicTerm)

router.post('/terms/:termId/windows', createRegistrationWindow)
router.patch('/windows/:windowId', updateRegistrationWindowStatus)

export default router
