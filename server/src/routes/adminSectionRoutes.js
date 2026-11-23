
import { Router } from 'express'

import {
  getAdminSectionOptions,
  getAdminSections,
  getAdminSectionDetails,
  createAdminSection,
  updateAdminSection,
  getCourseDepartmentQuotas,
  saveCourseDepartmentQuotas
} from '../controllers/adminSectionController.js'

import {
  protect,
  authorize
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('ADMIN'))

router.get('/options', getAdminSectionOptions)
router.get('/course-quotas', getCourseDepartmentQuotas)
router.put('/course-quotas', saveCourseDepartmentQuotas)

router.get('/', getAdminSections)
router.post('/', createAdminSection)

router.get('/:sectionId', getAdminSectionDetails)
router.patch('/:sectionId', updateAdminSection)

export default router
