
import { useEffect, useState } from 'react'
import {
  BookOpen,
  Search,
  GraduationCap,
  Layers,
  CalendarDays,
  Users,
  RefreshCw,
  BookMarked,
  Clock,
  CircleCheck,
  CircleAlert
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const requirementLabels = {
  REQUIRED: 'Required',
  ELECTIVE: 'Elective',
  FREE_ELECTIVE: 'Free Elective'
}

const requirementStyles = {
  REQUIRED: 'bg-blue-50 text-blue-700 border-blue-100',
  ELECTIVE: 'bg-purple-50 text-purple-700 border-purple-100',
  FREE_ELECTIVE: 'bg-amber-50 text-amber-700 border-amber-100'
}

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-[#2F4156]">
            {value}
          </h3>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>

        <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

export default function CoordinatorCourses() {
  const [courses, setCourses] = useState([])
  const [department, setDepartment] = useState(null)
  const [activeTerm, setActiveTerm] = useState(null)
  const [statistics, setStatistics] = useState({})
  const [search, setSearch] = useState('')
  const [requirement, setRequirement] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchCourses() {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        search,
        requirement
      })

      const response = await fetch(
        `${API_URL}/coordinator/courses?${params.toString()}`,
        {
          method: 'GET',
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load courses.')
      }

      setCourses(data.courses || [])
      setDepartment(data.department || null)
      setActiveTerm(data.activeTerm || null)
      setStatistics(data.statistics || {})
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCourses()
    }, 300)

    return () => clearTimeout(timeout)
  }, [search, requirement])

  function formatSemester(semester) {
    if (semester === 1) return 'Fall'
    if (semester === 2) return 'Spring'
    return `Semester ${semester}`
  }

  return (
    <div className="space-y-7">

      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <BookOpen size={15} />
            <span>Coordinator</span>
            <span>/</span>
            <span>Courses</span>
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156]">
            Courses Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and monitor the courses assigned to your department.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCourses}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7E3DF] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Department information */}
      {department && (
        <div className="rounded-2xl border border-[#DCE5ED] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
                <GraduationCap size={23} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Your Department
                </p>
                <h2 className="mt-1 font-semibold text-[#2F4156]">
                  {department.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {department.code} · {department.faculty_name}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F5EFEB] px-4 py-3">
              <p className="text-xs text-gray-500">Active Academic Term</p>
              <p className="mt-1 text-sm font-semibold text-[#2F4156]">
                {activeTerm
                  ? `${activeTerm.name} · ${activeTerm.academic_year}`
                  : 'No active term'}
              </p>
              {activeTerm && (
                <p className="mt-1 text-xs text-gray-500">
                  {formatSemester(activeTerm.semester)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Courses"
          value={statistics.totalCourses ?? 0}
          description="Available department courses"
          icon={BookOpen}
        />

        <StatCard
          title="Required Courses"
          value={statistics.requiredCourses ?? 0}
          description="Mandatory curriculum courses"
          icon={BookMarked}
        />

        <StatCard
          title="Elective Courses"
          value={
            (statistics.electiveCourses || 0) +
            (statistics.freeElectiveCourses || 0)
          }
          description="Elective and free elective"
          icon={Layers}
        />

        <StatCard
          title="Open Sections"
          value={statistics.openSections ?? 0}
          description={`${statistics.totalSections ?? 0} total sections`}
          icon={Users}
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[#2F4156]">
              Department Course Catalogue
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Courses assigned to your department.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search course or code..."
                className="w-full rounded-xl border border-[#E7E3DF] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#567CBD] sm:w-64"
              />
            </div>

            <select
              value={requirement}
              onChange={e => setRequirement(e.target.value)}
              className="rounded-xl border border-[#E7E3DF] bg-white px-4 py-2.5 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
            >
              <option value="ALL">All Requirements</option>
              <option value="REQUIRED">Required</option>
              <option value="ELECTIVE">Elective</option>
              <option value="FREE_ELECTIVE">Free Elective</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert size={18} />
          {error}
        </div>
      )}

      {/* Courses table */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E7E3DF] px-5 py-4">
          <div>
            <h2 className="font-semibold text-[#2F4156]">Courses</h2>
            <p className="mt-1 text-xs text-gray-400">
              {courses.length} course{courses.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <span className="rounded-lg bg-[#F5EFEB] px-3 py-1.5 text-xs font-medium text-[#567CBD]">
            Read only
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw size={17} className="animate-spin" />
              Loading courses...
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-full bg-[#F5EFEB] p-4 text-gray-400">
              <BookOpen size={28} />
            </div>
            <h3 className="mt-4 font-semibold text-[#2F4156]">
              No courses found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              No available courses match your search and selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-[#F9F8F7]">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4 font-semibold">Course</th>
                  <th className="px-5 py-4 font-semibold">Requirement</th>
                  <th className="px-5 py-4 font-semibold">Credits</th>
                  <th className="px-5 py-4 font-semibold">ECTS</th>
                  <th className="px-5 py-4 font-semibold">Curriculum Year</th>
                  <th className="px-5 py-4 font-semibold">Term Quota</th>
                  <th className="px-5 py-4 font-semibold">Sections</th>
                  <th className="px-5 py-4 font-semibold">Enrolled</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EEEC]">
                {courses.map(course => (
                  <tr
                    key={course.course_department_id}
                    className="transition hover:bg-[#FAF9F8]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#2F4156]">
                        {course.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {course.code}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          requirementStyles[course.requirement_type] ||
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {requirementLabels[course.requirement_type] ||
                          course.requirement_type}
                      </span>
                      {course.elective_group && (
                        <p className="mt-1 text-xs text-gray-400">
                          Group: {course.elective_group}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {course.credits}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {course.ects}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {course.curriculum_years?.length
                        ? course.curriculum_years
                            .map(year => `Year ${year}`)
                            .join(', ')
                        : '—'}
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-[#2F4156]">
                        {course.term_quota ?? course.default_quota ?? '—'}
                      </span>
                      <p className="mt-1 text-xs text-gray-400">
                        {course.term_quota != null
                          ? 'Current term'
                          : 'Default quota'}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#2F4156]">
                        <Layers size={15} className="text-gray-400" />
                        {course.total_sections}
                      </div>
                      <p className="mt-1 text-xs text-green-600">
                        {course.open_sections} open
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#2F4156]">
                        <Users size={15} className="text-gray-400" />
                        {course.enrolled_students}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="flex items-start gap-3 rounded-xl border border-[#DCE5ED] bg-[#CBD9E6]/20 p-4">
        <CircleCheck size={19} className="mt-0.5 shrink-0 text-[#567CBD]" />
        <div>
          <p className="text-sm font-semibold text-[#2F4156]">
            Course catalogue information
          </p>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            This page displays the courses assigned to your department.
            Course creation and general course details are managed by the
            University Administrator. Department quotas are handled in
            Quotas Management.
          </p>
        </div>
      </div>
    </div>
  )
}
