
import { Router } from 'express'
import {
  getAdminCourses,
  getAdminCourseDepartments,
  createAdminCourse,
  updateAdminCourse,
  updateAdminCourseStatus,
} from '../controllers/adminCourseController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('ADMIN'))

// Specific routes must come before /:courseId routes.
router.get('/departments', getAdminCourseDepartments)

router.get('/', getAdminCourses)
router.post('/', createAdminCourse)
router.patch('/:courseId/status', updateAdminCourseStatus)
router.patch('/:courseId', updateAdminCourse)

export default router
