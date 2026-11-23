
import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  GraduationCap,
  Building2,
  Pencil,
  X,
  LoaderCircle,
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
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
    throw new Error(data.message || 'Something went wrong.')
  }

  return data
}

export default function FacultyManagement() {
  const [faculties, setFaculties] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    code: '',
  })

  async function loadFaculties() {
    try {
      setLoading(true)
      setError('')

      const data = await apiRequest('/admin/faculties')
      setFaculties(data.faculties || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFaculties()
  }, [])

  const filteredFaculties = useMemo(() => {
    const term = search.toLowerCase().trim()

    if (!term) return faculties

    return faculties.filter((faculty) => {
      const facultyMatches =
        faculty.name.toLowerCase().includes(term) ||
        faculty.code.toLowerCase().includes(term)

      const departmentMatches = faculty.departments.some((department) =>
        `${department.name} ${department.code}`.toLowerCase().includes(term)
      )

      return facultyMatches || departmentMatches
    })
  }, [faculties, search])

  const totalDepartments = faculties.reduce(
    (total, faculty) => total + faculty.departments.length,
    0
  )

  function openCreateFaculty() {
    setForm({ name: '', code: '' })
    setModal({ type: 'faculty', mode: 'create' })
    setError('')
    setSuccess('')
  }

  function openEditFaculty(faculty) {
    setForm({ name: faculty.name, code: faculty.code })
    setModal({ type: 'faculty', mode: 'edit', item: faculty })
    setError('')
    setSuccess('')
  }

  function openCreateDepartment(faculty) {
    setForm({ name: '', code: '' })
    setModal({
      type: 'department',
      mode: 'create',
      faculty,
    })
    setError('')
    setSuccess('')
  }

  function openEditDepartment(department, faculty) {
    setForm({ name: department.name, code: department.code })
    setModal({
      type: 'department',
      mode: 'edit',
      item: department,
      faculty,
    })
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.name.trim() || !form.code.trim()) {
      setError('Please complete all required fields.')
      return
    }

    try {
      setSaving(true)
      setError('')

      if (modal.type === 'faculty') {
        if (modal.mode === 'create') {
          await apiRequest('/admin/faculties', {
            method: 'POST',
            body: JSON.stringify(form),
          })
          setSuccess('Faculty created successfully.')
        } else {
          await apiRequest(`/admin/faculties/${modal.item.id}`, {
            method: 'PATCH',
            body: JSON.stringify(form),
          })
          setSuccess('Faculty updated successfully.')
        }
      } else if (modal.type === 'department') {
        if (modal.mode === 'create') {
          await apiRequest(
            `/admin/faculties/${modal.faculty.id}/departments`,
            {
              method: 'POST',
              body: JSON.stringify(form),
            }
          )
          setSuccess('Department created successfully.')
        } else {
          await apiRequest(
            `/admin/faculties/departments/${modal.item.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify(form),
            }
          )
          setSuccess('Department updated successfully.')
        }
      }

      setModal(null)
      await loadFaculties()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleFaculty(id) {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            <GraduationCap size={15} />
            University administration
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156] sm:text-3xl">
            Faculties & Departments
          </h1>

          <p className="mt-2 text-sm text-[#7B8794]">
            Manage the university's faculties and their academic departments.
          </p>
        </div>

        <button
          onClick={openCreateFaculty}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243548]"
        >
          <Plus size={17} />
          Add Faculty
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7B8794]">Total faculties</p>
              <p className="mt-2 text-3xl font-bold text-[#2F4156]">
                {faculties.length}
              </p>
            </div>
            <div className="rounded-xl bg-[#EAF0F7] p-3 text-[#567CBD]">
              <GraduationCap size={24} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#7B8794]">Total departments</p>
              <p className="mt-2 text-3xl font-bold text-[#2F4156]">
                {totalDepartments}
              </p>
            </div>
            <div className="rounded-xl bg-[#F5EFEB] p-3 text-[#8A6D5B]">
              <Building2 size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-[#E7E3DF] bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA4AF]"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search faculties or departments..."
            className="w-full rounded-xl border border-[#E7E3DF] bg-[#FAFAF9] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
          />
        </div>
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

      {/* Faculty list */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-[#E7E3DF] bg-white py-16">
            <LoaderCircle className="animate-spin text-[#567CBD]" size={28} />
          </div>
        ) : filteredFaculties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8D3CE] bg-white py-16 text-center">
            <Building2 className="mx-auto mb-3 text-[#9AA4AF]" size={34} />
            <h3 className="font-semibold text-[#2F4156]">
              No faculties found
            </h3>
            <p className="mt-1 text-sm text-[#7B8794]">
              Add a faculty or change your search.
            </p>
          </div>
        ) : (
          filteredFaculties.map((faculty) => {
            const isExpanded = Boolean(expanded[faculty.id])

            return (
              <div
                key={faculty.id}
                className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleFaculty(faculty.id)}
                    className="flex min-w-0 items-center gap-4 text-left"
                  >
                    <div className="rounded-xl bg-[#EAF0F7] p-3 text-[#567CBD]">
                      <GraduationCap size={23} />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-[#2F4156]">
                        {faculty.name}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7B8794]">
                        <span className="rounded-md bg-[#F5EFEB] px-2 py-1 font-semibold text-[#6D5A4F]">
                          {faculty.code}
                        </span>
                        <span>
                          {faculty.department_count}{' '}
                          {faculty.department_count === 1
                            ? 'department'
                            : 'departments'}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => openCreateDepartment(faculty)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE3EB] px-3 py-2 text-xs font-semibold text-[#567CBD] transition hover:bg-[#F3F6FA]"
                    >
                      <Plus size={15} />
                      Add department
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditFaculty(faculty)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E7E3DF] px-3 py-2 text-xs font-semibold text-[#526171] transition hover:bg-[#FAFAF9]"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFaculty(faculty.id)}
                      aria-label="Expand faculty"
                      className="rounded-lg p-2 text-[#7B8794] hover:bg-[#F5EFEB]"
                    >
                      {isExpanded ? (
                        <ChevronDown size={19} />
                      ) : (
                        <ChevronRight size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#EEEAE6] bg-[#FCFBFA] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#2F4156]">
                          Academic departments
                        </h3>
                        <p className="mt-1 text-xs text-[#8A949F]">
                          Departments belonging to {faculty.name}
                        </p>
                      </div>
                      <BookOpen size={19} className="text-[#9AA4AF]" />
                    </div>

                    {faculty.departments.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#D8D3CE] bg-white p-6 text-center text-sm text-[#8A949F]">
                        No departments have been added to this faculty yet.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {faculty.departments.map((department) => (
                          <div
                            key={department.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#EAE6E2] bg-white p-4"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="rounded-lg bg-[#F5EFEB] p-2 text-[#8A6D5B]">
                                <Building2 size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#2F4156]">
                                  {department.name}
                                </p>
                                <p className="mt-1 text-xs text-[#8A949F]">
                                  Code: {department.code}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                openEditDepartment(department, faculty)
                              }
                              aria-label={`Edit ${department.name}`}
                              className="shrink-0 rounded-lg p-2 text-[#7B8794] transition hover:bg-[#F5EFEB] hover:text-[#567CBD]"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Create / edit modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#172536]/50 p-4">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EEEAE6] px-6 py-5">
              <div>
                <h2 className="font-bold text-[#2F4156]">
                  {modal.mode === 'create' ? 'Create' : 'Edit'}{' '}
                  {modal.type === 'faculty' ? 'Faculty' : 'Department'}
                </h2>
                <p className="mt-1 text-xs text-[#8A949F]">
                  {modal.type === 'department'
                    ? `Faculty: ${modal.faculty.name}`
                    : 'Enter the academic unit details.'}
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
                  {modal.type === 'faculty'
                    ? 'Faculty name'
                    : 'Department name'}
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={
                    modal.type === 'faculty'
                      ? 'e.g. Faculty of Engineering'
                      : 'e.g. Software Engineering'
                  }
                  required
                  className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                  {modal.type === 'faculty' ? 'Faculty code' : 'Department code'}
                </label>
                <input
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={
                    modal.type === 'faculty' ? 'e.g. ENG' : 'e.g. SWE'
                  }
                  required
                  className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm uppercase outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
                />
                <p className="mt-2 text-xs text-[#9AA4AF]">
                  Codes must be unique across the database.
                </p>
              </div>

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
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243548] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <LoaderCircle size={16} className="animate-spin" />}
                  {saving
                    ? 'Saving...'
                    : modal.mode === 'create'
                      ? 'Create'
                      : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
