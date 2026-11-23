
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react'

import api from '../../services/api'

const STATUS_CONFIG = {
  PRESENT: {
    label: 'Present',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  ABSENT: {
    label: 'Absent',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  LATE: {
    label: 'Late',
    icon: Clock3,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  EXCUSED: {
    label: 'Excused',
    icon: FileText,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
}

function formatDate(dateValue) {
  if (!dateValue) return '—'

  // Parse date-only values locally to avoid timezone date shifts.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T00:00:00`)
    : new Date(dateValue)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getAttendanceColor(rate) {
  if (rate === null || rate === undefined) return 'text-gray-500'
  if (rate >= 85) return 'text-emerald-600'
  if (rate >= 75) return 'text-amber-600'
  return 'text-red-600'
}

function getProgressColor(rate) {
  if (rate === null || rate === undefined) return 'bg-gray-300'
  if (rate >= 85) return 'bg-emerald-500'
  if (rate >= 75) return 'bg-amber-500'
  return 'bg-red-500'
}

function StatCard({ label, value, icon: Icon, color, description }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold text-gray-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status]
  if (!config) return <span className="text-sm text-gray-500">—</span>

  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      <Icon size={13} />
      {config.label}
    </span>
  )
}

export default function StudentAttendance() {
  const [courses, setCourses] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [sectionDetails, setSectionDetails] = useState(null)
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)

  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState('')

  const loadCourses = useCallback(async () => {
    try {
      setLoadingCourses(true)
      setError('')

      const response = await api.get('/student/attendance')
      const attendance = response.data?.attendance || []

      setCourses(attendance)

      setSelectedSectionId((current) => {
        if (
          current &&
          attendance.some((course) => course.section_id === current)
        ) {
          return current
        }

        return attendance[0]?.section_id || ''
      })
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load your attendance information.'
      )
    } finally {
      setLoadingCourses(false)
    }
  }, [])

  const loadSectionHistory = useCallback(async (sectionId) => {
    if (!sectionId) {
      setSectionDetails(null)
      setHistory([])
      setSummary(null)
      return
    }

    try {
      setLoadingHistory(true)
      setError('')

      const response = await api.get(
        `/student/attendance/sections/${sectionId}`
      )

      setSectionDetails(response.data?.section || null)
      setHistory(response.data?.history || [])
      setSummary(response.data?.summary || null)
    } catch (err) {
      setSectionDetails(null)
      setHistory([])
      setSummary(null)
      setError(
        err.response?.data?.message ||
          'Unable to load attendance history for this course.'
      )
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    if (selectedSectionId) {
      loadSectionHistory(selectedSectionId)
    }
  }, [selectedSectionId, loadSectionHistory])

  const overall = useMemo(() => {
    const totals = courses.reduce(
      (result, course) => {
        result.present += Number(course.present_count || 0)
        result.absent += Number(course.absent_count || 0)
        result.late += Number(course.late_count || 0)
        result.excused += Number(course.excused_count || 0)
        return result
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    )

    const counted = totals.present + totals.absent + totals.late

    return {
      ...totals,
      total: counted + totals.excused,
      rate:
        counted > 0
          ? Number(
              (((totals.present + totals.late) / counted) * 100).toFixed(1)
            )
          : null,
    }
  }, [courses])

  const selectedCourse = courses.find(
    (course) => course.section_id === selectedSectionId
  )

  if (loadingCourses) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <LoaderCircle className="animate-spin" size={20} />
          Loading attendance...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <span>Student Portal</span>
            <span>/</span>
            <span className="text-[#5a4545]">Attendance</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            My Attendance
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Track your attendance records and course participation.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCourses}
          disabled={loadingCourses}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Overall statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall Attendance"
          value={overall.rate === null ? '—' : `${overall.rate}%`}
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
          description="Present and late sessions"
        />

        <StatCard
          label="Present"
          value={overall.present}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
          description="Sessions attended on time"
        />

        <StatCard
          label="Absent"
          value={overall.absent}
          icon={XCircle}
          color="bg-red-50 text-red-600"
          description="Unattended sessions"
        />

        <StatCard
          label="Late"
          value={overall.late}
          icon={Clock3}
          color="bg-amber-50 text-amber-600"
          description={`${overall.excused} excused sessions`}
        />
      </div>

      {/* Course list and selected course details */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
          <CalendarDays className="mx-auto text-gray-300" size={42} />
          <h2 className="mt-4 text-lg font-semibold text-gray-800">
            No attendance records yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Your enrolled courses will appear here. Attendance information
            will be available after your professors record attendance.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          {/* Course selector */}
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                My Courses
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select a course to view its attendance history.
              </p>
            </div>

            <div className="space-y-3">
              {courses.map((course) => {
                const isSelected =
                  course.section_id === selectedSectionId
                const rate = course.attendance_rate

                return (
                  <button
                    type="button"
                    key={course.section_id}
                    onClick={() =>
                      setSelectedSectionId(course.section_id)
                    }
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[#8b6868] bg-[#faf7f7] shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#8b6868]">
                          {course.course_code}
                        </p>
                        <h3 className="mt-1 font-semibold text-gray-900">
                          {course.course_name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Section {course.section_code || '—'}
                          {course.credits
                            ? ` · ${course.credits} credits`
                            : ''}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 text-sm font-bold ${getAttendanceColor(rate)}`}
                      >
                        {rate === null ? '—' : `${rate}%`}
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(rate)}`}
                        style={{
                          width: `${Math.min(Math.max(Number(rate || 0), 0), 100)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>
                        {course.total_sessions} recorded sessions
                      </span>
                      <span>
                        {course.absent_count} absences
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Course details */}
          <section className="min-w-0 space-y-5">
            {loadingHistory ? (
              <div className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <LoaderCircle className="animate-spin" size={20} />
                  Loading course history...
                </div>
              </div>
            ) : sectionDetails ? (
              <>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#8b6868]">
                        {sectionDetails.course_code}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-gray-900">
                        {sectionDetails.course_name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Section {sectionDetails.section_code || '—'}
                        {sectionDetails.term_name
                          ? ` · ${sectionDetails.term_name}`
                          : ''}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 px-4 py-3 sm:text-right">
                      <p className="text-xs text-gray-500">
                        Attendance rate
                      </p>
                      <p
                        className={`mt-1 text-2xl font-bold ${getAttendanceColor(summary?.attendance_rate)}`}
                      >
                        {summary?.attendance_rate == null
                          ? '—'
                          : `${summary.attendance_rate}%`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: 'Present',
                        value: summary?.present ?? 0,
                        color: 'text-emerald-600',
                      },
                      {
                        label: 'Absent',
                        value: summary?.absent ?? 0,
                        color: 'text-red-600',
                      },
                      {
                        label: 'Late',
                        value: summary?.late ?? 0,
                        color: 'text-amber-600',
                      },
                      {
                        label: 'Excused',
                        value: summary?.excused ?? 0,
                        color: 'text-blue-600',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                      >
                        <p className="text-xs text-gray-500">
                          {item.label}
                        </p>
                        <p className={`mt-1 text-xl font-bold ${item.color}`}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attendance history */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 px-5 py-4">
                    <h3 className="font-bold text-gray-900">
                      Attendance History
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your recorded attendance sessions for this course.
                    </p>
                  </div>

                  {history.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <CalendarDays
                        className="mx-auto text-gray-300"
                        size={36}
                      />
                      <p className="mt-3 font-medium text-gray-700">
                        No sessions recorded
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Attendance history will appear here when it is
                        recorded by your professor.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="px-5 py-3 font-semibold">
                                Date
                              </th>
                              <th className="px-5 py-3 font-semibold">
                                Status
                              </th>
                              <th className="px-5 py-3 font-semibold">
                                Remarks
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {history.map((item) => (
                              <tr key={item.session_id}>
                                <td className="px-5 py-4 text-sm font-medium text-gray-800">
                                  {formatDate(item.attendance_date)}
                                </td>
                                <td className="px-5 py-4">
                                  <StatusBadge status={item.status} />
                                </td>
                                <td className="px-5 py-4 text-sm text-gray-500">
                                  {item.remarks || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="divide-y divide-gray-100 md:hidden">
                        {history.map((item) => (
                          <div
                            key={item.session_id}
                            className="space-y-2 px-5 py-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-gray-800">
                                {formatDate(item.attendance_date)}
                              </span>
                              <StatusBadge status={item.status} />
                            </div>
                            {item.remarks && (
                              <p className="text-sm text-gray-500">
                                {item.remarks}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
                Select a course to view its attendance history.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
