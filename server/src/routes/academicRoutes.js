
import { Router } from 'express'
import { getAcademicStructure } from '../controllers/academicController.js'

const router = Router()

router.get('/structure', getAcademicStructure)

export default router
