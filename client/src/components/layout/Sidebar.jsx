
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  FileText,
  FileCheck,
  ArrowLeftRight,
  Users,
  GraduationCap,
  CalendarDays,
  Building2,
  DoorOpen,
  ClipboardCheck,
  Settings,
  FolderOpen,
  Bell,
  Award,
  ChartNoAxesCombined,
  UserRound,
  ScrollText,
  ShieldCheck,
  X,
  BookOpenCheck,
  
} from 'lucide-react'

const navigation = {
  STUDENT: [
    {
      section: 'MAIN MENU',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Course Registration', path: '/course-registration', icon: BookOpen },
        { label: 'My Schedule',path: '/student/schedule',icon: CalendarDays},
        { label: 'My Grades',path: '/student/grades',icon: Award},
        { label: 'Add/Drop Requests', path: '/registration-requests', icon: ClipboardList },
        { label: 'Section Change', path: '/section-change-requests', icon: ArrowLeftRight },
        { label: 'Official Transcript', path: '/official-transcript', icon: FileText },
        { label: 'Attendance', path: '/student/attendance', icon: ClipboardCheck,},
        {
  label: 'Profile & Settings',
  path: '/profile',
  icon: UserRound,
}
      ],
    },
  ],

  SECRETARY: [
    {
      section: 'SECRETARY WORKSPACE',
      items: [
        { label: 'Dashboard', path: '/secretary/dashboard', icon: LayoutDashboard },
        { label: 'Student Records', path: '/secretary/students', icon: Users },
        { label: 'Transcript Issuance', path: '/secretary/transcripts', icon: FileCheck },
        { label: 'Pending Requests & Adds', path: '/secretary/requests', icon: ClipboardCheck },
        { label: 'Room & Section Management', path: '/secretary/sections', icon: DoorOpen },
        {
  label: 'Profile & Settings',
  path: '/profile',
  icon: UserRound,
}
      ],
    },
    {
      section: 'UNIVERSITY SERVICES',
      items: [
        { label: 'Academic Calendar', path: '/secretary/calendar', icon: CalendarDays },
        { label: 'Document Archive', path: '/secretary/documents', icon: FolderOpen },
        { label: 'Notifications', path: '/secretary/notifications', icon: Bell },
      ],
    },
  ],

  PROFESSOR: [
    {
      section: 'TEACHING',
      items: [
        { label: 'Dashboard', path: '/professor/dashboard', icon: LayoutDashboard },
        { label: 'My Courses', path: '/professor/courses', icon: BookOpen },
        { label: 'My Students', path: '/professor/students', icon: Users },
        { label: 'Assessments', path: '/professor/assessments', icon: ClipboardList },
        { label: 'Grade Management', path: '/professor/grades', icon: FileCheck },
        { label: 'Schedule', path: '/professor/schedule', icon: CalendarDays },
        { label: 'Attendance', path: '/professor/attendance', icon: ClipboardCheck },
        {
  label: 'Profile & Settings',
  path: '/profile',
  icon: UserRound,
}
      ],
    },
  ],

  DEPARTMENT_COORDINATOR: [
    {
      section: 'DEPARTMENT',
      items: [
        { label: 'Dashboard', path: '/coordinator/dashboard', icon: LayoutDashboard },
        { label: 'Students', path: '/coordinator/students', icon: Users },
        { label: 'Professors', path: '/coordinator/professors', icon: GraduationCap },
        { label: 'Course Management', path: '/coordinator/courses', icon: BookOpen },
        { label: 'Course Quotas', path: '/coordinator/quotas', icon: ChartNoAxesCombined },
        { label: 'Schedule Management',path: '/coordinator/schedule',icon: CalendarDays,
},
        { label: 'Registration Requests', path: '/coordinator/requests', icon: ClipboardCheck },
        { label: 'Academic Reports', path: '/coordinator/reports', icon: ScrollText },
        {
  label: 'Profile & Settings',
  path: '/profile',
  icon: UserRound,
}
      ],
    },
  ],

  ADMIN: [
    {
      section: 'ADMINISTRATION',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'User Management', path: '/admin/users', icon: Users },
        { label: 'Faculties', path: '/admin/faculties', icon: Building2 },
        { label: 'Departments', path: '/admin/departments', icon: GraduationCap },
        { label: 'Academic Terms', path: '/admin/terms', icon: CalendarDays },
        { label: 'Courses', path: '/admin/courses', icon: BookOpen },
        { label: 'Transcript Management', path: '/secretary/transcripts', icon: FileCheck },
        { label: 'System Settings', path: '/admin/settings', icon: Settings },
        { label: 'Curriculum' , path: '/admin/curriculum', icon: BookOpenCheck},
        { label: 'Section Management',path: '/admin/sections',icon: BookOpen},
        {
  label: 'Profile & Settings',
  path: '/profile',
  icon: UserRound,
}
      ],
    },
  ],
}

function getRoleLabel(role) {
  const labels = {
    STUDENT: 'Student Portal',
    PROFESSOR: 'Professor Portal',
    DEPARTMENT_COORDINATOR: 'Department Workspace',
    SECRETARY: 'Secretary Workspace',
    ADMIN: 'Administration',
  }

  return labels[role] || 'University Portal'
}

export default function Sidebar({
  userRole,
  mobile = false,
  onNavigate,
  onClose,
}) {
  const roleNavigation = navigation[userRole] || []

  return (
    <aside
      className={`flex h-full w-64 shrink-0 flex-col border-r border-[#E7E3DF] bg-white ${
        mobile ? 'w-full' : ''
      }`}
    >
      {/* Brand */}
      <div className="flex h-16 min-h-16 items-center justify-between border-b border-[#E7E3DF] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F4156] text-white">
            <GraduationCap size={21} />
          </div>

          <div>
            <h1 className="text-base font-bold tracking-tight text-[#2F4156]">
              UnivAdmin Pro
            </h1>
            <p className="text-[10px] font-medium text-[#718096]">
              Academic Management
            </p>
          </div>
        </div>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-[#718096] hover:bg-[#F5EFEB]"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Role indicator */}
      <div className="mx-4 mt-5 rounded-xl bg-[#F5EFEB] px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#CBD9E6] text-[#2F4156]">
            <UserRound size={17} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#2F4156]">
              {getRoleLabel(userRole)}
            </p>
            <p className="text-[10px] text-[#718096]">
              Academic Management Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {roleNavigation.map((group) => (
          <div key={group.section}>
            <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.13em] text-[#A0AEC0]">
              {group.section}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon

                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    end={
                      item.path === '/dashboard' ||
                      item.path.endsWith('/dashboard')
                    }
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                        isActive
                          ? 'bg-[#2F4156] text-white shadow-sm'
                          : 'text-[#536579] hover:bg-[#F5EFEB] hover:text-[#2F4156]'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#E7E3DF] p-4">
        <div className="flex items-center gap-2 rounded-xl bg-[#F5EFEB] px-3 py-3">
          <ShieldCheck size={17} className="text-[#567CBD]" />
          <div>
            <p className="text-xs font-semibold text-[#2F4156]">
              Secure Workspace
            </p>
            <p className="text-[10px] text-[#718096]">
              Authorized access only
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
