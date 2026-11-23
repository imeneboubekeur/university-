
import { Router } from 'express'

import {
  searchStudents,
  getSecretaryTerms,
  getTranscriptPreview,
  createTranscriptDraft,
  issueTranscript,
} from '../controllers/secretaryController.js'

import {
  protect,
  authorize,
} from '../middleware/authMiddleware.js'

const router = Router()

router.use(
  protect,
  authorize('SECRETARY', 'ADMIN')
)

router.get('/students', searchStudents)
router.get('/terms', getSecretaryTerms)

router.get(
  '/students/:studentId/transcript-preview',
  getTranscriptPreview
)

router.post(
  '/transcripts/drafts',
  createTranscriptDraft
)

router.patch(
  '/transcripts/:transcriptId/issue',
  issueTranscript
)

export default router
