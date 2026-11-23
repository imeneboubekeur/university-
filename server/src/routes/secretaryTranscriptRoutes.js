
import { Router } from 'express'

import {
  getTranscriptStudents,
  getTranscriptTerms,
  previewTranscript,
  issueTranscript,
} from '../controllers/secretaryTranscriptController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

// Only authenticated secretaries can manage official transcripts.
router.use(protect, authorize('SECRETARY'))

router.get('/students', getTranscriptStudents)
router.get('/terms', getTranscriptTerms)
router.get('/preview', previewTranscript)
router.post('/issue', issueTranscript)

export default router
