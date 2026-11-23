
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Plus,
  Search,
  Pencil,
  X,
  LoaderCircle,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Power,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

function formatDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatSemester(value) {
  return Number(value) === 1 ? 'Fall' : 'Spring'
}

function dateForInput(value) {
  if (!value) return ''

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const emptyForm = {
  name: '',
  academicYear: '',
  semester: '1',
  startDate: '',
  endDate: '',
  isActive: false,
}

export default function AcademicTerms() {
  const [terms, setTerms] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadTerms() {
    try {
      setLoading(true)
      setError('')

      const data = await apiRequest('/admin/terms')
      setTerms(data.terms || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTerms()
  }, [])

  const filteredTerms = useMemo(() => {
    const term = search.toLowerCase().trim()

    return terms.filter((item) => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.academic_year.toLowerCase().includes(term)

      const matchesSemester =
        semesterFilter === 'ALL' ||
        Number(item.semester) === Number(semesterFilter)

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.is_active) ||
        (statusFilter === 'INACTIVE' && !item.is_active)

      return matchesSearch && matchesSemester && matchesStatus
    })
  }, [terms, search, semesterFilter, statusFilter])

  const activeTerms = terms.filter((term) => term.is_active).length
  const inactiveTerms = terms.length - activeTerms
  const totalWindows = terms.reduce(
    (total, term) => total + Number(term.registration_window_count || 0),
    0
  )

  function openCreateModal() {
    setForm(emptyForm)
    setModal({ mode: 'create' })
    setError('')
    setSuccess('')
  }

  function openEditModal(term) {
    setForm({
      name: term.name,
      academicYear: term.academic_year,
      semester: String(term.semester),
      startDate: dateForInput(term.start_date),
      endDate: dateForInput(term.end_date),
      isActive: term.is_active,
    })

    setModal({ mode: 'edit', item: term })
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      const payload = {
        ...form,
        semester: Number(form.semester),
      }

      if (modal.mode === 'create') {
        await apiRequest('/admin/terms', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setSuccess('Academic term created successfully.')
      } else {
        await apiRequest(`/admin/terms/${modal.item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setSuccess('Academic term updated successfully.')
      }

      setModal(null)
      await loadTerms()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(term) {
    const action = term.is_active ? 'deactivate' : 'activate'

    if (!window.confirm(`Are you sure you want to ${action} this term?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await apiRequest(`/admin/terms/${term.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !term.is_active }),
      })

      setSuccess(
        `Academic term ${action}d successfully.`
      )
      await loadTerms()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            <CalendarDays size={15} />
            Academic administration
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156] sm:text-3xl">
            Academic Terms
          </h1>

          <p className="mt-2 text-sm text-[#7B8794]">
            Manage academic years, semesters and their active status.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#243548]"
        >
          <Plus size={17} />
          Create Academic Term
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total terms',
            value: terms.length,
            icon: GraduationCap,
            color: 'bg-[#EAF0F7] text-[#567CBD]',
          },
          {
            label: 'Active terms',
            value: activeTerms,
            icon: CheckCircle2,
            color: 'bg-green-50 text-green-600',
          },
          {
            label: 'Inactive terms',
            value: inactiveTerms,
            icon: Clock3,
            color: 'bg-[#F5EFEB] text-[#8A6D5B]',
          },
          {
            label: 'Registration windows',
            value: totalWindows,
            icon: CalendarDays,
            color: 'bg-blue-50 text-blue-600',
          },
        ].map((card) => {
          const Icon = card.icon

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#7B8794]">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-[#2F4156]">
                    {card.value}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${card.color}`}>
                  <Icon size={23} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && !modal && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E7E3DF] bg-white p-4 shadow-sm lg:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA4AF]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search academic year or term..."
            className="w-full rounded-xl border border-[#E7E3DF] bg-[#FAFAF9] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#567CBD]"
          />
        </div>

        <select
          value={semesterFilter}
          onChange={(event) => setSemesterFilter(event.target.value)}
          className="rounded-xl border border-[#E7E3DF] bg-white px-4 py-3 text-sm text-[#526171] outline-none focus:border-[#567CBD]"
        >
          <option value="ALL">All semesters</option>
          <option value="1">Fall</option>
          <option value="2">Spring</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-[#E7E3DF] bg-white px-4 py-3 text-sm text-[#526171] outline-none focus:border-[#567CBD]"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Terms table */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#EEEAE6] px-5 py-4">
          <div>
            <h2 className="font-bold text-[#2F4156]">Academic terms list</h2>
            <p className="mt-1 text-xs text-[#8A949F]">
              {filteredTerms.length} terms displayed
            </p>
          </div>
          <CalendarDays size={20} className="text-[#9AA4AF]" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderCircle size={28} className="animate-spin text-[#567CBD]" />
          </div>
        ) : filteredTerms.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays
              size={34}
              className="mx-auto mb-3 text-[#AAB2BC]"
            />
            <p className="font-semibold text-[#2F4156]">
              No academic terms found
            </p>
            <p className="mt-1 text-sm text-[#8A949F]">
              Create a term or change your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#FAFAF9] text-[11px] uppercase tracking-wider text-[#87919C]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Academic term</th>
                  <th className="px-5 py-4 font-semibold">Semester</th>
                  <th className="px-5 py-4 font-semibold">Start date</th>
                  <th className="px-5 py-4 font-semibold">End date</th>
                  <th className="px-5 py-4 font-semibold">Registration windows</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EDE9]">
                {filteredTerms.map((term) => (
                  <tr key={term.id} className="transition hover:bg-[#FCFBFA]">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#2F4156]">
                        {term.name}
                      </p>
                      <p className="mt-1 text-xs text-[#8A949F]">
                        {term.academic_year}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-[#EAF0F7] px-2.5 py-1.5 text-xs font-semibold text-[#567CBD]">
                        {formatSemester(term.semester)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#647181]">
                      {formatDate(term.start_date)}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#647181]">
                      {formatDate(term.end_date)}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#647181]">
                      {term.registration_window_count || 0}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                          term.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-[#F1F1F0] text-[#7B8794]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            term.is_active ? 'bg-green-500' : 'bg-[#9AA4AF]'
                          }`}
                        />
                        {term.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(term)}
                          title="Edit term"
                          className="rounded-lg border border-[#E7E3DF] p-2 text-[#647181] transition hover:bg-[#F5EFEB]"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleStatus(term)}
                          title={term.is_active ? 'Deactivate term' : 'Activate term'}
                          className={`rounded-lg border border-[#E7E3DF] p-2 transition ${
                            term.is_active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <Power size={15} />
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

      {/* Create / edit modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#172536]/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EEEAE6] px-6 py-5">
              <div>
                <h2 className="font-bold text-[#2F4156]">
                  {modal.mode === 'create' ? 'Create academic term' : 'Edit academic term'}
                </h2>
                <p className="mt-1 text-xs text-[#8A949F]">
                  Define the semester and its academic dates.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg p-2 text-[#7B8794] hover:bg-[#F5EFEB]"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                  Term name
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Fall 2026"
                  required
                  className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                    Academic year
                  </label>
                  <input
                    value={form.academicYear}
                    onChange={(event) =>
                      setForm({ ...form, academicYear: event.target.value })
                    }
                    placeholder="2026-2027"
                    required
                    className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                    Semester
                  </label>
                  <select
                    value={form.semester}
                    onChange={(event) =>
                      setForm({ ...form, semester: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E2DED9] bg-white px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                  >
                    <option value="1">Fall (1)</option>
                    <option value="2">Spring (2)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                    required
                    className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                    End date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm({ ...form, endDate: event.target.value })
                    }
                    min={form.startDate || undefined}
                    required
                    className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-[#E7E3DF] bg-[#FAFAF9] p-4">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                  className="h-4 w-4 accent-[#567CBD]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#2F4156]">
                    Set as active term
                  </span>
                  <span className="mt-1 block text-xs text-[#8A949F]">
                    This makes the term active for the platform.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-3 border-t border-[#EEEAE6] pt-5">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-xl border border-[#E2DED9] px-4 py-2.5 text-sm font-semibold text-[#647181] hover:bg-[#FAFAF9]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243548] disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving ? 'Saving...' : modal.mode === 'create' ? 'Create term' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
