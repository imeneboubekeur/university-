
import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap,
  ClipboardList,
  Users,
  Percent,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  Search,
  LockKeyhole,
  BookOpen,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function statusStyle(status) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-blue-50 text-blue-700'
    case 'APPROVED':
      return 'bg-purple-50 text-purple-700'
    case 'PUBLISHED':
      return 'bg-green-50 text-green-700'
    default:
      return 'bg-amber-50 text-amber-700'
  }
}

export default function ProfessorGrades() {
  const [sections, setSections] = useState([])
  const [assessments, setAssessments] = useState([])
  const [students, setStudents] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedSection = sections.find(
    (section) => section.section_id === selectedSectionId
  )

  const selectedAssessment = assessments.find(
    (assessment) => assessment.id === selectedAssessmentId
  )

  const locked = students.some(
    (student) => student.grade_status && student.grade_status !== 'DRAFT'
  )

  const filteredStudents = useMemo(() => {
    const term = search.toLowerCase().trim()

    if (!term) return students

    return students.filter((student) =>
      [
        student.first_name,
        student.last_name,
        student.student_number,
        student.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [students, search])

  const completedCount = students.filter(
    (student) => student.score !== null && student.score !== ''
  ).length

  const averageScore = useMemo(() => {
    const scores = students
      .map((student) => student.score)
      .filter((score) => score !== null && score !== '')
      .map(Number)

    if (!scores.length) return 0

    return scores.reduce((total, score) => total + score, 0) / scores.length
  }, [students])

  async function request(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.')
    }

    return data
  }

  async function loadSections() {
    try {
      setLoading(true)
      setError('')

      const data = await request('/professor/grades')

      setSections(data.sections || [])

      if (data.sections?.length) {
        setSelectedSectionId(data.sections[0].section_id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadGradebook(sectionId, assessmentId = '') {
    if (!sectionId) {
      setAssessments([])
      setStudents([])
      setSelectedAssessmentId('')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const params = new URLSearchParams({ sectionId })

      if (assessmentId) {
        params.set('assessmentId', assessmentId)
      }

      const data = await request(
        `/professor/grades?${params.toString()}`
      )

      setAssessments(data.assessments || [])
      setStudents(
        (data.students || []).map((student) => ({
          ...student,
          score:
            student.score === null || student.score === undefined
              ? ''
              : String(student.score),
        }))
      )
    } catch (err) {
      setError(err.message)
      setAssessments([])
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSections()
  }, [])

  useEffect(() => {
    if (!selectedSectionId) return

    setSelectedAssessmentId('')
    setAssessments([])
    setStudents([])
    loadGradebook(selectedSectionId, '')
  }, [selectedSectionId])

  useEffect(() => {
    if (!selectedSectionId || !selectedAssessmentId) {
      setStudents([])
      return
    }

    loadGradebook(selectedSectionId, selectedAssessmentId)
  }, [selectedAssessmentId])

  function updateScore(enrollmentId, value) {
    setStudents((current) =>
      current.map((student) =>
        student.enrollment_id === enrollmentId
          ? { ...student, score: value }
          : student
      )
    )
  }

  async function handleSave() {
    if (!selectedSectionId || !selectedAssessmentId) {
      setError('Select a section and assessment first.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const data = await request('/professor/grades/save', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: selectedSectionId,
          assessmentId: selectedAssessmentId,
          grades: students.map((student) => ({
            enrollmentId: student.enrollment_id,
            score: student.score === '' ? null : Number(student.score),
          })),
        }),
      })

      setSuccess(data.message)
      await loadGradebook(selectedSectionId, selectedAssessmentId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!selectedSectionId || !selectedAssessmentId) return

    if (completedCount !== students.length) {
      setError('Enter a score for every enrolled student before submitting.')
      return
    }

    const confirmed = window.confirm(
      'Submit these grades for review? You will no longer be able to edit them.'
    )

    if (!confirmed) return

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const data = await request('/professor/grades/submit', {
        method: 'POST',
        body: JSON.stringify({
          sectionId: selectedSectionId,
          assessmentId: selectedAssessmentId,
        }),
      })

      setSuccess(data.message)
      await loadGradebook(selectedSectionId, selectedAssessmentId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[#E2E7ED] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

  const labelClass =
    'mb-2 block text-xs font-semibold uppercase tracking-wide text-[#68788A]'

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            Academic management
          </p>
          <h1 className="text-2xl font-bold text-[#2F4156]">
            Grade Management
          </h1>
          <p className="mt-1 text-sm text-[#8290A0]">
            Enter, save, and submit assessment grades for your students.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm md:grid-cols-2">
        <div>
          <label className={labelClass}>Course section</label>
          <select
            value={selectedSectionId}
            onChange={(event) => {
              setSelectedSectionId(event.target.value)
              setSearch('')
            }}
            className={inputClass}
          >
            <option value="">Select a section</option>
            {sections.map((section) => (
              <option key={section.section_id} value={section.section_id}>
                {section.course_code} — {section.course_name} · Section{' '}
                {section.section_code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Assessment</label>
          <select
            value={selectedAssessmentId}
            onChange={(event) => setSelectedAssessmentId(event.target.value)}
            disabled={!selectedSectionId || assessments.length === 0}
            className={inputClass}
          >
            <option value="">Select an assessment</option>
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name} · {assessment.percentage}%
              </option>
            ))}
          </select>
        </div>

        {selectedSection && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#68788A] md:col-span-2">
            <span className="inline-flex items-center gap-2">
              <BookOpen size={16} />
              {selectedSection.course_code}
            </span>
            <span>Section {selectedSection.section_code}</span>
            <span>
              {selectedSection.academic_year} · Semester{' '}
              {selectedSection.semester}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center text-sm text-[#8290A0]">
          Loading gradebook...
        </div>
      ) : !sections.length ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center">
          <GraduationCap
            size={36}
            className="mx-auto mb-3 text-[#9AA8B7]"
          />
          <h3 className="font-semibold text-[#2F4156]">
            No assigned sections
          </h3>
          <p className="mt-1 text-sm text-[#8290A0]">
            Your assigned course sections will appear here.
          </p>
        </div>
      ) : !selectedSectionId ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-10 text-center text-sm text-[#8290A0]">
          Select a section to continue.
        </div>
      ) : !assessments.length ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center">
          <ClipboardList
            size={34}
            className="mx-auto mb-3 text-[#9AA8B7]"
          />
          <h3 className="font-semibold text-[#2F4156]">
            No assessments available
          </h3>
          <p className="mt-1 text-sm text-[#8290A0]">
            Create an assessment in the Assessments section before entering grades.
          </p>
        </div>
      ) : !selectedAssessmentId ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-10 text-center text-sm text-[#8290A0]">
          Select an assessment to open its gradebook.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8290A0]">Enrolled students</span>
                <Users size={20} className="text-[#567CBD]" />
              </div>
              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {students.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8290A0]">Scores entered</span>
                <ClipboardList size={20} className="text-[#567CBD]" />
              </div>
              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {completedCount} / {students.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8290A0]">Average score</span>
                <Percent size={20} className="text-[#567CBD]" />
              </div>
              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {completedCount ? formatNumber(averageScore) : '—'}
                <span className="ml-1 text-sm font-medium text-[#9AA5B1]">
                  / {formatNumber(selectedAssessment?.max_score)}
                </span>
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E8E5E1] bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-[#EAECEF] p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-[#2F4156]">
                  Student gradebook
                </h2>
                <p className="mt-1 text-xs text-[#8290A0]">
                  {selectedAssessment?.name} · Maximum score:{' '}
                  {formatNumber(selectedAssessment?.max_score)}
                </p>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA5B1]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search students..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            {locked && (
              <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-5 py-3 text-sm text-blue-800">
                <LockKeyhole size={17} />
                Grades have been submitted or finalized. Editing is disabled.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-[#EAECEF] bg-[#FAFBFC] text-[11px] uppercase tracking-wide text-[#8290A0]">
                    <th className="px-5 py-4 font-semibold">Student</th>
                    <th className="px-5 py-4 font-semibold">Student number</th>
                    <th className="px-5 py-4 font-semibold">Score</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const studentLocked =
                      student.grade_status &&
                      student.grade_status !== 'DRAFT'

                    return (
                      <tr
                        key={student.enrollment_id}
                        className="border-b border-[#F0F1F3] last:border-0 hover:bg-[#FAFBFC]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#2F4156]">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="mt-1 text-xs text-[#9AA5B1]">
                            {student.email}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-[#68788A]">
                          {student.student_number}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={selectedAssessment?.max_score}
                              step="0.01"
                              value={student.score}
                              disabled={studentLocked}
                              onChange={(event) =>
                                updateScore(
                                  student.enrollment_id,
                                  event.target.value
                                )
                              }
                              placeholder="Not graded"
                              className="w-32 rounded-lg border border-[#E2E7ED] px-3 py-2 text-sm outline-none focus:border-[#567CBD] disabled:bg-[#F3F5F7] disabled:text-[#8290A0]"
                            />
                            <span className="text-xs text-[#9AA5B1]">
                              / {formatNumber(selectedAssessment?.max_score)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(student.grade_status)}`}
                          >
                            {student.grade_status || 'DRAFT'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-5 py-12 text-center text-sm text-[#8290A0]"
                      >
                        {students.length
                          ? 'No students match your search.'
                          : 'No enrolled students in this section.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-[#EAECEF] bg-[#FAFBFC] p-5 sm:flex-row sm:items-center">
              <p className="text-xs text-[#8290A0]">
                {completedCount} of {students.length} students have scores.
                {selectedAssessment &&
                  ` Maximum score: ${formatNumber(selectedAssessment.max_score)}.`}
              </p>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || locked || students.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE2E9] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] hover:bg-[#F3F5F7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    locked ||
                    students.length === 0 ||
                    completedCount !== students.length
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#24364A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={16} />
                  {submitting ? 'Submitting...' : 'Submit Grades'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
