
import { Router } from 'express'
import {
  getSecretarySections,
  getSecretarySectionDetails,
  getSecretarySectionTerms,
} from '../controllers/secretarySectionController.js'
import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('SECRETARY', 'ADMIN'))

router.get('/terms', getSecretarySectionTerms)
router.get('/', getSecretarySections)
router.get('/:sectionId', getSecretarySectionDetails)

export default router
