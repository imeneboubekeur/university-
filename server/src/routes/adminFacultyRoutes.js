import { Router } from 'express'
import {
  getAdminFaculties,
  createAdminFaculty,
  updateAdminFaculty,
  createAdminDepartment,
  updateAdminDepartment,
} from '../controllers/adminFacultyController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('ADMIN'))

router.get('/', getAdminFaculties)
router.post('/', createAdminFaculty)

// Keep this route before /:facultyId to avoid route matching conflicts.
router.patch('/departments/:departmentId', updateAdminDepartment)

router.post('/:facultyId/departments', createAdminDepartment)
router.patch('/:facultyId', updateAdminFaculty)

export default router