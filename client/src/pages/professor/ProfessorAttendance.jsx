import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock3,
  FileText,
  Save,
  RefreshCw,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react'

import api from '../../services/api'

const STATUSES = [
  {
    value: 'PRESENT',
    label: 'Present',
    icon: CheckCircle2,
    color: 'text-green-700 bg-green-50 border-green-200',
  },
  {
    value: 'ABSENT',
    label: 'Absent',
    icon: XCircle,
    color: 'text-red-700 bg-red-50 border-red-200',
  },
  {
    value: 'LATE',
    label: 'Late',
    icon: Clock3,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    value: 'EXCUSED',
    label: 'Excused',
    icon: FileText,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
]

function getToday() {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getStatusDetails(status) {
  return STATUSES.find((item) => item.value === status) || STATUSES[0]
}

export default function ProfessorAttendance() {
  const [sections, setSections] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(getToday())

  const [students, setStudents] = useState([])
  const [notes, setNotes] = useState('')

  const [loadingSections, setLoadingSections] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadSections = useCallback(async () => {
    try {
      setLoadingSections(true)
      setError('')

      const response = await api.get('/professor/attendance/sections')

      const fetchedSections = response.data.sections || []

      setSections(fetchedSections)

      if (fetchedSections.length > 0) {
        setSelectedSection((current) => {
          if (
            current &&
            fetchedSections.some(
              (section) => section.section_id === current
            )
          ) {
            return current
          }

          return fetchedSections[0].section_id
        })
      } else {
        setSelectedSection('')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load your course sections.'
      )
    } finally {
      setLoadingSections(false)
    }
  }, [])

  const loadStudents = useCallback(async () => {
    if (!selectedSection || !attendanceDate) {
      setStudents([])
      return
    }

    try {
      setLoadingStudents(true)
      setError('')
      setSuccess('')

      const response = await api.get(
        `/professor/attendance/sections/${selectedSection}/students`,
        {
          params: {
            date: attendanceDate,
          },
        }
      )

      const fetchedStudents = response.data.students || []

      setStudents(
        fetchedStudents.map((student) => ({
          ...student,
          status: student.attendance_status || 'PRESENT',
          remarks: student.remarks || '',
        }))
      )
    } catch (err) {
      setStudents([])
      setError(
        err.response?.data?.message ||
          'Unable to load the enrolled students.'
      )
    } finally {
      setLoadingStudents(false)
    }
  }, [selectedSection, attendanceDate])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const selectedSectionDetails = useMemo(
    () =>
      sections.find(
        (section) => section.section_id === selectedSection
      ),
    [sections, selectedSection]
  )

  const statistics = useMemo(() => {
    return {
      total: students.length,
      present: students.filter((student) => student.status === 'PRESENT')
        .length,
      absent: students.filter((student) => student.status === 'ABSENT')
        .length,
      late: students.filter((student) => student.status === 'LATE').length,
      excused: students.filter((student) => student.status === 'EXCUSED')
        .length,
    }
  }, [students])

  const updateStudentStatus = (studentId, status) => {
    setStudents((current) =>
      current.map((student) =>
        student.student_id === studentId
          ? { ...student, status }
          : student
      )
    )

    setSuccess('')
  }

  const updateStudentRemarks = (studentId, remarks) => {
    setStudents((current) =>
      current.map((student) =>
        student.student_id === studentId
          ? { ...student, remarks }
          : student
      )
    )
  }

  const markAllStudents = (status) => {
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        status,
      }))
    )

    setSuccess('')
  }

  const handleSaveAttendance = async () => {
    if (!selectedSection) {
      setError('Please select a course section.')
      return
    }

    if (!attendanceDate) {
      setError('Please select an attendance date.')
      return
    }

    if (students.length === 0) {
      setError('There are no enrolled students in this section.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await api.post('/professor/attendance', {
        sectionId: selectedSection,
        attendanceDate,
        notes: notes.trim() || null,
        records: students.map((student) => ({
          studentId: student.student_id,
          status: student.status,
          remarks: student.remarks.trim() || null,
        })),
      })

      setSuccess(
        response.data.message || 'Attendance saved successfully.'
      )

      await loadStudents()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to save attendance. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loadingSections) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-3 text-sm text-gray-500">
          Loading your sections...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-50 p-2.5">
              <ClipboardCheck className="h-6 w-6 text-indigo-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Record and manage attendance for your classes.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadStudents}
          disabled={!selectedSection || loadingStudents}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loadingStudents ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {sections.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-400" />

          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No assigned sections
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            You don't currently have any course sections assigned to you.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="attendance-section"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Course section
              </label>

              <div className="relative">
                <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <select
                  id="attendance-section"
                  value={selectedSection}
                  onChange={(event) => {
                    setSelectedSection(event.target.value)
                    setNotes('')
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {sections.map((section) => (
                    <option
                      key={section.section_id}
                      value={section.section_id}
                    >
                      {section.course_code} — {section.course_name} (
                      {section.section_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="attendance-date"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Class date
              </label>

              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  id="attendance-date"
                  type="date"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </div>

          {/* Selected section information */}
          {selectedSectionDetails && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedSectionDetails.course_code} —{' '}
                    {selectedSectionDetails.course_name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Section {selectedSectionDetails.section_code}
                    {selectedSectionDetails.room
                      ? ` · Room ${selectedSectionDetails.room}`
                      : ''}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {selectedSectionDetails.term_name} ·{' '}
                    {selectedSectionDetails.academic_year}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="h-4 w-4" />
                  {students.length} enrolled students
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              {
                label: 'Total students',
                value: statistics.total,
                color: 'text-gray-900',
                icon: Users,
              },
              {
                label: 'Present',
                value: statistics.present,
                color: 'text-green-700',
                icon: CheckCircle2,
              },
              {
                label: 'Absent',
                value: statistics.absent,
                color: 'text-red-700',
                icon: XCircle,
              },
              {
                label: 'Late',
                value: statistics.late,
                color: 'text-amber-700',
                icon: Clock3,
              },
              {
                label: 'Excused',
                value: statistics.excused,
                color: 'text-blue-700',
                icon: FileText,
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">
                      {item.label}
                    </p>
                    <Icon className="h-4 w-4 text-gray-400" />
                  </div>

                  <p className={`mt-2 text-2xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Attendance roster */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Student attendance
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select an attendance status for every enrolled student.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markAllStudents('PRESENT')}
                  disabled={students.length === 0 || loadingStudents}
                  className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                >
                  Mark all present
                </button>

                <button
                  type="button"
                  onClick={() => markAllStudents('ABSENT')}
                  disabled={students.length === 0 || loadingStudents}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Mark all absent
                </button>
              </div>
            </div>

            {loadingStudents ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="ml-3 text-sm text-gray-500">
                  Loading students...
                </span>
              </div>
            ) : students.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Users className="mx-auto h-9 w-9 text-gray-400" />
                <p className="mt-3 font-medium text-gray-800">
                  No enrolled students found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Students with an active enrollment in this section will
                  appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead className="bg-gray-50">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Student number</th>
                        <th className="px-5 py-3">Attendance status</th>
                        <th className="px-5 py-3">Remarks</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {students.map((student) => {
                        const currentStatus = getStatusDetails(student.status)

                        return (
                          <tr
                            key={student.student_id}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-gray-900">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {student.email}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {student.student_number}
                            </td>

                            <td className="px-5 py-4">
                              <select
                                value={student.status}
                                onChange={(event) =>
                                  updateStudentStatus(
                                    student.student_id,
                                    event.target.value
                                  )
                                }
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-100 ${currentStatus.color}`}
                              >
                                {STATUSES.map((status) => (
                                  <option
                                    key={status.value}
                                    value={status.value}
                                  >
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="px-5 py-4">
                              <input
                                type="text"
                                value={student.remarks}
                                onChange={(event) =>
                                  updateStudentRemarks(
                                    student.student_id,
                                    event.target.value
                                  )
                                }
                                placeholder="Optional remark"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 border-t border-gray-200 p-5">
                  <div>
                    <label
                      htmlFor="attendance-notes"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Session notes (optional)
                    </label>

                    <textarea
                      id="attendance-notes"
                      rows={2}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Add notes about this class session..."
                      className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                      Saving again for the same date updates the existing
                      attendance session.
                    </p>

                    <button
                      type="button"
                      onClick={handleSaveAttendance}
                      disabled={saving || loadingStudents || students.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      {saving ? 'Saving...' : 'Save attendance'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}