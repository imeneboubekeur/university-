
import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  Search,
  FileText,
  GraduationCap,
  CalendarDays,
  UserRound,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Loader2,
  RefreshCw,
  Send,
  Eye,
  XCircle,
} from 'lucide-react'

import api from '../../services/api'

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    'Something went wrong. Please try again.'
  )
}

function formatDate(date) {
  if (!date) return '—'

  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function StatusBadge({ ready }) {
  return ready ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
      <CheckCircle2 size={14} />
      Ready
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
      <AlertCircle size={14} />
      Incomplete
    </span>
  )
}

function AssessmentStatus({ assessment }) {
  if (assessment.isSubmitted) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={13} />
        Submitted
      </span>
    )
  }

  if (assessment.status === 'DRAFT') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        <Clock3 size={13} />
        Draft
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
      <AlertCircle size={13} />
      Missing
    </span>
  )
}

export default function SecretaryTranscripts() {
  const [students, setStudents] = useState([])
  const [terms, setTerms] = useState([])

  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')
  const [termId, setTermId] = useState('')

  const [preview, setPreview] = useState(null)
  const [issuedTranscript, setIssuedTranscript] = useState(null)

  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingTerms, setLoadingTerms] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [issuing, setIssuing] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    async function fetchStudents() {
      try {
        setLoadingStudents(true)

        const response = await api.get('/secretary/transcripts/students', {
          params: { search },
        })

        if (active) {
          setStudents(response.data.students || [])
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err))
        }
      } finally {
        if (active) {
          setLoadingStudents(false)
        }
      }
    }

    fetchStudents()

    return () => {
      active = false
    }
  }, [search])

  useEffect(() => {
    let active = true

    async function fetchTerms() {
      try {
        setLoadingTerms(true)

        const response = await api.get('/secretary/transcripts/terms')

        if (active) {
          const fetchedTerms = response.data.terms || []
          setTerms(fetchedTerms)

          const activeTerm = fetchedTerms.find((term) => term.is_active)

          if (activeTerm) {
            setTermId(activeTerm.id)
          }
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err))
        }
      } finally {
        if (active) {
          setLoadingTerms(false)
        }
      }
    }

    fetchTerms()

    return () => {
      active = false
    }
  }, [])

  const selectedStudent = useMemo(
    () => students.find((student) => student.student_id === studentId),
    [students, studentId]
  )

  const selectedTerm = useMemo(
    () => terms.find((term) => term.id === termId),
    [terms, termId]
  )

  async function handlePreview(event) {
    event.preventDefault()

    if (!studentId || !termId) {
      setError('Please select a student and an academic term.')
      return
    }

    try {
      setError('')
      setSuccess('')
      setIssuedTranscript(null)
      setPreview(null)
      setLoadingPreview(true)

      const response = await api.get('/secretary/transcripts/preview', {
        params: { studentId, termId },
      })

      setPreview(response.data.preview)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleIssueTranscript() {
    if (!preview?.summary?.allCoursesReady) {
      setError('The transcript is not ready for issuance.')
      return
    }

    const confirmed = window.confirm(
      `Issue the official transcript for ${preview.student.first_name} ${preview.student.last_name} for ${preview.term.name} ${preview.term.academic_year}?`
    )

    if (!confirmed) return

    try {
      setError('')
      setSuccess('')
      setIssuing(true)

      const response = await api.post('/secretary/transcripts/issue', {
        studentId,
        termId,
      })

      setIssuedTranscript(response.data.transcript)
      setSuccess(response.data.message || 'Transcript issued successfully.')
      setPreview(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIssuing(false)
    }
  }

  function resetPreview() {
    setPreview(null)
    setIssuedTranscript(null)
    setError('')
    setSuccess('')
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#765858]">
            <Award size={17} />
            Academic administration
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Transcript Issuance
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review student academic results and issue official transcripts.
          </p>
        </div>

        <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-600 shadow-sm">
          <FileText size={17} className="text-[#765858]" />
          Official academic records
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Selection panel */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            Select student and academic term
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose the student and term for the official transcript.
          </p>
        </div>

        <form
          onSubmit={handlePreview}
          className="grid grid-cols-1 gap-5 lg:grid-cols-2"
        >
          {/* Student search */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Student
            </label>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setStudentId('')
                  resetPreview()
                }}
                placeholder="Search by name, student number or email"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#765858] focus:ring-2 focus:ring-[#765858]/10"
              />
            </div>

            <div className="mt-2">
              <select
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value)
                  resetPreview()
                }}
                disabled={loadingStudents}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#765858] focus:ring-2 focus:ring-[#765858]/10 disabled:bg-gray-50"
              >
                <option value="">
                  {loadingStudents
                    ? 'Loading students...'
                    : 'Select a student'}
                </option>

                {students.map((student) => (
                  <option
                    key={student.student_id}
                    value={student.student_id}
                  >
                    {student.first_name} {student.last_name} —{' '}
                    {student.student_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Term */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Academic term
            </label>

            <div className="relative">
              <CalendarDays
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <select
                value={termId}
                onChange={(event) => {
                  setTermId(event.target.value)
                  resetPreview()
                }}
                disabled={loadingTerms}
                className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-[#765858] focus:ring-2 focus:ring-[#765858]/10 disabled:bg-gray-50"
              >
                <option value="">
                  {loadingTerms
                    ? 'Loading academic terms...'
                    : 'Select an academic term'}
                </option>

                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} — {term.academic_year}
                    {term.is_active ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:col-span-2">
            <button
              type="submit"
              disabled={!studentId || !termId || loadingPreview}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5a4545] px-5 text-sm font-medium text-white transition hover:bg-[#493737] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingPreview ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Eye size={17} />
              )}
              {loadingPreview ? 'Loading preview...' : 'Preview transcript'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStudentId('')
                setTermId('')
                setSearch('')
                resetPreview()
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </form>
      </section>

      {/* Selected student summary */}
      {selectedStudent && selectedTerm && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5a4545]/10 text-[#5a4545]">
              <UserRound size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Selected student</p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </p>
              <p className="text-xs text-gray-500">
                {selectedStudent.student_number}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Selected academic term</p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {selectedTerm.name}
              </p>
              <p className="text-xs text-gray-500">
                {selectedTerm.academic_year}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Issued transcript confirmation */}
      {issuedTranscript && (
        <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={25} />
            </div>

            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">
                Official transcript issued
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                The transcript has been saved and is available to the student.
              </p>
              <p className="mt-2 text-sm font-medium text-gray-800">
                Transcript number: {issuedTranscript.transcriptNumber}
              </p>
            </div>

            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              ISSUED
            </span>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-100 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Student</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {issuedTranscript.student?.first_name}{' '}
                {issuedTranscript.student?.last_name}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Academic term</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {issuedTranscript.term?.name}{' '}
                {issuedTranscript.term?.academic_year}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Issued date</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {formatDate(issuedTranscript.issuedAt)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Transcript preview */}
      {preview && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Transcript preview
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review all course results before official issuance.
              </p>
            </div>

            <StatusBadge ready={preview.summary.allCoursesReady} />
          </div>

          {/* Student information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5a4545]/10 text-[#5a4545]">
                <GraduationCap size={23} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900">
                  {preview.student.first_name} {preview.student.last_name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {preview.student.student_number}
                </p>
                <p className="text-sm text-gray-500">
                  {preview.student.email}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {preview.student.department_name || 'Department not assigned'}
                  {preview.student.faculty_name
                    ? ` · ${preview.student.faculty_name}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Academic term</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {preview.term.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Academic year</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {preview.term.academic_year}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Courses</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {preview.summary.totalCourses}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Total credits</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {preview.summary.totalCredits}
                </p>
              </div>
            </div>
          </div>

          {/* Course results */}
          {preview.courses.map((course) => (
            <div
              key={course.enrollmentId}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-[#5a4545]">
                    <BookOpen size={19} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {course.courseCode} — {course.courseName}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Section {course.sectionCode} · {course.credits} credits
                      {course.ects !== null ? ` · ${course.ects} ECTS` : ''}
                    </p>
                  </div>
                </div>

                <StatusBadge ready={course.readyForIssuance} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Assessment</th>
                      <th className="px-5 py-3 font-medium">Weight</th>
                      <th className="px-5 py-3 font-medium">Score</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {course.assessments.map((assessment) => (
                      <tr key={assessment.assessmentId}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-800">
                            {assessment.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {assessment.type}
                          </p>
                        </td>

                        <td className="px-5 py-3 text-gray-600">
                          {assessment.percentage}%
                        </td>

                        <td className="px-5 py-3 text-gray-600">
                          {assessment.score === null
                            ? '—'
                            : `${assessment.score} / ${assessment.maxScore}`}
                        </td>

                        <td className="px-5 py-3">
                          <AssessmentStatus assessment={assessment} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!course.weightsAreValid && (
                <div className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-800">
                  Assessment weights total {course.totalAssessmentWeight}%.
                  They must total 100% before this course can be issued.
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 border-t border-gray-100 bg-gray-50/70 p-4 sm:px-5">
                <div>
                  <p className="text-xs text-gray-500">Final numeric grade</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {course.numericGrade ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Letter grade</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {course.letterGrade ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Assessment weight</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {course.totalAssessmentWeight}%
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Issuance action */}
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                Official transcript issuance
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {preview.summary.allCoursesReady
                  ? 'All courses are ready. You can issue this transcript.'
                  : `${preview.summary.readyCourses} of ${preview.summary.totalCourses} courses are ready. Complete the remaining grades first.`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleIssueTranscript}
              disabled={!preview.summary.allCoursesReady || issuing}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5a4545] px-5 text-sm font-semibold text-white transition hover:bg-[#493737] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {issuing ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {issuing ? 'Issuing...' : 'Issue official transcript'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
