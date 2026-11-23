
import { Router } from 'express'
import {
  getSecretaryRequests,
  reviewSecretaryRequest,
} from '../controllers/secretaryRequestController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('SECRETARY', 'ADMIN'))

router.get('/', getSecretaryRequests)

router.patch(
  '/:requestType/:requestId/review',
  reviewSecretaryRequest
)

export default router
