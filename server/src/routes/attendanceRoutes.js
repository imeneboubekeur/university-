import { Router } from 'express'

import {
  getProfessorAttendanceSections,
  getAttendanceStudents,
  getSectionAttendanceHistory,
  saveAttendance,
} from '../controllers/attendanceController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('PROFESSOR'))

router.get('/sections', getProfessorAttendanceSections)

router.get(
  '/sections/:sectionId/students',
  getAttendanceStudents
)

router.get(
  '/sections/:sectionId',
  getSectionAttendanceHistory
)

router.post('/', saveAttendance)

export default router