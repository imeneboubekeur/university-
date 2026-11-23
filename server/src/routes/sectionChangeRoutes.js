
import { Router } from 'express'
import {
  getSectionChangeOptions,
  getMySectionChangeRequests,
  createSectionChangeRequest,
  cancelSectionChangeRequest,
} from '../controllers/sectionChangeController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('STUDENT'))

router.get('/options', getSectionChangeOptions)
router.get('/', getMySectionChangeRequests)
router.post('/', createSectionChangeRequest)
router.patch('/:requestId/cancel', cancelSectionChangeRequest)

export default router
