
import { Router } from 'express'

import {
  getStudentDashboard,
} from '../controllers/studentController.js'
import {
  getStudentSectionMaterials,
  downloadStudentMaterial,
} from '../controllers/studentMaterialController.js'
import { getStudentSchedule } from '../controllers/studentScheduleController.js'
import {
  getMyCurrentTermGrades,
} from '../controllers/studentGradeController.js'
import {
  getStudentAttendanceSummary,
  getStudentSectionAttendance,
} from '../controllers/studentAttendanceController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()
router.use(protect, authorize('STUDENT'))

// Get authenticated student's dashboard
router.get(
  '/dashboard',
 
  getStudentDashboard
)
router.get(
  '/sections/:sectionId/materials',
  getStudentSectionMaterials
)

router.get(
  '/materials/:materialId/download',
  downloadStudentMaterial
)
router.get('/schedule', getStudentSchedule)
router.get('/grades/current-term', getMyCurrentTermGrades)
router.get('/attendance', getStudentAttendanceSummary)

router.get(
  '/attendance/sections/:sectionId',
  getStudentSectionAttendance
)
export default router
