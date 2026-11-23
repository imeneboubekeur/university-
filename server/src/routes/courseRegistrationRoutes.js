
import { Router } from 'express'

import {
  getCourseCatalog,
  getMyCourses,
  createCourseRegistrationRequest,
} from '../controllers/courseRegistrationController.js'
import {
  getStudentSectionMaterials,
  downloadStudentMaterial,
} from '../controllers/studentMaterialController.js'
import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('STUDENT'))

router.get('/catalog', getCourseCatalog)
router.get('/my-courses', getMyCourses)
router.post('/requests', createCourseRegistrationRequest)
router.get(
  '/sections/:sectionId/materials',
  getStudentSectionMaterials
)

router.get(
  '/materials/:materialId/download',
  downloadStudentMaterial
)

export default router
