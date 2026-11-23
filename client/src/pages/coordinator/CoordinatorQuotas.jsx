
import { useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Layers,
  BookOpen,
  Users,
  Settings2,
  Save,
  CircleAlert,
  CircleCheck,
  GraduationCap
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

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

export default function CoordinatorQuotas() {
  const [courses, setCourses] = useState([])
  const [sections, setSections] = useState([])
  const [department, setDepartment] = useState(null)
  const [activeTerm, setActiveTerm] = useState(null)
  const [statistics, setStatistics] = useState({})

  const [courseDrafts, setCourseDrafts] = useState({})
  const [sectionDrafts, setSectionDrafts] = useState({})

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingCourse, setSavingCourse] = useState(null)
  const [savingSection, setSavingSection] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function fetchQuotas() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}/coordinator/quotas`,
        {
          method: 'GET',
          credentials: 'include'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load quotas.')
      }

      setCourses(data.courses || [])
      setSections(data.sections || [])
      setDepartment(data.department || null)
      setActiveTerm(data.activeTerm || null)
      setStatistics(data.statistics || {})

      const nextCourseDrafts = {}
      for (const course of data.courses || []) {
        nextCourseDrafts[course.course_department_id] =
          String(course.configured_quota ?? course.default_quota ?? 0)
      }

      const nextSectionDrafts = {}
      for (const section of data.sections || []) {
        nextSectionDrafts[section.section_id] =
          String(section.allocated_quota ?? '')
      }

      setCourseDrafts(nextCourseDrafts)
      setSectionDrafts(nextSectionDrafts)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotas()
  }, [])

  async function saveCourseQuota(course) {
    const quota = courseDrafts[course.course_department_id]

    if (quota === '' || !Number.isSafeInteger(Number(quota)) || Number(quota) < 0) {
      setError('Enter a valid non-negative whole number for the course quota.')
      return
    }

    try {
      setSavingCourse(course.course_department_id)
      setError('')
      setSuccess('')

      const response = await fetch(
        `${API_URL}/coordinator/quotas/course/${course.course_department_id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quota: Number(quota) })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update course quota.')
      }

      setSuccess(data.message)
      await fetchQuotas()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingCourse(null)
    }
  }

  async function saveSectionQuota(section) {
    const quota = sectionDrafts[section.section_id]

    if (quota === '' || !Number.isSafeInteger(Number(quota)) || Number(quota) < 0) {
      setError('Enter a valid non-negative whole number for the section quota.')
      return
    }

    try {
      setSavingSection(section.section_id)
      setError('')
      setSuccess('')

      const response = await fetch(
        `${API_URL}/coordinator/quotas/section/${section.section_id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseDepartmentId: section.course_department_id,
            quota: Number(quota)
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update section quota.')
      }

      setSuccess(data.message)
      await fetchQuotas()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingSection(null)
    }
  }

  const filteredCourses = courses.filter(course => {
    const value = search.toLowerCase()

    return (
      course.name.toLowerCase().includes(value) ||
      course.code.toLowerCase().includes(value)
    )
  })

  const filteredSections = sections.filter(section => {
    const value = search.toLowerCase()

    return (
      section.course_name.toLowerCase().includes(value) ||
      section.course_code.toLowerCase().includes(value) ||
      section.section_code.toLowerCase().includes(value)
    )
  })

  return (
    <div className="space-y-7">

      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <GraduationCap size={15} />
            <span>Coordinator</span>
            <span>/</span>
            <span>Quotas</span>
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156]">
            Quotas Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your department's course and section allocations.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQuotas}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E7E3DF] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Department and term */}
      {department && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#DCE5ED] bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
              <GraduationCap size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Department
              </p>
              <p className="mt-1 font-semibold text-[#2F4156]">
                {department.name}
              </p>
              <p className="mt-1 text-xs text-gray-500">
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
          </div>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CircleCheck size={18} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Department Courses"
          value={statistics.totalCourses ?? 0}
          description="Courses available to your department"
          icon={BookOpen}
        />

        <StatCard
          title="Configured Quotas"
          value={statistics.configuredQuotas ?? 0}
          description="Course quotas saved for this term"
          icon={Settings2}
        />

        <StatCard
          title="Course Quota Places"
          value={statistics.totalCourseQuota ?? 0}
          description="Configured or default quota totals"
          icon={Users}
        />

        <StatCard
          title="Allocated Section Places"
          value={statistics.allocatedSectionPlaces ?? 0}
          description={`${statistics.enrolledStudents ?? 0} students currently enrolled`}
          icon={Layers}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by course name, course code or section..."
          className="w-full rounded-xl border border-[#E7E3DF] bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#567CBD]"
        />
      </div>

      {/* Course quotas */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="border-b border-[#E7E3DF] px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen size={19} className="text-[#567CBD]" />
            <h2 className="font-semibold text-[#2F4156]">
              Course Quotas
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Set the total number of places your department can use for each course.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-gray-500">
            <RefreshCw size={17} className="animate-spin" />
            Loading quotas...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No courses found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#F9F8F7]">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4 font-semibold">Course</th>
                  <th className="px-5 py-4 font-semibold">Requirement</th>
                  <th className="px-5 py-4 font-semibold">Sections</th>
                  <th className="px-5 py-4 font-semibold">Allocated</th>
                  <th className="px-5 py-4 font-semibold">Enrolled</th>
                  <th className="px-5 py-4 font-semibold">Course Quota</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EEEC]">
                {filteredCourses.map(course => (
                  <tr key={course.course_department_id} className="hover:bg-[#FAF9F8]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#2F4156]">
                        {course.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {course.code}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {course.requirement_type.replaceAll('_', ' ')}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {course.section_count}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {course.allocated_places}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {course.enrolled_students}
                    </td>

                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={courseDrafts[course.course_department_id] ?? ''}
                        onChange={e =>
                          setCourseDrafts(previous => ({
                            ...previous,
                            [course.course_department_id]: e.target.value
                          }))
                        }
                        className="w-24 rounded-lg border border-[#E7E3DF] px-3 py-2 text-sm outline-none focus:border-[#567CBD]"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        {course.configured_quota != null
                          ? 'Saved for this term'
                          : `Default: ${course.default_quota ?? 'Not set'}`}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => saveCourseQuota(course)}
                        disabled={savingCourse === course.course_department_id}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2F4156] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#567CBD] disabled:opacity-50"
                      >
                        <Save size={14} />
                        {savingCourse === course.course_department_id
                          ? 'Saving...'
                          : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section quotas */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="border-b border-[#E7E3DF] px-5 py-4">
          <div className="flex items-center gap-2">
            <Layers size={19} className="text-[#567CBD]" />
            <h2 className="font-semibold text-[#2F4156]">
              Section Allocations
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Distribute your department's course quota across individual sections.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-gray-500">
            <RefreshCw size={17} className="animate-spin" />
            Loading section allocations...
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No sections are available for allocation in the active term.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-[#F9F8F7]">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4 font-semibold">Course</th>
                  <th className="px-5 py-4 font-semibold">Section</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Capacity</th>
                  <th className="px-5 py-4 font-semibold">Other Departments</th>
                  <th className="px-5 py-4 font-semibold">Enrolled Here</th>
                  <th className="px-5 py-4 font-semibold">Your Allocation</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EEEC]">
                {filteredSections.map(section => (
                  <tr key={section.section_id} className="hover:bg-[#FAF9F8]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#2F4156]">
                        {section.course_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {section.course_code}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-[#2F4156]">
                      {section.section_code}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {section.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {section.capacity}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {section.allocated_to_others}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {section.enrolled_students}
                    </td>

                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={sectionDrafts[section.section_id] ?? ''}
                        onChange={e =>
                          setSectionDrafts(previous => ({
                            ...previous,
                            [section.section_id]: e.target.value
                          }))
                        }
                        placeholder="Not set"
                        className="w-24 rounded-lg border border-[#E7E3DF] px-3 py-2 text-sm outline-none focus:border-[#567CBD]"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        {section.allocated_quota == null
                          ? 'Not allocated'
                          : 'Saved allocation'}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => saveSectionQuota(section)}
                        disabled={savingSection === section.section_id}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2F4156] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#567CBD] disabled:opacity-50"
                      >
                        <Save size={14} />
                        {savingSection === section.section_id
                          ? 'Saving...'
                          : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="rounded-xl border border-[#DCE5ED] bg-[#CBD9E6]/20 p-5">
        <h3 className="font-semibold text-[#2F4156]">
          Quota allocation rules
        </h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
          <li>• A course quota cannot be lower than its existing enrolled students.</li>
          <li>• A course quota cannot be lower than the sum of its section allocations.</li>
          <li>• A section's allocations across departments cannot exceed its capacity.</li>
          <li>• A section allocation cannot be lower than the students already enrolled from your department.</li>
          <li>• Quotas are saved for the active academic term.</li>
        </ul>
      </div>
    </div>
  )
}
