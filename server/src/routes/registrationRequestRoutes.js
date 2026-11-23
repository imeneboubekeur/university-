
import { Router } from 'express'
import {
  getMyRegistrationRequests,
  createDropRequest,
  cancelRegistrationRequest,
} from '../controllers/registrationRequestController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('STUDENT'))

router.get('/', getMyRegistrationRequests)
router.post('/drop', createDropRequest)
router.patch('/:requestId/cancel', cancelRegistrationRequest)

export default router
