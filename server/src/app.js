
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/authRoutes.js'
import academicRoutes from './routes/academicRoutes.js'
import studentRoutes from './routes/studentRoutes.js'
import courseRegistrationRoutes from './routes/courseRegistrationRoutes.js'
import registrationRequestRoutes from './routes/registrationRequestRoutes.js'
import sectionChangeRoutes from './routes/sectionChangeRoutes.js'
import transcriptRoutes from './routes/transcriptRoutes.js'
import secretaryRoutes from './routes/secretaryRoutes.js'
import secretaryRequestRoutes from './routes/secretaryRequestRoutes.js'
import secretarySectionRoutes from './routes/secretarySectionRoutes.js'
import secretaryCalendarRoutes from './routes/secretaryCalendarRoutes.js'
import secretaryNotificationRoutes from './routes/secretaryNotificationRoutes.js'
import adminUserRoutes from './routes/adminUserRoutes.js'
import adminFacultyRoutes from './routes/adminFacultyRoutes.js'
import adminTermRoutes from './routes/adminTermRoutes.js'
import adminCourseRoutes from './routes/adminCourseRoutes.js'
import adminCurriculumRoutes from './routes/adminCurriculumRoutes.js'
import adminSectionRoutes from './routes/adminSectionRoutes.js'
import professorRoutes from './routes/professorRoutes.js'
import coordinatorRoutes from './routes/coordinatorRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import departmentCoordinatorScheduleRoutes from './routes/departmentCoordinatorScheduleRoutes.js'
import secretaryTranscriptRoutes from './routes/secretaryTranscriptRoutes.js'
import attendanceRoutes from './routes/attendanceRoutes.js'

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'University Platform API is running.',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/academic', academicRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/student/courses', courseRegistrationRoutes)
app.use('/api/student/registration-requests', registrationRequestRoutes)
app.use('/api/student/section-changes', sectionChangeRoutes)
app.use('/api/student/transcripts', transcriptRoutes)
app.use('/api/secretary', secretaryRoutes)
app.use('/api/secretary/requests', secretaryRequestRoutes)
app.use('/api/secretary/sections', secretarySectionRoutes)
app.use('/api/secretary/calendar', secretaryCalendarRoutes)
app.use('/api/secretary/notifications', secretaryNotificationRoutes)
app.use('/api/secretary/transcripts', secretaryTranscriptRoutes)
app.use('/api/admin/users', adminUserRoutes)
app.use('/api/admin/faculties', adminFacultyRoutes)
app.use('/api/admin/terms', adminTermRoutes)
app.use('/api/admin/courses', adminCourseRoutes)
app.use('/api/admin/curriculum', adminCurriculumRoutes)
app.use('/api/admin/sections', adminSectionRoutes)
app.use('/api/professor', professorRoutes)
app.use('/api/professor/attendance', attendanceRoutes)
app.use('/api/coordinator', coordinatorRoutes)
app.use(
  '/api/department-coordinator/schedule',
  departmentCoordinatorScheduleRoutes
)
app.use('/api/profile', profileRoutes)

app.use((error, req, res, next) => {
  console.error(error)

  res.status(error.status || 500).json({
    message: error.status
      ? error.message
      : 'Internal server error.',
  })
})

export default app
 