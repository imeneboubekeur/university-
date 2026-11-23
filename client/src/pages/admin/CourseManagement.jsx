
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  X,
  LoaderCircle,
  Power,
  GraduationCap,
  Building2,
  Layers3,
  BookMarked,
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

const emptyForm = {
  code: '',
  name: '',
  description: '',
  credits: '3',
  ects: '5',
  isActive: true,
  departments: [],
}

function requirementLabel(value) {
  if (value === 'FREE_ELECTIVE') return 'Free elective'
  if (value === 'ELECTIVE') return 'Elective'
  return 'Required'
}

export default function CourseManagement() {
  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const [courseData, departmentData] = await Promise.all([
        apiRequest('/admin/courses'),
        apiRequest('/admin/courses/departments'),
      ])

      setCourses(courseData.courses || [])
      setDepartments(departmentData.departments || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredCourses = useMemo(() => {
    const term = search.toLowerCase().trim()

    return courses.filter((course) => {
      const matchesSearch =
        !term ||
        course.code.toLowerCase().includes(term) ||
        course.name.toLowerCase().includes(term) ||
        course.departments.some((department) =>
          `${department.department_name} ${department.department_code}`
            .toLowerCase()
            .includes(term)
        )

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && course.is_active) ||
        (statusFilter === 'INACTIVE' && !course.is_active)

      return matchesSearch && matchesStatus
    })
  }, [courses, search, statusFilter])

  const activeCount = courses.filter((course) => course.is_active).length
  const assignedCount = courses.filter((course) =>
    course.departments.some((department) => department.is_available)
  ).length

  function openCreateModal() {
    setForm(emptyForm)
    setModal({ mode: 'create' })
    setError('')
    setSuccess('')
  }

  function openEditModal(course) {
    setForm({
      code: course.code,
      name: course.name,
      description: course.description || '',
      credits: String(course.credits),
      ects: String(course.ects),
      isActive: course.is_active,
      departments: course.departments.map((department) => ({
        departmentId: department.department_id,
        requirementType: department.requirement_type,
        electiveGroup: department.elective_group || '',
        defaultQuota:
          department.default_quota === null
            ? ''
            : String(department.default_quota),
        isAvailable: department.is_available,
      })),
    })

    setModal({ mode: 'edit', item: course })
    setError('')
    setSuccess('')
  }

  function toggleDepartment(departmentId) {
    setForm((current) => {
      const exists = current.departments.some(
        (item) => item.departmentId === departmentId
      )

      if (exists) {
        return {
          ...current,
          departments: current.departments.filter(
            (item) => item.departmentId !== departmentId
          ),
        }
      }

      return {
        ...current,
        departments: [
          ...current.departments,
          {
            departmentId,
            requirementType: 'REQUIRED',
            electiveGroup: '',
            defaultQuota: '',
            isAvailable: true,
          },
        ],
      }
    })
  }

  function updateDepartment(departmentId, field, value) {
    setForm((current) => ({
      ...current,
      departments: current.departments.map((item) =>
        item.departmentId === departmentId
          ? { ...item, [field]: value }
          : item
      ),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      setSaving(true)
      setError('')

      const payload = {
        ...form,
        credits: Number(form.credits),
        ects: Number(form.ects),
        departments: form.departments.map((item) => ({
          ...item,
          defaultQuota:
            item.defaultQuota === '' ? null : Number(item.defaultQuota),
          electiveGroup: item.electiveGroup.trim() || null,
        })),
      }

      if (modal.mode === 'create') {
        await apiRequest('/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        setSuccess('Course created successfully.')
      } else {
        await apiRequest(`/admin/courses/${modal.item.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setSuccess('Course updated successfully.')
      }

      setModal(null)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(course) {
    const nextStatus = !course.is_active
    const action = nextStatus ? 'activate' : 'deactivate'

    if (!window.confirm(`Are you sure you want to ${action} ${course.code}?`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      await apiRequest(`/admin/courses/${course.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      })

      setSuccess(`Course ${course.code} ${nextStatus ? 'activated' : 'deactivated'} successfully.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            <BookOpen size={15} />
            Academic administration
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156] sm:text-3xl">
            Course Management
          </h1>

          <p className="mt-2 text-sm text-[#7B8794]">
            Create courses and manage their department availability.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#243548]"
        >
          <Plus size={17} />
          Add Course
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total courses',
            value: courses.length,
            icon: BookOpen,
            color: 'bg-[#EAF0F7] text-[#567CBD]',
          },
          {
            label: 'Active courses',
            value: activeCount,
            icon: BookMarked,
            color: 'bg-green-50 text-green-600',
          },
          {
            label: 'Inactive courses',
            value: courses.length - activeCount,
            icon: Layers3,
            color: 'bg-[#F5EFEB] text-[#8A6D5B]',
          },
          {
            label: 'Courses assigned',
            value: assignedCount,
            icon: Building2,
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
            placeholder="Search course code, name or department..."
            className="w-full rounded-xl border border-[#E7E3DF] bg-[#FAFAF9] py-3 pl-11 pr-4 text-sm outline-none focus:border-[#567CBD]"
          />
        </div>

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

      {/* Courses table */}
      <div className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#EEEAE6] px-5 py-4">
          <div>
            <h2 className="font-bold text-[#2F4156]">University courses</h2>
            <p className="mt-1 text-xs text-[#8A949F]">
              {filteredCourses.length} courses displayed
            </p>
          </div>
          <GraduationCap size={21} className="text-[#9AA4AF]" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderCircle size={28} className="animate-spin text-[#567CBD]" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen size={34} className="mx-auto mb-3 text-[#AAB2BC]" />
            <p className="font-semibold text-[#2F4156]">No courses found</p>
            <p className="mt-1 text-sm text-[#8A949F]">
              Create a course or change your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-[#FAFAF9] text-[11px] uppercase tracking-wider text-[#87919C]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Course</th>
                  <th className="px-5 py-4 font-semibold">Credits / ECTS</th>
                  <th className="px-5 py-4 font-semibold">Departments</th>
                  <th className="px-5 py-4 font-semibold">Requirement types</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EDE9]">
                {filteredCourses.map((course) => {
                  const activeDepartments = course.departments.filter(
                    (item) => item.is_available
                  )

                  return (
                    <tr key={course.id} className="align-top transition hover:bg-[#FCFBFA]">
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-[#2F4156]">
                          {course.code}
                        </p>
                        <p className="mt-1 max-w-xs text-sm text-[#647181]">
                          {course.name}
                        </p>
                        {course.description && (
                          <p className="mt-1 max-w-xs text-xs text-[#9AA4AF]">
                            {course.description}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[#2F4156]">
                          {course.credits} credits
                        </p>
                        <p className="mt-1 text-xs text-[#8A949F]">
                          {course.ects} ECTS
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {activeDepartments.length ? (
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {activeDepartments.map((department) => (
                              <span
                                key={department.department_id}
                                className="rounded-md bg-[#EAF0F7] px-2 py-1 text-xs font-medium text-[#567CBD]"
                                title={department.faculty_name}
                              >
                                {department.department_code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#9AA4AF]">
                            Not assigned
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex max-w-[180px] flex-wrap gap-1.5">
                          {activeDepartments.length ? (
                            activeDepartments.map((department) => (
                              <span
                                key={department.department_id}
                                className="rounded-md bg-[#F5EFEB] px-2 py-1 text-xs text-[#806958]"
                              >
                                {requirementLabel(department.requirement_type)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#9AA4AF]">—</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                            course.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-[#F1F1F0] text-[#7B8794]'
                          }`}
                        >
                          {course.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(course)}
                            title="Edit course"
                            className="rounded-lg border border-[#E7E3DF] p-2 text-[#647181] transition hover:bg-[#F5EFEB]"
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStatus(course)}
                            title={course.is_active ? 'Deactivate course' : 'Activate course'}
                            className={`rounded-lg border border-[#E7E3DF] p-2 transition ${
                              course.is_active
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#172536]/50 p-4">
          <div className="my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EEEAE6] bg-white px-6 py-5">
              <div>
                <h2 className="font-bold text-[#2F4156]">
                  {modal.mode === 'create' ? 'Create course' : 'Edit course'}
                </h2>
                <p className="mt-1 text-xs text-[#8A949F]">
                  Course information and department assignments
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

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Basic course information */}
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-[#2F4156]">
                  Basic information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                      Course code
                    </label>
                    <input
                      value={form.code}
                      onChange={(event) =>
                        setForm({ ...form, code: event.target.value.toUpperCase() })
                      }
                      placeholder="e.g. SWE301"
                      required
                      className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm uppercase outline-none focus:border-[#567CBD]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                      Course name
                    </label>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      placeholder="e.g. Software Architecture"
                      required
                      className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                    placeholder="Describe the course..."
                    className="w-full resize-y rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                      Credits
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.credits}
                      onChange={(event) =>
                        setForm({ ...form, credits: event.target.value })
                      }
                      required
                      className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#647181]">
                      ECTS
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.ects}
                      onChange={(event) =>
                        setForm({ ...form, ects: event.target.value })
                      }
                      required
                      className="w-full rounded-xl border border-[#E2DED9] px-4 py-3 text-sm outline-none focus:border-[#567CBD]"
                    />
                  </div>
                </div>
              </section>

              <div className="border-t border-[#EEEAE6]" />

              {/* Department assignments */}
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#2F4156]">
                    Department assignments
                  </h3>
                  <p className="mt-1 text-xs text-[#8A949F]">
                    Select every department that can offer this course.
                  </p>
                </div>

                {departments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D8D3CE] p-5 text-center text-sm text-[#8A949F]">
                    No departments exist yet. Create departments in Faculty Management first.
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#E7E3DF] p-3">
                    {departments.map((department) => {
                      const selected = form.departments.some(
                        (item) => item.departmentId === department.id
                      )

                      return (
                        <label
                          key={department.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 transition ${
                            selected ? 'bg-[#EAF0F7]' : 'hover:bg-[#FAFAF9]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleDepartment(department.id)}
                            className="mt-1 h-4 w-4 accent-[#567CBD]"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[#2F4156]">
                              {department.name}
                            </span>
                            <span className="mt-1 block text-xs text-[#8A949F]">
                              {department.code} · {department.faculty_name}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {form.departments.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#647181]">
                      Configure selected departments ({form.departments.length})
                    </p>

                    {form.departments.map((assignment) => {
                      const department = departments.find(
                        (item) => item.id === assignment.departmentId
                      )

                      return (
                        <div
                          key={assignment.departmentId}
                          className="space-y-4 rounded-xl border border-[#E7E3DF] bg-[#FCFBFA] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-[#2F4156]">
                                {department?.name || 'Department'}
                              </p>
                              <p className="mt-1 text-xs text-[#8A949F]">
                                {department?.code} · {department?.faculty_name}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleDepartment(assignment.departmentId)}
                              className="rounded-lg p-2 text-[#9AA4AF] hover:bg-white hover:text-red-500"
                              title="Remove department assignment"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-[#647181]">
                                Requirement type
                              </label>
                              <select
                                value={assignment.requirementType}
                                onChange={(event) =>
                                  updateDepartment(
                                    assignment.departmentId,
                                    'requirementType',
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-[#E2DED9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
                              >
                                <option value="REQUIRED">Required</option>
                                <option value="ELECTIVE">Elective</option>
                                <option value="FREE_ELECTIVE">Free elective</option>
                              </select>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-[#647181]">
                                Default quota
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={assignment.defaultQuota}
                                onChange={(event) =>
                                  updateDepartment(
                                    assignment.departmentId,
                                    'defaultQuota',
                                    event.target.value
                                  )
                                }
                                placeholder="No default quota"
                                className="w-full rounded-lg border border-[#E2DED9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
                              />
                            </div>
                          </div>

                          {assignment.requirementType !== 'REQUIRED' && (
                            <div>
                              <label className="mb-1.5 block text-xs font-semibold text-[#647181]">
                                Elective group (optional)
                              </label>
                              <input
                                value={assignment.electiveGroup}
                                onChange={(event) =>
                                  updateDepartment(
                                    assignment.departmentId,
                                    'electiveGroup',
                                    event.target.value
                                  )
                                }
                                placeholder="e.g. TECHNICAL_ELECTIVES"
                                className="w-full rounded-lg border border-[#E2DED9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
                              />
                            </div>
                          )}

                          <label className="flex items-center gap-2 text-xs text-[#647181]">
                            <input
                              type="checkbox"
                              checked={assignment.isAvailable}
                              onChange={(event) =>
                                updateDepartment(
                                  assignment.departmentId,
                                  'isAvailable',
                                  event.target.checked
                                )
                              }
                              className="h-4 w-4 accent-[#567CBD]"
                            />
                            Course is available to this department
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <div className="border-t border-[#EEEAE6]" />

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
                    Active course
                  </span>
                  <span className="mt-1 block text-xs text-[#8A949F]">
                    Inactive courses cannot be offered for new registrations.
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
                  {saving
                    ? 'Saving...'
                    : modal.mode === 'create'
                      ? 'Create course'
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
