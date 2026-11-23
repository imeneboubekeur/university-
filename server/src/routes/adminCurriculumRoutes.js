
import { Router } from 'express'

import {
  getAdminCurriculum,
  getCurriculumDepartments,
  getAvailableCurriculumCourses,
  addCurriculumCourse,
  updateCurriculumStatus
} from '../controllers/adminCurriculumController.js'

import {
  protect,
  authorize
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('ADMIN'))

router.get('/departments', getCurriculumDepartments)
router.get('/available-courses', getAvailableCurriculumCourses)
router.get('/', getAdminCurriculum)

router.post('/', addCurriculumCourse)
router.patch('/:assignmentId/status', updateCurriculumStatus)

export default router
