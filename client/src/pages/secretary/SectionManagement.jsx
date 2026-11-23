
import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  BookOpen,
  Users,
  DoorOpen,
  Clock3,
  X,
  GraduationCap,
  CalendarDays,
  UserRound,
  ChevronRight,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const statusStyles = {
  PLANNED: 'bg-blue-50 text-blue-700',
  OPEN: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-700',
}

function formatSemester(semester) {
  if (Number(semester) === 1) return 'Fall'
  if (Number(semester) === 2) return 'Spring'
  return `Semester ${semester}`
}

function formatSchedule(schedule) {
  if (!schedule) return 'No schedule assigned'

  if (typeof schedule === 'string') {
    try {
      schedule = JSON.parse(schedule)
    } catch {
      return schedule
    }
  }

  if (Array.isArray(schedule)) {
    if (!schedule.length) return 'No schedule assigned'

    return schedule.map((item, index) => {
      if (typeof item === 'string') return item

      if (item && typeof item === 'object') {
        return [
          item.day,
          item.startTime || item.start_time,
          item.endTime || item.end_time,
          item.room,
        ].filter(Boolean).join(' · ') || `Schedule ${index + 1}`
      }

      return String(item)
    }).join(' | ')
  }

  if (typeof schedule === 'object') {
    return [
      schedule.day,
      schedule.startTime || schedule.start_time,
      schedule.endTime || schedule.end_time,
      schedule.room,
    ].filter(Boolean).join(' · ') || 'Schedule information available'
  }

  return String(schedule)
}

export default function SectionManagement() {
  const [sections, setSections] = useState([])
  const [terms, setTerms] = useState([])
  const [search, setSearch] = useState('')
  const [termId, setTermId] = useState('')
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSection, setSelectedSection] = useState(null)
  const [sectionStudents, setSectionStudents] = useState([])
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const fetchTerms = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/secretary/sections/terms`,
        { credentials: 'include' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load academic terms.')
      }

      setTerms(data.terms || [])
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const fetchSections = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        search,
        termId,
        status,
      })

      const response = await fetch(
        `${API_URL}/secretary/sections?${params.toString()}`,
        { credentials: 'include' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load sections.')
      }

      setSections(data.sections || [])
    } catch (err) {
      setError(err.message)
      setSections([])
    } finally {
      setLoading(false)
    }
  }, [search, termId, status])

  useEffect(() => {
    fetchTerms()
  }, [fetchTerms])

  useEffect(() => {
    const timer = setTimeout(fetchSections, 300)
    return () => clearTimeout(timer)
  }, [fetchSections])

  async function openSection(section) {
    setSelectedSection(section)
    setSectionStudents([])
    setDetailsError('')
    setDetailsLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/secretary/sections/${section.id}`,
        { credentials: 'include' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load section details.')
      }

      setSelectedSection(data.section)
      setSectionStudents(data.students || [])
    } catch (err) {
      setDetailsError(err.message)
    } finally {
      setDetailsLoading(false)
    }
  }

  const totalEnrolled = sections.reduce(
    (total, section) => total + Number(section.enrolled_count || 0),
    0
  )

  const openSections = sections.filter(
    (section) => section.status === 'OPEN'
  ).length

  const totalCapacity = sections.reduce(
    (total, section) => total + Number(section.capacity || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            Secretary workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#2F4156]">
            Section Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View course sections, instructors, schedules, and student enrollment.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSections}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total sections"
          value={sections.length}
          icon={<BookOpen size={20} />}
        />
        <SummaryCard
          label="Open sections"
          value={openSections}
          icon={<DoorOpen size={20} />}
        />
        <SummaryCard
          label="Enrolled students"
          value={totalEnrolled}
          icon={<Users size={20} />}
        />
        <SummaryCard
          label="Total capacity"
          value={totalCapacity}
          icon={<GraduationCap size={20} />}
        />
      </div>

      {/* Filters and table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-5">
          <h2 className="font-semibold text-[#2F4156]">
            Course sections
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Browse sections and inspect their enrollment.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search course, section, instructor..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#567CBD]"
            />
          </div>

          <select
            value={termId}
            onChange={(event) => setTermId(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
          >
            <option value="">All academic terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name} · {term.academic_year}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="PLANNED">Planned</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3 font-semibold">Course</th>
                <th className="px-3 py-3 font-semibold">Section</th>
                <th className="px-3 py-3 font-semibold">Instructor</th>
                <th className="px-3 py-3 font-semibold">Room / Schedule</th>
                <th className="px-3 py-3 font-semibold">Enrollment</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-3 py-12 text-center text-sm text-gray-500">
                    Loading course sections...
                  </td>
                </tr>
              ) : sections.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-12 text-center text-sm text-gray-500">
                    No sections found for these filters.
                  </td>
                </tr>
              ) : (
                sections.map((section) => {
                  const enrolled = Number(section.enrolled_count || 0)
                  const capacity = Number(section.capacity || 0)
                  const percentage = capacity > 0
                    ? Math.min((enrolled / capacity) * 100, 100)
                    : 0

                  return (
                    <tr key={section.id} className="hover:bg-gray-50/70">
                      <td className="px-3 py-4">
                        <p className="font-semibold text-[#2F4156]">
                          {section.course_code}
                        </p>
                        <p className="mt-1 max-w-[220px] text-xs text-gray-500">
                          {section.course_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {section.credits} credits · {section.ects} ECTS
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <span className="rounded-lg bg-[#CBD9E6]/40 px-2.5 py-1 text-xs font-semibold text-[#2F4156]">
                          {section.section_code}
                        </span>
                        <p className="mt-2 text-xs text-gray-500">
                          {section.term_name} · {formatSemester(section.semester)}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        {section.professor_id ? (
                          <>
                            <p className="text-sm font-medium text-[#2F4156]">
                              {section.professor_first_name} {section.professor_last_name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {section.academic_title || 'Instructor'}
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Not assigned
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <p className="text-sm text-gray-700">
                          {section.room || 'Room not assigned'}
                        </p>
                        <p className="mt-1 max-w-[200px] text-xs text-gray-500">
                          {formatSchedule(section.schedule)}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-[#2F4156]">
                            {enrolled} / {capacity}
                          </span>
                          <span className="text-gray-500">
                            {capacity > 0
                              ? `${Math.round(percentage)}%`
                              : '—'}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#567CBD]"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[section.status] || 'bg-gray-100 text-gray-600'
                        }`}>
                          {section.status}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openSection(section)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#2F4156] hover:border-[#567CBD] hover:bg-[#CBD9E6]/30"
                        >
                          View <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
          Showing {sections.length} section(s).
        </div>
      </div>

      {/* Section details modal */}
      {selectedSection && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#567CBD]">
                  Section details
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#2F4156]">
                  {selectedSection.course_code} · {selectedSection.section_code}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedSection.course_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSection(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close section details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {detailsError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {detailsError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailCard
                  label="Capacity"
                  value={selectedSection.capacity}
                  icon={<Users size={17} />}
                />
                <DetailCard
                  label="Enrolled"
                  value={selectedSection.enrolled_count}
                  icon={<GraduationCap size={17} />}
                />
                <DetailCard
                  label="Room"
                  value={selectedSection.room || 'Not assigned'}
                  icon={<DoorOpen size={17} />}
                />
                <DetailCard
                  label="Status"
                  value={selectedSection.status}
                  icon={<Clock3 size={17} />}
                />
              </div>

              <div className="grid gap-4 rounded-xl bg-[#F5EFEB] p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Instructor</p>
                  <p className="mt-1 text-sm font-semibold text-[#2F4156]">
                    {selectedSection.professor_id
                      ? `${selectedSection.professor_first_name} ${selectedSection.professor_last_name}`
                      : 'Not assigned'}
                  </p>
                  {selectedSection.employee_number && (
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedSection.employee_number}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500">Academic term</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
                    <CalendarDays size={15} />
                    {selectedSection.term_name} · {selectedSection.academic_year}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Schedule</p>
                  <p className="mt-1 text-sm text-[#2F4156]">
                    {formatSchedule(selectedSection.schedule)}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#2F4156]">
                      Enrolled students
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Students currently enrolled in this section.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#CBD9E6]/50 px-3 py-1 text-xs font-semibold text-[#2F4156]">
                    {sectionStudents.length} students
                  </span>
                </div>

                {detailsLoading ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    Loading enrolled students...
                  </p>
                ) : detailsError ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    Student list could not be loaded.
                  </p>
                ) : sectionStudents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                    <Users size={26} className="mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">
                      No students enrolled yet.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="text-xs text-gray-500">
                          <th className="px-3 py-3 font-semibold">Student</th>
                          <th className="px-3 py-3 font-semibold">Number</th>
                          <th className="px-3 py-3 font-semibold">Department</th>
                          <th className="px-3 py-3 font-semibold">Year</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sectionStudents.map((student) => (
                          <tr key={student.enrollment_id}>
                            <td className="px-3 py-3">
                              <p className="text-sm font-medium text-[#2F4156]">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {student.email}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-600">
                              {student.student_number}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-600">
                              {student.department_name}
                            </td>
                            <td className="px-3 py-3 text-xs text-gray-600">
                              {student.year_level || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={() => setSelectedSection(null)}
                className="rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#243548]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span className="text-[#567CBD]">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-[#2F4156]">{value}</p>
    </div>
  )
}

function DetailCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-[#2F4156]">
        {value ?? '—'}
      </p>
    </div>
  )
}
