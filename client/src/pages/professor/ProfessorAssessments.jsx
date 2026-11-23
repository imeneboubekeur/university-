
import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
  CheckCircle2,
  FileText,
  Percent,
  Users,
  BookOpen,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const ASSESSMENT_TYPES = [
  { value: 'MIDTERM', label: 'Midterm' },
  { value: 'FINAL', label: 'Final' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'OTHER', label: 'Other' },
]

const EMPTY_FORM = {
  name: '',
  type: 'MIDTERM',
  percentage: '',
  maxScore: '100',
}

function formatType(type) {
  return ASSESSMENT_TYPES.find((item) => item.value === type)?.label || type
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

export default function ProfessorAssessments() {
  const [sections, setSections] = useState([])
  const [assessments, setAssessments] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedSection = sections.find(
    (section) => section.section_id === selectedSectionId
  )

  const totalPercentage = useMemo(
    () => assessments.reduce(
      (total, assessment) => total + Number(assessment.percentage || 0),
      0
    ),
    [assessments]
  )

  const remainingPercentage = Math.max(0, 100 - totalPercentage)

  const filteredAssessments = assessments.filter((assessment) =>
    assessment.name.toLowerCase().includes(search.toLowerCase()) ||
    formatType(assessment.type).toLowerCase().includes(search.toLowerCase())
  )

  async function loadAssessments(sectionId = selectedSectionId) {
    try {
      setLoading(true)
      setError('')

      const url = new URL(`${API_URL}/professor/assessments`)

      if (sectionId) {
        url.searchParams.set('sectionId', sectionId)
      }

      const response = await fetch(url, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load assessments.')
      }

      setSections(data.sections || [])
      setAssessments(data.assessments || [])

      if (!sectionId && data.sections?.length > 0) {
        setSelectedSectionId(data.sections[0].section_id)
      }

      if (!data.sections?.length) {
        setSelectedSectionId('')
        setAssessments([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssessments('')
  }, [])

  useEffect(() => {
    if (selectedSectionId) {
      loadAssessments(selectedSectionId)
    } else {
      setAssessments([])
    }
  }, [selectedSectionId])

  function openCreateForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  function openEditForm(assessment) {
    setEditingId(assessment.id)
    setForm({
      name: assessment.name,
      type: assessment.type,
      percentage: String(assessment.percentage),
      maxScore: String(assessment.max_score),
    })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!selectedSectionId) {
      setError('Please select a section first.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const isEditing = Boolean(editingId)

      const response = await fetch(
        isEditing
          ? `${API_URL}/professor/assessments/${editingId}`
          : `${API_URL}/professor/assessments`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            sectionId: selectedSectionId,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to save assessment.')
      }

      closeForm()
      setSuccess(data.message || 'Assessment saved successfully.')
      await loadAssessments(selectedSectionId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(assessment) {
    const confirmed = window.confirm(
      `Delete "${assessment.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setError('')
      setSuccess('')

      const response = await fetch(
        `${API_URL}/professor/assessments/${assessment.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete assessment.')
      }

      setSuccess(data.message || 'Assessment deleted successfully.')
      await loadAssessments(selectedSectionId)
    } catch (err) {
      setError(err.message)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[#E2E7ED] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none transition focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

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
            Assessments
          </h1>
          <p className="mt-1 text-sm text-[#8290A0]">
            Create and manage assessments for your assigned sections.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          disabled={!selectedSectionId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24364A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={18} />
          Create Assessment
        </button>
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

      <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
        <label className={labelClass}>Select course section</label>

        <select
          value={selectedSectionId}
          onChange={(event) => {
            setSelectedSectionId(event.target.value)
            setSearch('')
            setSuccess('')
            setError('')
          }}
          className={`${inputClass} max-w-2xl`}
        >
          <option value="">Choose a section</option>
          {sections.map((section) => (
            <option key={section.section_id} value={section.section_id}>
              {section.course_code} — {section.course_name} · Section{' '}
              {section.section_code} · {section.term_name}
            </option>
          ))}
        </select>

        {selectedSection && (
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#68788A]">
            <span className="inline-flex items-center gap-2">
              <BookOpen size={16} />
              {selectedSection.course_code}
            </span>
            <span>
              Section {selectedSection.section_code}
            </span>
            <span>
              {selectedSection.academic_year} · Semester{' '}
              {selectedSection.semester}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center text-sm text-[#8290A0]">
          Loading assessments...
        </div>
      ) : !sections.length ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center">
          <BookOpen className="mx-auto mb-3 text-[#9AA8B7]" size={34} />
          <h3 className="font-semibold text-[#2F4156]">
            No assigned sections
          </h3>
          <p className="mt-1 text-sm text-[#8290A0]">
            Sections assigned to you will appear here.
          </p>
        </div>
      ) : !selectedSectionId ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center text-sm text-[#8290A0]">
          Select a section to view its assessments.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8290A0]">Assessments</span>
                <ClipboardList className="text-[#567CBD]" size={20} />
              </div>
              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {assessments.length}
              </p>
              <p className="mt-1 text-xs text-[#9AA5B1]">
                In this section
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8290A0]">Allocated</span>
                <Percent className="text-[#567CBD]" size={20} />
              </div>
              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {formatNumber(totalPercentage)}%
              </p>
              <p className="mt-1 text-xs text-[#9AA5B1]">
                Of the final course grade
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8290A0]">Remaining</span>
                <FileText className="text-[#567CBD]" size={20} />
              </div>
              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {formatNumber(remainingPercentage)}%
              </p>
              <p className="mt-1 text-xs text-[#9AA5B1]">
                Available percentage
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-[#2F4156]">
                  Assessment list
                </h2>
                <p className="mt-1 text-xs text-[#8290A0]">
                  Manage the assessment structure for this section.
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
                  placeholder="Search assessments..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-[#68788A]">
                  Grade distribution
                </span>
                <span className="font-semibold text-[#2F4156]">
                  {formatNumber(totalPercentage)} / 100%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F4]">
                <div
                  className={`h-full rounded-full transition-all ${
                    totalPercentage > 100 ? 'bg-red-500' : 'bg-[#567CBD]'
                  }`}
                  style={{
                    width: `${Math.min(totalPercentage, 100)}%`,
                  }}
                />
              </div>
            </div>

            {filteredAssessments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#DCE2E9] px-5 py-12 text-center">
                <ClipboardList
                  size={32}
                  className="mx-auto mb-3 text-[#A6B1BD]"
                />
                <h3 className="font-semibold text-[#2F4156]">
                  {assessments.length
                    ? 'No matching assessments'
                    : 'No assessments yet'}
                </h3>
                <p className="mt-1 text-sm text-[#8290A0]">
                  {assessments.length
                    ? 'Try another search term.'
                    : 'Create the first assessment for this section.'}
                </p>
                {!assessments.length && (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#567CBD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#456BAA]"
                  >
                    <Plus size={16} />
                    Create Assessment
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-[#EAECEF] text-[11px] uppercase tracking-wide text-[#8290A0]">
                      <th className="px-3 py-3 font-semibold">Assessment</th>
                      <th className="px-3 py-3 font-semibold">Type</th>
                      <th className="px-3 py-3 font-semibold">Weight</th>
                      <th className="px-3 py-3 font-semibold">Max score</th>
                      <th className="px-3 py-3 font-semibold">Grade records</th>
                      <th className="px-3 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssessments.map((assessment) => (
                      <tr
                        key={assessment.id}
                        className="border-b border-[#F0F1F3] last:border-0 hover:bg-[#FAFBFC]"
                      >
                        <td className="px-3 py-4">
                          <p className="font-semibold text-[#2F4156]">
                            {assessment.name}
                          </p>
                          <p className="mt-1 text-xs text-[#9AA5B1]">
                            Created{' '}
                            {new Date(assessment.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="rounded-full bg-[#EEF3FA] px-3 py-1.5 text-xs font-medium text-[#567CBD]">
                            {formatType(assessment.type)}
                          </span>
                        </td>
                        <td className="px-3 py-4 font-semibold text-[#2F4156]">
                          {formatNumber(assessment.percentage)}%
                        </td>
                        <td className="px-3 py-4 text-sm text-[#68788A]">
                          {formatNumber(assessment.max_score)}
                        </td>
                        <td className="px-3 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm text-[#68788A]">
                            <Users size={15} />
                            {assessment.grade_count}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(assessment)}
                              className="rounded-lg border border-[#E2E7ED] p-2 text-[#567CBD] transition hover:bg-[#EEF3FA]"
                              title="Edit assessment"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(assessment)}
                              disabled={Number(assessment.grade_count) > 0}
                              className="rounded-lg border border-[#F0DCDC] p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title={
                                Number(assessment.grade_count) > 0
                                  ? 'Cannot delete an assessment with grades'
                                  : 'Delete assessment'
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#172536]/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EAECEF] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-[#2F4156]">
                  {editingId ? 'Edit Assessment' : 'Create Assessment'}
                </h2>
                <p className="mt-1 text-xs text-[#8290A0]">
                  {selectedSection?.course_code} · Section{' '}
                  {selectedSection?.section_code}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-[#8290A0] hover:bg-[#F3F5F7]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className={labelClass}>Assessment name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. Midterm Examination"
                  maxLength={255}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Assessment type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={updateField}
                  className={inputClass}
                  required
                >
                  {ASSESSMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Weight (%)</label>
                  <input
                    type="number"
                    name="percentage"
                    value={form.percentage}
                    onChange={updateField}
                    min="0.01"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 30"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Maximum score</label>
                  <input
                    type="number"
                    name="maxScore"
                    value={form.maxScore}
                    onChange={updateField}
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 100"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#F5EFEB] p-4 text-xs leading-5 text-[#68788A]">
                The total weight of all assessments in this section cannot
                exceed 100%. Current allocation:{' '}
                <strong className="text-[#2F4156]">
                  {formatNumber(totalPercentage)}%
                </strong>
                .
              </div>

              <div className="flex justify-end gap-3 border-t border-[#EAECEF] pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-[#E2E7ED] px-5 py-2.5 text-sm font-semibold text-[#68788A] hover:bg-[#F8F9FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#24364A] disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save Changes'
                      : 'Create Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
