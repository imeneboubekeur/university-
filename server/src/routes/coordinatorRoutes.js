
import { Router } from 'express'
import { getCoordinatorDashboard } from '../controllers/coordinatorController.js'
import {
  getCoordinatorStudents,
} from '../controllers/coordinatorStudentController.js'
import {
  getCoordinatorProfessors,
} from '../controllers/coordinatorProfessorController.js'
import { getCoordinatorCourses } from '../controllers/coordinatorCourseController.js'
import {
  getCoordinatorQuotas,
  updateCoordinatorCourseQuota,
  updateCoordinatorSectionQuota
} from '../controllers/coordinatorQuotaController.js'

import {
  getCoordinatorRequests,
  reviewRegistrationRequest,
  reviewSectionChangeRequest,
} from '../controllers/coordinatorRequestController.js'
import { getCoordinatorReports } from '../controllers/coordinatorReportController.js'

import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(
  protect,
  authorize('DEPARTMENT_COORDINATOR')
)

router.get('/dashboard', getCoordinatorDashboard)
router.get('/students', getCoordinatorStudents)
router.get('/professors', getCoordinatorProfessors)
router.get('/courses', getCoordinatorCourses)
router.get('/quotas', getCoordinatorQuotas)

router.put(
  '/quotas/course/:courseDepartmentId',
  updateCoordinatorCourseQuota
)

router.put(
  '/quotas/section/:sectionId',
  updateCoordinatorSectionQuota
)

router.get('/requests', getCoordinatorRequests)

router.patch(
  '/requests/registration/:requestId',
  reviewRegistrationRequest
)

router.patch(
  '/requests/section-change/:requestId',
  reviewSectionChangeRequest
)
router.get('/reports', getCoordinatorReports)
export default router
