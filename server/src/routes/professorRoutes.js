
import { Router } from 'express'
import { getProfessorDashboard } from '../controllers/professorController.js'
import { getProfessorCourses } from '../controllers/professorCourseController.js'
import { getProfessorStudents } from '../controllers/professorStudentController.js'
import {
  getProfessorAssessments,
  createProfessorAssessment,
  updateProfessorAssessment,
  deleteProfessorAssessment,
} from '../controllers/professorAssessmentController.js'
import {
  getProfessorGradebook,
  saveProfessorGrades,
  submitProfessorGrades,
} from '../controllers/professorGradeController.js'
import { getProfessorSchedule } from '../controllers/professorScheduleController.js'
import {
  getSectionMaterials,
  uploadSectionMaterial,
  deleteSectionMaterial,
} from '../controllers/professorMaterialController.js'

import pdfUpload from '../middleware/pdfUpload.js'

import { protect, authorize } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect, authorize('PROFESSOR'))

router.get('/dashboard', getProfessorDashboard)
router.get('/courses', getProfessorCourses)
router.get('/students', getProfessorStudents)
router.get('/assessments', getProfessorAssessments)
router.post('/assessments', createProfessorAssessment)
router.patch('/assessments/:assessmentId', updateProfessorAssessment)
router.delete('/assessments/:assessmentId', deleteProfessorAssessment)
router.get('/grades', getProfessorGradebook)
router.post('/grades/save', saveProfessorGrades)
router.post('/grades/submit', submitProfessorGrades)
router.get('/schedule', getProfessorSchedule)
router.get(
  '/sections/:sectionId/materials',
  getSectionMaterials
)

router.post(
  '/sections/:sectionId/materials',
  pdfUpload.single('file'),
  uploadSectionMaterial
)

router.delete(
  '/sections/:sectionId/materials/:materialId',
  deleteSectionMaterial
)
export default router
