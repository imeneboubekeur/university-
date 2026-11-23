
import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  BookOpen,
  GraduationCap,
  DoorOpen,
  UserCheck,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Printer,
  Download,
  BarChart3,
  LoaderCircle,
  FileText,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

function StatCard({ label, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#2F4156]">
            {value ?? 0}
          </p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
        <div className="rounded-xl bg-[#EDF2F8] p-3 text-[#567CBD]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <h2 className="mb-4 text-base font-bold text-[#2F4156]">
      {children}
    </h2>
  )
}

function ProgressBar({ value, total }) {
  const percentage = total > 0
    ? Math.min(100, (Number(value) / Number(total)) * 100)
    : 0

  return (
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div
        className="h-full rounded-full bg-[#567CBD] transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="py-10 text-center text-sm text-gray-500">
      {message}
    </div>
  )
}

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(Number(value || 0))
}

function formatSemester(term) {
  if (!term) return 'No active term'

  const semester = Number(term.semester) === 1
    ? 'Fall'
    : Number(term.semester) === 2
      ? 'Spring'
      : `Semester ${term.semester}`

  return `${term.academic_year} · ${semester}`
}

export default function CoordinatorReports() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchReport = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const response = await fetch(`${API_URL}/coordinator/reports`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load reports.')
      }

      setReport(data)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center gap-3 text-sm text-gray-500">
        <LoaderCircle size={20} className="animate-spin" />
        Loading department reports...
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">
        <XCircle className="mx-auto text-red-500" size={30} />
        <p className="mt-3 font-semibold text-[#2F4156]">
          Unable to load reports
        </p>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          type="button"
          onClick={() => fetchReport()}
          className="mt-5 rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!report) return null

  const {
    department,
    activeTerm,
    overview,
    studentsByYear,
    courseEnrollment,
    sectionCapacity,
    professors,
    requests,
  } = report

  const requestStatuses = [
    { label: 'Pending', value: requests.pending, color: 'bg-amber-500' },
    { label: 'Under review', value: requests.underReview, color: 'bg-blue-500' },
    { label: 'Approved', value: requests.approved, color: 'bg-emerald-500' },
    { label: 'Rejected', value: requests.rejected, color: 'bg-red-500' },
    { label: 'Cancelled', value: requests.cancelled, color: 'bg-gray-400' },
  ]

  const maxYearCount = Math.max(
    1,
    ...studentsByYear.map((item) => Number(item.student_count))
  )

  const maxCourseEnrollment = Math.max(
    1,
    ...courseEnrollment.map((item) => Number(item.enrolled_count))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#567CBD]">
            Department coordination
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#2F4156]">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Department performance, student enrollment, and academic statistics.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchReport(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243447]"
          >
            <Printer size={16} />
            Print report
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Department
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#2F4156]">
              {department.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {department.code} · {department.faculty_name || 'Faculty not specified'}
            </p>
          </div>
          <div className="rounded-xl bg-[#F5EFEB] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Active academic term
            </p>
            <p className="mt-1 font-semibold text-[#2F4156]">
              {formatSemester(activeTerm)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total students"
          value={formatNumber(overview.students.total)}
          description={`${formatNumber(overview.students.active)} active students`}
          icon={Users}
        />
        <StatCard
          label="Available courses"
          value={formatNumber(overview.courses.total)}
          description={`${overview.courses.required} required courses`}
          icon={BookOpen}
        />
        <StatCard
          label="Professors"
          value={formatNumber(overview.professors.total)}
          description={`${overview.professors.assignedSections} assigned sections`}
          icon={GraduationCap}
        />
        <StatCard
          label="Enrolled students"
          value={formatNumber(overview.sections.enrolled)}
          description={`${formatNumber(overview.sections.availableSeats)} available seats`}
          icon={UserCheck}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
          <SectionTitle>Student distribution by year</SectionTitle>

          {studentsByYear.length === 0 ? (
            <EmptyState message="No student records found." />
          ) : (
            <div className="space-y-5">
              {studentsByYear.map((item) => (
                <div key={item.year_level}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-[#2F4156]">
                      Year {item.year_level ?? 'Not assigned'}
                    </span>
                    <span className="font-semibold text-gray-600">
                      {formatNumber(item.student_count)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[#567CBD]"
                      style={{
                        width: `${(Number(item.student_count) / maxYearCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Student status
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Active', overview.students.active],
                ['Suspended', overview.students.suspended],
                ['Graduated', overview.students.graduated],
                ['Withdrawn', overview.students.withdrawn],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 text-lg font-bold text-[#2F4156]">
                    {formatNumber(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
          <SectionTitle>Course requirements</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Required', overview.courses.required, 'bg-blue-50 text-blue-700'],
              ['Elective', overview.courses.elective, 'bg-purple-50 text-purple-700'],
              ['Free elective', overview.courses.freeElective, 'bg-amber-50 text-amber-700'],
              ['Total courses', overview.courses.total, 'bg-gray-100 text-[#2F4156]'],
            ].map(([label, value, style]) => (
              <div key={label} className={`rounded-xl p-4 ${style}`}>
                <p className="text-xs font-semibold">{label}</p>
                <p className="mt-2 text-2xl font-bold">{formatNumber(value)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <SectionTitle>Section capacity</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Total capacity</p>
                <p className="mt-1 text-xl font-bold text-[#2F4156]">
                  {formatNumber(overview.sections.capacity)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department quota</p>
                <p className="mt-1 text-xl font-bold text-[#2F4156]">
                  {formatNumber(overview.sections.departmentQuota)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs text-gray-500">
                <span>Enrolled vs total capacity</span>
                <span>
                  {overview.sections.capacity > 0
                    ? `${Math.round((overview.sections.enrolled / overview.sections.capacity) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <ProgressBar
                value={overview.sections.enrolled}
                total={overview.sections.capacity}
              />
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-gray-500">Enrolled</span>
              <span className="font-semibold text-[#2F4156]">
                {formatNumber(overview.sections.enrolled)}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-gray-500">Available seats</span>
              <span className="font-semibold text-emerald-700">
                {formatNumber(overview.sections.availableSeats)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
        <SectionTitle>Course enrollment overview</SectionTitle>

        {courseEnrollment.length === 0 ? (
          <EmptyState message="No course enrollment data available for the active term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3 pr-4">Course</th>
                  <th className="py-3 pr-4">Requirement</th>
                  <th className="py-3 pr-4">Sections</th>
                  <th className="py-3 pr-4">Enrolled</th>
                  <th className="py-3 pr-4">Quota</th>
                  <th className="py-3">Enrollment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courseEnrollment.map((course) => (
                  <tr key={course.course_id}>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-[#2F4156]">
                        {course.course_code}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {course.course_name}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-xs text-gray-600">
                      {course.requirement_type?.replaceAll('_', ' ')}
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-600">
                      {course.section_count}
                    </td>
                    <td className="py-4 pr-4 text-sm font-semibold text-[#2F4156]">
                      {formatNumber(course.enrolled_count)}
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-600">
                      {course.course_quota || '—'}
                    </td>
                    <td className="min-w-[150px] py-4">
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>{course.enrolled_count}</span>
                        <span>{course.total_capacity}</span>
                      </div>
                      <ProgressBar
                        value={course.enrolled_count}
                        total={course.total_capacity}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
          <SectionTitle>Registration requests</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#F5EFEB] p-4">
              <p className="text-xs text-gray-500">Total requests</p>
              <p className="mt-1 text-2xl font-bold text-[#2F4156]">
                {formatNumber(requests.total)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs text-amber-700">Awaiting review</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {formatNumber(requests.pending + requests.underReview)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {requestStatuses.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-[#2F4156]">
                    {formatNumber(item.value)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{
                      width: `${requests.total > 0
                        ? (item.value / requests.total) * 100
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Registration requests</span>
              <span className="font-semibold text-[#2F4156]">
                {formatNumber(requests.registration)}
              </span>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-gray-500">Section changes</span>
              <span className="font-semibold text-[#2F4156]">
                {formatNumber(requests.sectionChanges)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
          <SectionTitle>Professor assignments</SectionTitle>
          {professors.length === 0 ? (
            <EmptyState message="No professors found for this department." />
          ) : (
            <div className="max-h-[390px] space-y-3 overflow-y-auto">
              {professors.map((professor) => (
                <div
                  key={professor.professor_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#2F4156]">
                      {professor.academic_title
                        ? `${professor.academic_title} `
                        : ''}
                      {professor.first_name} {professor.last_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {professor.employee_number}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-[#2F4156]">
                      {professor.assigned_sections}
                    </p>
                    <p className="text-xs text-gray-500">Sections</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {professor.assigned_courses} courses
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
        <SectionTitle>Section capacity details</SectionTitle>

        {sectionCapacity.length === 0 ? (
          <EmptyState message="No sections found for the active term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-3 pr-4">Course</th>
                  <th className="py-3 pr-4">Section</th>
                  <th className="py-3 pr-4">Professor</th>
                  <th className="py-3 pr-4">Capacity</th>
                  <th className="py-3 pr-4">Enrolled</th>
                  <th className="py-3 pr-4">Department quota</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sectionCapacity.map((section) => (
                  <tr key={section.section_id}>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-[#2F4156]">
                        {section.course_code}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {section.course_name}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-600">
                      {section.section_code}
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-600">
                      {section.professor_id
                        ? `${section.professor_first_name || ''} ${section.professor_last_name || ''}`.trim()
                        : 'Not assigned'}
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-600">
                      {section.capacity}
                    </td>
                    <td className="py-4 pr-4 text-sm font-semibold text-[#2F4156]">
                      {section.enrolled_count}
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-600">
                      {section.department_quota || '—'}
                    </td>
                    <td className="py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        section.status === 'OPEN'
                          ? 'bg-emerald-50 text-emerald-700'
                          : section.status === 'CLOSED'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-50 text-amber-700'
                      }`}>
                        {section.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="print-only hidden border-t border-gray-200 pt-4 text-xs text-gray-500">
        Generated from UnivAdmin Pro · {department.name}
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          button {
            display: none !important;
          }
          main {
            overflow: visible !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  )
}
