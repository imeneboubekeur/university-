import { Router } from 'express'

import {
  getAdminUsers,
  createAdminUser,
  updateAdminUserStatus,
  getAdminDepartments,
} from '../controllers/adminUserController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('ADMIN','SECRETARY'))

router.get('/departments', getAdminDepartments)
router.get('/', getAdminUsers)
router.post('/', createAdminUser)
router.patch('/:userId/status', updateAdminUserStatus)

export default router