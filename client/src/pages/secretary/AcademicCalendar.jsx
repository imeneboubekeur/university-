
import { useCallback, useEffect, useState } from 'react'
import {
  CalendarDays,
  Plus,
  Clock,
  BookOpen,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Power,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const initialTermForm = {
  name: '',
  academicYear: '',
  semester: '1',
  startDate: '',
  endDate: '',
}

const initialWindowForm = {
  registrationOpensAt: '',
  registrationClosesAt: '',
  addDropOpensAt: '',
  addDropClosesAt: '',
  sectionChangeOpensAt: '',
  sectionChangeClosesAt: '',
}

function formatDate(value, includeTime = false) {
  if (!value) return 'Not specified'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Invalid date'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? { hour: '2-digit', minute: '2-digit' }
      : {}),
  }).format(date)
}

function getSemesterName(semester) {
  return Number(semester) === 1 ? 'Fall' : 'Spring'
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? 'bg-green-50 text-green-700'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function DateRange({ label, start, end }) {
  return (
    <div className="rounded-xl border border-[#E7E3DF] bg-[#FAFAF9] p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#2F4156]">
        <span>{formatDate(start, true)}</span>
        <span className="text-gray-400">→</span>
        <span>{formatDate(end, true)}</span>
      </div>
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#2F4156]">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-[#E3E5E8] bg-white px-3.5 py-2.5 text-sm text-[#2F4156] outline-none transition focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

export default function AcademicCalendar() {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showTermForm, setShowTermForm] = useState(false)
  const [expandedTerms, setExpandedTerms] = useState({})
  const [windowTerm, setWindowTerm] = useState(null)

  const [termForm, setTermForm] = useState(initialTermForm)
  const [windowForm, setWindowForm] = useState(initialWindowForm)

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.')
    }

    return data
  }, [])

  const loadCalendar = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const data = await request('/secretary/calendar')
      setTerms(data.terms || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => {
    loadCalendar()
  }, [loadCalendar])

  function showSuccess(message) {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 3500)
  }

  function toggleExpanded(termId) {
    setExpandedTerms((previous) => ({
      ...previous,
      [termId]: !previous[termId],
    }))
  }

  async function handleCreateTerm(event) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')

      await request('/secretary/calendar/terms', {
        method: 'POST',
        body: JSON.stringify(termForm),
      })

      setTermForm(initialTermForm)
      setShowTermForm(false)
      showSuccess('Academic term created successfully.')
      await loadCalendar()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateWindow(event) {
    event.preventDefault()

    if (!windowTerm) return

    try {
      setSubmitting(true)
      setError('')

      const payload = Object.fromEntries(
        Object.entries(windowForm).map(([key, value]) => [
          key,
          new Date(value).toISOString(),
        ])
      )

      await request(
        `/secretary/calendar/terms/${windowTerm.id}/windows`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )

      setWindowForm(initialWindowForm)
      setWindowTerm(null)
      showSuccess('Registration window created successfully.')
      await loadCalendar()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleTermStatus(term) {
    try {
      setError('')

      await request(`/secretary/calendar/terms/${term.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !term.is_active }),
      })

      showSuccess('Academic term status updated.')
      await loadCalendar()
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleWindowStatus(window) {
    try {
      setError('')

      await request(`/secretary/calendar/windows/${window.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !window.is_active }),
      })

      showSuccess('Registration window status updated.')
      await loadCalendar()
    } catch (err) {
      setError(err.message)
    }
  }

  const activeTerms = terms.filter((term) => term.is_active).length
  const activeWindows = terms.reduce(
    (total, term) =>
      total + term.registration_windows.filter((window) => window.is_active).length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <CalendarDays size={16} />
            <span>Secretary</span>
            <span>/</span>
            <span>Academic Calendar</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#2F4156]">
            Academic Calendar
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage academic terms and student registration periods across the university.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadCalendar}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => setShowTermForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243448]"
          >
            <Plus size={17} />
            Create term
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total terms</p>
            <CalendarDays className="text-[#567CBD]" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {terms.length}
          </p>
          <p className="mt-1 text-xs text-gray-400">University-wide terms</p>
        </div>

        <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Active terms</p>
            <BookOpen className="text-green-600" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {activeTerms}
          </p>
          <p className="mt-1 text-xs text-gray-400">Currently enabled</p>
        </div>

        <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Active registration windows</p>
            <Clock className="text-[#567CBD]" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {activeWindows}
          </p>
          <p className="mt-1 text-xs text-gray-400">Across all academic terms</p>
        </div>
      </div>

      {/* Create term form */}
      {showTermForm && (
        <div className="rounded-2xl border border-[#E4E7EB] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#2F4156]">
                Create academic term
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Add a new university-wide academic term.
              </p>
            </div>
            <button
              onClick={() => setShowTermForm(false)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleCreateTerm} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Term name">
                <input
                  required
                  value={termForm.name}
                  onChange={(e) =>
                    setTermForm({ ...termForm, name: e.target.value })
                  }
                  placeholder="Fall 2026"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Academic year">
                <input
                  required
                  value={termForm.academicYear}
                  onChange={(e) =>
                    setTermForm({ ...termForm, academicYear: e.target.value })
                  }
                  placeholder="2026-2027"
                  className={inputClass}
                />
              </FormField>

              <FormField label="Semester">
                <select
                  value={termForm.semester}
                  onChange={(e) =>
                    setTermForm({ ...termForm, semester: e.target.value })
                  }
                  className={inputClass}
                >
                  <option value="1">Fall — Semester 1</option>
                  <option value="2">Spring — Semester 2</option>
                </select>
              </FormField>

              <FormField label="Start date">
                <input
                  required
                  type="date"
                  value={termForm.startDate}
                  onChange={(e) =>
                    setTermForm({ ...termForm, startDate: e.target.value })
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="End date">
                <input
                  required
                  type="date"
                  value={termForm.endDate}
                  onChange={(e) =>
                    setTermForm({ ...termForm, endDate: e.target.value })
                  }
                  className={inputClass}
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTermForm(false)}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                className="rounded-xl bg-[#567CBD] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#456BAA] disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create academic term'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Registration window form */}
      {windowTerm && (
        <div className="rounded-2xl border border-[#D7E1EF] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#2F4156]">
                Registration periods
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {windowTerm.name} · {windowTerm.academic_year}
              </p>
            </div>
            <button
              onClick={() => setWindowTerm(null)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={19} />
            </button>
          </div>

          <form onSubmit={handleCreateWindow} className="space-y-5">
            {[
              {
                title: 'Course registration',
                start: 'registrationOpensAt',
                end: 'registrationClosesAt',
              },
              {
                title: 'Add / Drop period',
                start: 'addDropOpensAt',
                end: 'addDropClosesAt',
              },
              {
                title: 'Section change period',
                start: 'sectionChangeOpensAt',
                end: 'sectionChangeClosesAt',
              },
            ].map((period) => (
              <div
                key={period.title}
                className="rounded-xl border border-[#E7E3DF] bg-[#FAFAF9] p-4"
              >
                <h3 className="mb-3 text-sm font-semibold text-[#2F4156]">
                  {period.title}
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Opens at">
                    <input
                      required
                      type="datetime-local"
                      value={windowForm[period.start]}
                      onChange={(e) =>
                        setWindowForm({
                          ...windowForm,
                          [period.start]: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Closes at">
                    <input
                      required
                      type="datetime-local"
                      value={windowForm[period.end]}
                      onChange={(e) =>
                        setWindowForm({
                          ...windowForm,
                          [period.end]: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </FormField>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWindowTerm(null)}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                className="rounded-xl bg-[#567CBD] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#456BAA] disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save registration periods'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Terms list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#2F4156]">
              Academic terms
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              All academic terms configured for the university.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-sm text-gray-500">
            Loading academic calendar...
          </div>
        ) : terms.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
            <CalendarDays size={35} className="mx-auto text-gray-300" />
            <h3 className="mt-3 font-semibold text-[#2F4156]">
              No academic terms yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create the first academic term to start configuring the calendar.
            </p>
            <button
              onClick={() => setShowTermForm(true)}
              className="mt-4 rounded-xl bg-[#567CBD] px-4 py-2 text-sm font-semibold text-white"
            >
              Create first term
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {terms.map((term) => {
              const expanded = expandedTerms[term.id]
              const windows = term.registration_windows || []

              return (
                <div
                  key={term.id}
                  className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm"
                >
                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-[#EDF2F8] p-3 text-[#567CBD]">
                        <CalendarDays size={23} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[#2F4156]">
                            {term.name}
                          </h3>
                          <StatusBadge active={term.is_active} />
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          {term.academic_year} · {getSemesterName(term.semester)}
                        </p>

                        <p className="mt-2 text-xs text-gray-500">
                          {formatDate(term.start_date)} – {formatDate(term.end_date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setWindowTerm(term)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#EDF2F8] px-3.5 py-2.5 text-sm font-semibold text-[#456BAA] hover:bg-[#E0E9F4]"
                      >
                        <Plus size={16} />
                        Add periods
                      </button>

                      <button
                        onClick={() => toggleTermStatus(term)}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#E4E5E7] px-3.5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Power size={15} />
                        {term.is_active ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => toggleExpanded(term.id)}
                        className="rounded-xl border border-[#E4E5E7] p-2.5 text-gray-500 hover:bg-gray-50"
                        aria-label="Toggle term details"
                      >
                        {expanded ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-[#ECE9E6] bg-[#FCFCFB] p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-[#2F4156]">
                            Registration windows
                          </h4>
                          <p className="mt-1 text-xs text-gray-500">
                            {windows.length} configured window(s)
                          </p>
                        </div>
                      </div>

                      {windows.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                          <Clock size={25} className="mx-auto text-gray-300" />
                          <p className="mt-2 text-sm text-gray-500">
                            No registration periods configured for this term.
                          </p>
                          <button
                            onClick={() => setWindowTerm(term)}
                            className="mt-3 text-sm font-semibold text-[#567CBD] hover:underline"
                          >
                            Add registration periods
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {windows.map((window) => (
                            <div
                              key={window.id}
                              className="rounded-xl border border-[#E7E3DF] bg-white p-4"
                            >
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-semibold text-[#2F4156]">
                                    Registration window
                                  </h5>
                                  <StatusBadge active={window.is_active} />
                                </div>

                                <button
                                  onClick={() => toggleWindowStatus(window)}
                                  className="text-xs font-semibold text-[#567CBD] hover:underline"
                                >
                                  {window.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>

                              <div className="grid gap-3 lg:grid-cols-3">
                                <DateRange
                                  label="Course registration"
                                  start={window.registration_opens_at}
                                  end={window.registration_closes_at}
                                />
                                <DateRange
                                  label="Add / Drop"
                                  start={window.add_drop_opens_at}
                                  end={window.add_drop_closes_at}
                                />
                                <DateRange
                                  label="Section change"
                                  start={window.section_change_opens_at}
                                  end={window.section_change_closes_at}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
