
import { useEffect, useState } from 'react'
import {
  Search,
  Users,
  GraduationCap,
  FileText,
  CalendarDays,
  BookOpen,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  LoaderCircle,
  FileCheck,
} from 'lucide-react'
import api from '../../services/api'

function formatGPA(value) {
  return value === null || value === undefined
    ? '—'
    : Number(value).toFixed(2)
}

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#718096]">{title}</p>
        <div className="rounded-xl bg-blue-50 p-2.5 text-[#567CBD]">
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-[#2F4156]">{value}</p>
    </div>
  )
}

export default function SecretaryDashboard() {
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [terms, setTerms] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedTerm, setSelectedTerm] = useState('')

  const [preview, setPreview] = useState(null)
  const [createdTranscript, setCreatedTranscript] = useState(null)

  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingTerms, setLoadingTerms] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [issuing, setIssuing] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadTerms()
  }, [])

  async function loadTerms() {
    try {
      setLoadingTerms(true)
      const response = await api.get('/secretary/terms')
      const termList = response.data.terms || []

      setTerms(termList)

      const activeTerm = termList.find((term) => term.is_active)
      if (activeTerm) {
        setSelectedTerm(activeTerm.id)
      } else if (termList.length > 0) {
        setSelectedTerm(termList[0].id)
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load academic terms.'
      )
    } finally {
      setLoadingTerms(false)
    }
  }

  async function searchStudents(event) {
    event.preventDefault()

    try {
      setLoadingStudents(true)
      setError('')
      setSuccess('')
      setStudents([])
      setSelectedStudent(null)
      setPreview(null)
      setCreatedTranscript(null)

      const response = await api.get('/secretary/students', {
        params: { search: search.trim() },
      })

      setStudents(response.data.students || [])

      if ((response.data.students || []).length === 0) {
        setError('No students matched your search.')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to search for students.'
      )
    } finally {
      setLoadingStudents(false)
    }
  }

  async function selectStudent(student) {
    setSelectedStudent(student)
    setPreview(null)
    setCreatedTranscript(null)
    setError('')
    setSuccess('')

    if (!selectedTerm) {
      setError('Please select an academic term first.')
      return
    }

    await loadPreview(student.student_id, selectedTerm)
  }

  async function loadPreview(studentId, termId) {
    try {
      setLoadingPreview(true)
      setError('')
      setPreview(null)
      setCreatedTranscript(null)

      const response = await api.get(
        `/secretary/students/${studentId}/transcript-preview`,
        { params: { termId } }
      )

      setPreview(response.data)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to generate transcript preview.'
      )
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleTermChange(termId) {
    setSelectedTerm(termId)
    setPreview(null)
    setCreatedTranscript(null)
    setError('')
    setSuccess('')

    if (selectedStudent && termId) {
      await loadPreview(selectedStudent.student_id, termId)
    }
  }

  async function createDraft() {
    if (!selectedStudent || !selectedTerm) return

    try {
      setCreatingDraft(true)
      setError('')
      setSuccess('')

      const response = await api.post(
        '/secretary/transcripts/drafts',
        {
          studentId: selectedStudent.student_id,
          termId: selectedTerm,
        }
      )

      setCreatedTranscript(response.data.transcript)
      setSuccess(response.data.message)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to create transcript draft.'
      )
    } finally {
      setCreatingDraft(false)
    }
  }

  async function issueDraft() {
    if (!createdTranscript?.id) return

    const confirmed = window.confirm(
      'Issue this transcript officially? Students will be able to see it in their portal.'
    )

    if (!confirmed) return

    try {
      setIssuing(true)
      setError('')
      setSuccess('')

      const response = await api.patch(
        `/secretary/transcripts/${createdTranscript.id}/issue`
      )

      setCreatedTranscript(response.data.transcript)
      setSuccess(response.data.message)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to issue this transcript.'
      )
    } finally {
      setIssuing(false)
    }
  }

  const isIssued = createdTranscript?.status === 'ISSUED'

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
      {/* Heading */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-[#718096]">
          <span>Secretary</span>
          <span>/</span>
          <span className="font-medium text-[#567CBD]">
            Transcript Management
          </span>
        </div>

        <h1 className="text-2xl font-bold text-[#2F4156] md:text-3xl">
          Secretary Dashboard
        </h1>

        <p className="mt-2 text-sm text-[#718096]">
          Search student records and manage official academic transcripts.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={19} />
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Students Found"
          value={students.length}
          icon={Users}
        />
        <SummaryCard
          title="Academic Terms"
          value={terms.length}
          icon={CalendarDays}
        />
        <SummaryCard
          title="Selected Student"
          value={selectedStudent ? selectedStudent.student_number : 'None'}
          icon={GraduationCap}
        />
      </div>

      {/* Search and term selection */}
      <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5">
          <h2 className="font-bold text-[#2F4156]">
            Find a Student
          </h2>
          <p className="mt-1 text-xs text-[#718096]">
            Search by student number, name, or university email.
          </p>
        </div>

        <form
          onSubmit={searchStudents}
          className="flex flex-col gap-3 md:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A0AEC0]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Enter student number, name, or email..."
              className="w-full rounded-xl border border-[#DCE3EA] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#567CBD]"
            />
          </div>

          <button
            type="submit"
            disabled={loadingStudents}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#567CBD] px-6 py-3 text-sm font-semibold text-white hover:bg-[#456AA8] disabled:opacity-60"
          >
            {loadingStudents ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Search size={17} />
            )}
            Search
          </button>
        </form>

        <div className="mt-5 max-w-md">
          <label
            htmlFor="academic-term"
            className="mb-2 block text-sm font-semibold text-[#2F4156]"
          >
            Academic Term
          </label>

          <select
            id="academic-term"
            value={selectedTerm}
            onChange={(event) => handleTermChange(event.target.value)}
            disabled={loadingTerms || terms.length === 0}
            className="w-full rounded-xl border border-[#DCE3EA] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
          >
            {loadingTerms ? (
              <option value="">Loading terms...</option>
            ) : terms.length === 0 ? (
              <option value="">No academic terms available</option>
            ) : (
              terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name} · {term.academic_year}
                  {term.is_active ? ' (Active)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Search results */}
        {students.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-[#E7E3DF]">
            <div className="border-b border-[#E7E3DF] bg-[#F5EFEB] px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#718096]">
                Search Results
              </h3>
            </div>

            <div className="divide-y divide-[#E7E3DF]">
              {students.map((student) => {
                const selected =
                  selectedStudent?.student_id === student.student_id

                return (
                  <button
                    key={student.student_id}
                    type="button"
                    onClick={() => selectStudent(student)}
                    className={`flex w-full flex-col justify-between gap-3 px-4 py-4 text-left transition sm:flex-row sm:items-center ${
                      selected
                        ? 'bg-blue-50'
                        : 'bg-white hover:bg-[#FCFBFA]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#CBD9E6] text-[#2F4156]">
                        <GraduationCap size={20} />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#2F4156]">
                          {student.first_name} {student.last_name}
                        </p>
                        <p className="mt-1 text-xs text-[#718096]">
                          {student.student_number} · {student.email}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs font-medium text-[#2F4156]">
                        {student.department_name || 'No department'}
                      </p>
                      <p className="mt-1 text-xs text-[#718096]">
                        Year {student.year_level ?? '—'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Preview loading */}
      {loadingPreview && (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#718096]">
          <LoaderCircle size={22} className="animate-spin" />
          Preparing academic transcript preview...
        </div>
      )}

      {/* Transcript preview */}
      {preview && !loadingPreview && (
        <>
          <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-[#2F4156]">
                  Transcript Preview
                </h2>
                <p className="mt-1 text-xs text-[#718096]">
                  {preview.student.first_name} {preview.student.last_name}
                  {' · '}
                  {preview.student.student_number}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                <FileText size={15} />
                Preview — Not Official
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                title="Eligible Courses"
                value={preview.summary.totalCourses}
                icon={BookOpen}
              />
              <SummaryCard
                title="Total Credits"
                value={preview.summary.totalCredits}
                icon={GraduationCap}
              />
              <SummaryCard
                title="Calculated GPA"
                value={formatGPA(preview.summary.cumulativeGpa)}
                icon={FileCheck}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
            <div className="border-b border-[#E7E3DF] p-5">
              <h2 className="font-bold text-[#2F4156]">
                Completed Courses and Published Final Grades
              </h2>
              <p className="mt-1 text-xs text-[#718096]">
                Only completed enrollments with published FINAL assessment grades are included.
              </p>
            </div>

            {preview.courses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="bg-[#F5EFEB] text-xs uppercase tracking-wide text-[#718096]">
                    <tr>
                      <th className="px-5 py-4">Course Code</th>
                      <th className="px-5 py-4">Course Name</th>
                      <th className="px-5 py-4 text-center">Credits</th>
                      <th className="px-5 py-4 text-center">Final Grade</th>
                      <th className="px-5 py-4 text-center">Grade Points</th>
                      <th className="px-5 py-4 text-center">Counts in GPA</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E7E3DF]">
                    {preview.courses.map((course) => (
                      <tr key={course.id}>
                        <td className="px-5 py-4 font-semibold text-[#2F4156]">
                          {course.course_code}
                        </td>
                        <td className="px-5 py-4 text-[#2F4156]">
                          {course.course_name}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {course.credits}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-[#567CBD]">
                          {course.letter_grade || '—'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {course.quality_points ?? '—'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {course.counts_toward_gpa ? (
                            <CheckCircle2
                              size={17}
                              className="mx-auto text-emerald-600"
                            />
                          ) : (
                            <span className="text-xs text-[#718096]">
                              No
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-[#718096]">
                No eligible courses were found for this student and term.
              </div>
            )}
          </section>

          {/* Draft and issue actions */}
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:flex-row md:items-center md:p-6">
            <div>
              <h3 className="font-bold text-[#2F4156]">
                Transcript Workflow
              </h3>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#718096]">
                Generate a draft for review. Issuing it makes the transcript
                visible to the student in their portal.
              </p>

              {createdTranscript && (
                <p className="mt-2 text-xs font-semibold text-[#567CBD]">
                  {createdTranscript.transcript_number}
                  {' · '}
                  {createdTranscript.status}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  selectedStudent &&
                  loadPreview(selectedStudent.student_id, selectedTerm)
                }
                disabled={loadingPreview}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3EA] px-4 py-2.5 text-sm font-semibold text-[#2F4156] hover:bg-[#F5EFEB]"
              >
                <RefreshCw size={16} />
                Refresh Preview
              </button>

              {!createdTranscript && (
                <button
                  type="button"
                  onClick={createDraft}
                  disabled={
                    creatingDraft ||
                    preview.courses.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#567CBD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#456AA8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingDraft ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <FileText size={16} />
                  )}
                  Generate Draft
                </button>
              )}

              {createdTranscript && !isIssued && (
                <button
                  type="button"
                  onClick={issueDraft}
                  disabled={issuing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {issuing ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  Issue Transcript
                </button>
              )}

              {isIssued && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 size={17} />
                  Officially Issued
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
