
import { Router } from 'express'
import {
  getMyTranscripts,
  getMyTranscriptById,
} from '../controllers/transcriptController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('STUDENT'))

router.get('/', getMyTranscripts)
router.get('/:transcriptId', getMyTranscriptById)

export default router
