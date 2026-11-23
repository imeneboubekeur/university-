
import { Router } from 'express'

import {
  getCoordinatorScheduleOptions,
  getCoordinatorSchedule,
  createCoordinatorMeeting,
  updateCoordinatorMeeting,
  deleteCoordinatorMeeting,
} from '../controllers/departmentCoordinatorScheduleController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('DEPARTMENT_COORDINATOR'))

router.get('/options', getCoordinatorScheduleOptions)

router.get('/', getCoordinatorSchedule)

router.post('/', createCoordinatorMeeting)

router.patch('/:meetingId', updateCoordinatorMeeting)

router.delete('/:meetingId', deleteCoordinatorMeeting)

export default router
