
import { Navigate, Route, Routes } from 'react-router-dom'

import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/student/StudentDashboard'
import CourseRegistration from './pages/student/CourseRegistration'
import RegistrationRequests from './pages/student/RegistrationRequests'
import SectionChangeRequests from './pages/student/SectionChangeRequests'
import OfficialTranscript from './pages/student/OfficialTranscript'
import SecretaryDashboard from './pages/secretary/SecretaryDashboard'
import SecretaryRequests from './pages/secretary/SecretaryRequests'
import StudentRecords from './pages/secretary/StudentRecords'
import SectionManagement from './pages/secretary/SectionManagement'
import AcademicCalendar from './pages/secretary/AcademicCalendar'
import SecretaryNotifications from './pages/secretary/SecretaryNotifications'
import UserManagement from './pages/admin/UserManagement'
import FacultyManagement from './pages/admin/FacultyManagement'
import AcademicTerms from './pages/admin/AcademicTerms'
import CourseManagement from './pages/admin/CourseManagement'
import CurriculumManagement from './pages/admin/CurriculumManagement'
import AdminSectionManagement from './pages/admin/AdminSectionManagement'
import ProfessorDashboard from './pages/professor/ProfessorDashboard'
import ProfessorCourses from './pages/professor/ProfessorCourses'
import ProfessorStudents from './pages/professor/ProfessorStudents'
import ProfessorAssessments from './pages/professor/ProfessorAssessments'
import ProfessorGrades from './pages/professor/ProfessorGrades'
import ProfessorSchedule from './pages/professor/ProfessorSchedule'
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard'
import CoordinatorStudents from './pages/coordinator/CoordinatorStudents'
import CoordinatorProfessors from './pages/coordinator/CoordinatorProfessors'
import CoordinatorCourses from './pages/coordinator/CoordinatorCourses'
import CoordinatorQuotas from './pages/coordinator/CoordinatorQuotas'
import CoordinatorRequests from './pages/coordinator/CoordinatorRequests'
import CoordinatorReports from './pages/coordinator/CoordinatorReports'
import ProfileSettings from './pages/ProfileSettings'
import CoordinatorScheduleManagement from './pages/coordinator/CoordinatorScheduleManagement'
import StudentSchedule from './pages/student/StudentSchedule'
import StudentGrades from './pages/student/StudentGrades'
import SecretaryTranscripts from './pages/secretary/SecretaryTranscripts'
import ProfessorAttendance from './pages/professor/ProfessorAttendance'
import StudentAttendance from './pages/student/StudentAttendance'
import HomePage from './pages/HomePage'

import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
<Route path="/" element={<HomePage />} />
      {/* Shared authenticated application layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route
  path="/course-registration"
  element={<CourseRegistration />}
/>
<Route
  path="/registration-requests"
  element={<RegistrationRequests />}
/>
<Route
  path="/section-change-requests"
  element={<SectionChangeRequests />}
/>
<Route
  path="/official-transcript"
  element={<OfficialTranscript />}
/>
<Route
  path="/secretary/dashboard"
  element={<SecretaryDashboard />}
/>
<Route
  path="/secretary/dashboard"
  element={<SecretaryDashboard />}
/>
<Route path="/secretary/requests" element={<SecretaryRequests />} />
<Route path="/secretary/students" element={<StudentRecords />} />
<Route path="/secretary/sections" element={<SectionManagement />} />
<Route
  path="/secretary/calendar"
  element={
  
      <AcademicCalendar />
   
  }
/>
<Route
  path="/secretary/notifications"
  element={
      <SecretaryNotifications />
  }
/>
<Route
  path="/admin/users"
  element={
   
      <UserManagement />
    
  }
/>
<Route
  path="/admin/faculties"
  element={
    
      <FacultyManagement />
    
  }
/>
<Route
  path="/admin/terms"
  element={
    
      <AcademicTerms />
    
   }
/>
<Route
  path="/admin/courses"
  element={
   
      <CourseManagement />
    
  }
/>
<Route
  path="/admin/curriculum"
  element={
    
      <CurriculumManagement />
  }
/>
<Route
  path="/admin/sections"
  element={
    
      <AdminSectionManagement  />
  }
/>
<Route
  path="/professor/dashboard"
  element={
      <ProfessorDashboard />
  }
/>
<Route
  path="/professor/courses"
  element={
    
      <ProfessorCourses />
  }
/>
<Route
  path="/professor/students"
  element={
      <ProfessorStudents />
  }
/>
<Route
  path="/professor/assessments"
  element={
      <ProfessorAssessments />
  }
/>
<Route
  path="/professor/grades"
  element={
      <ProfessorGrades />
  }
/>
<Route
  path="/professor/schedule"
  element={
      <ProfessorSchedule />
  }
/>
<Route
  path="/coordinator/dashboard"
  element={
      <CoordinatorDashboard />
  }
/>
<Route
  path="/coordinator/students"
  element={
      <CoordinatorStudents />
  }
/>
<Route
  path="/coordinator/professors"
  element={
      <CoordinatorProfessors />
  }
/>
<Route
  path="/coordinator/courses"
  element={
      <CoordinatorCourses />
  }
/>
<Route
  path="/coordinator/quotas"
  element={
      <CoordinatorQuotas />
  }
/>
<Route
  path="/coordinator/requests"
  element={
      <CoordinatorRequests />
  }
/>
<Route
  path="/coordinator/reports"
  element={
      <CoordinatorReports />
  }
/>
<Route
  path="/profile"
  element={
    
      <ProfileSettings />
  }
/>
<Route
  path="/coordinator/schedule"
  element={<CoordinatorScheduleManagement />}
/>
<Route
  path="/student/schedule"
  element={<StudentSchedule />}
/>
<Route path="/student/grades" element={<StudentGrades />} />
<Route
  path="/secretary/transcripts"
  element={
      <SecretaryTranscripts />
  }
/>
<Route
  path="/professor/attendance"
  element={<ProfessorAttendance />}
/>
<Route
  path="/student/attendance"
  element={<StudentAttendance />}
/>
      </Route>

    
    </Routes>
  )
}
