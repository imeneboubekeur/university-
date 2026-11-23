
import { Router } from 'express'
import {
  getAdminTerms,
  createAdminTerm,
  updateAdminTerm,
} from '../controllers/adminTermController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('ADMIN'))

router.get('/', getAdminTerms)
router.post('/', createAdminTerm)
router.patch('/:termId', updateAdminTerm)

export default router
