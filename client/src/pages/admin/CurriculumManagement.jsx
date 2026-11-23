
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpenCheck,
  Plus,
  Search,
  RefreshCw,
  GraduationCap,
  Layers,
  CheckCircle2,
  XCircle,
  X,
  Filter
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const initialForm = {
  departmentId: '',
  courseId: '',
  studyYear: '1',
  semester: '1'
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong.')
  }

  return data
}

function semesterLabel(value) {
  return Number(value) === 1 ? 'Fall' : 'Spring'
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-[#E8E4E0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8290A0]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#2F4156]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#8290A0]">{description}</p>
        </div>
        <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

export default function CurriculumManagement() {
  const [curriculum, setCurriculum] = useState([])
  const [departments, setDepartments] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(initialForm)

  const loadDepartments = useCallback(async () => {
    const data = await apiRequest('/admin/curriculum/departments')
    setDepartments(data.departments || [])
  }, [])

  const loadCurriculum = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (departmentFilter) params.set('departmentId', departmentFilter)
      if (yearFilter) params.set('studyYear', yearFilter)
      if (semesterFilter) params.set('semester', semesterFilter)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const data = await apiRequest(
        `/admin/curriculum?${params.toString()}`
      )

      setCurriculum(data.curriculum || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [departmentFilter, yearFilter, semesterFilter, statusFilter])

  useEffect(() => {
    loadDepartments().catch(err => setError(err.message))
  }, [loadDepartments])

  useEffect(() => {
    loadCurriculum()
  }, [loadCurriculum])

  async function loadAvailableCourses(departmentId) {
    if (!departmentId) {
      setAvailableCourses([])
      return
    }

    try {
      const data = await apiRequest(
        `/admin/curriculum/available-courses?departmentId=${encodeURIComponent(departmentId)}`
      )
      setAvailableCourses(data.courses || [])
    } catch (err) {
      setError(err.message)
    }
  }

  function openCreateModal() {
    setForm(initialForm)
    setAvailableCourses([])
    setError('')
    setModalOpen(true)
  }

  async function handleDepartmentChange(departmentId) {
    setForm(current => ({
      ...current,
      departmentId,
      courseId: ''
    }))

    await loadAvailableCourses(departmentId)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await apiRequest('/admin/curriculum', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      setSuccess('Course added to curriculum successfully.')
      setModalOpen(false)
      setForm(initialForm)
      await loadCurriculum()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(item) {
    setError('')
    setSuccess('')

    try {
      await apiRequest(
        `/admin/curriculum/${item.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            isActive: !item.is_active
          })
        }
      )

      setSuccess('Curriculum assignment updated.')
      await loadCurriculum()
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredCurriculum = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return curriculum

    return curriculum.filter(item =>
      [
        item.course_code,
        item.course_name,
        item.department_name,
        item.department_code,
        item.faculty_name
      ].some(value => String(value || '').toLowerCase().includes(term))
    )
  }, [curriculum, search])

  const activeCount = curriculum.filter(item => item.is_active).length
  const inactiveCount = curriculum.length - activeCount
  const departmentCount = new Set(
    curriculum.map(item => item.department_id)
  ).size

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#567CBD]">
            <BookOpenCheck size={15} />
            Academic Structure
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156]">
            Curriculum Management
          </h1>

          <p className="mt-1 text-sm text-[#8290A0]">
            Organize courses by department, study year, and semester.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#567CBD]"
        >
          <Plus size={18} />
          Add Curriculum Course
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle size={18} />
          {error}
          <button className="ml-auto" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {success}
          <button className="ml-auto" onClick={() => setSuccess('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpenCheck}
          label="Assignments"
          value={curriculum.length}
          description="Current filtered results"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active Courses"
          value={activeCount}
          description="Active curriculum entries"
        />
        <StatCard
          icon={XCircle}
          label="Inactive Courses"
          value={inactiveCount}
          description="Disabled curriculum entries"
        />
        <StatCard
          icon={GraduationCap}
          label="Departments"
          value={departmentCount}
          description="Departments in current results"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E8E4E0] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
          <Filter size={17} />
          Filter Curriculum
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8290A0]"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-xl border border-[#E8E4E0] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#567CBD]"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
          >
            <option value="">All departments</option>
            {departments.map(department => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
          >
            <option value="">All study years</option>
            {[1, 2, 3, 4, 5, 6].map(year => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>

          <select
            value={semesterFilter}
            onChange={e => setSemesterFilter(e.target.value)}
            className="rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
          >
            <option value="">All semesters</option>
            <option value="1">Fall</option>
            <option value="2">Spring</option>
          </select>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <button
              onClick={loadCurriculum}
              title="Refresh"
              className="rounded-xl border border-[#E8E4E0] px-3 text-[#567CBD] hover:bg-[#F5EFEB]"
            >
              <RefreshCw size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Curriculum table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8E4E0] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E8E4E0] px-5 py-4">
          <div>
            <h2 className="font-semibold text-[#2F4156]">
              Curriculum Courses
            </h2>
            <p className="mt-1 text-xs text-[#8290A0]">
              {filteredCurriculum.length} assignments found
            </p>
          </div>
          <Layers size={21} className="text-[#567CBD]" />
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-[#8290A0]">
            Loading curriculum...
          </div>
        ) : filteredCurriculum.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpenCheck
              size={35}
              className="mx-auto mb-3 text-[#CBD9E6]"
            />
            <p className="font-semibold text-[#2F4156]">
              No curriculum courses found
            </p>
            <p className="mt-1 text-sm text-[#8290A0]">
              Add courses to a department's study plan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#F8F7F5] text-xs uppercase tracking-wider text-[#8290A0]">
                <tr>
                  <th className="px-5 py-4">Course</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Study Year</th>
                  <th className="px-5 py-4">Semester</th>
                  <th className="px-5 py-4">Credits</th>
                  <th className="px-5 py-4">Requirement</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EDE9]">
                {filteredCurriculum.map(item => (
                  <tr key={item.id} className="hover:bg-[#FAF9F7]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#2F4156]">
                        {item.course_code}
                      </p>
                      <p className="mt-1 text-xs text-[#8290A0]">
                        {item.course_name}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-[#2F4156]">
                        {item.department_name}
                      </p>
                      <p className="mt-1 text-xs text-[#8290A0]">
                        {item.faculty_name}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-[#2F4156]">
                      Year {item.study_year}
                    </td>

                    <td className="px-5 py-4 text-[#2F4156]">
                      {semesterLabel(item.semester)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-medium text-[#2F4156]">
                        {item.credits}
                      </span>
                      <span className="ml-1 text-xs text-[#8290A0]">
                        credits
                      </span>
                      <p className="text-xs text-[#8290A0]">
                        {item.ects} ECTS
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-[#CBD9E6]/40 px-2.5 py-1 text-xs font-medium text-[#2F4156]">
                        {String(item.requirement_type || 'REQUIRED').replaceAll('_', ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => toggleStatus(item)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                          item.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add course modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8E4E0] p-5">
              <div>
                <h2 className="text-lg font-bold text-[#2F4156]">
                  Add Curriculum Course
                </h2>
                <p className="mt-1 text-xs text-[#8290A0]">
                  Assign an existing course to a study plan.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-[#8290A0] hover:bg-[#F5EFEB]"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                  Department *
                </label>

                <select
                  required
                  value={form.departmentId}
                  onChange={e => handleDepartmentChange(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
                >
                  <option value="">Select department</option>
                  {departments.map(department => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-[#8290A0]">
                  Only courses already assigned to this department in Course Management will appear.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                  Course *
                </label>

                <select
                  required
                  disabled={!form.departmentId}
                  value={form.courseId}
                  onChange={e => setForm(current => ({
                    ...current,
                    courseId: e.target.value
                  }))}
                  className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD] disabled:bg-gray-100"
                >
                  <option value="">Select course</option>
                  {availableCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>

                {form.departmentId && availableCourses.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No available courses. Assign courses to this department in Course Management first.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Study Year *
                  </label>

                  <select
                    required
                    value={form.studyYear}
                    onChange={e => setForm(current => ({
                      ...current,
                      studyYear: e.target.value
                    }))}
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
                  >
                    {[1, 2, 3, 4, 5, 6].map(year => (
                      <option key={year} value={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Semester *
                  </label>

                  <select
                    required
                    value={form.semester}
                    onChange={e => setForm(current => ({
                      ...current,
                      semester: e.target.value
                    }))}
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
                  >
                    <option value="1">Fall</option>
                    <option value="2">Spring</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E8E4E0] pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E8E4E0] px-5 py-3 text-sm font-semibold text-[#2F4156] hover:bg-[#F5EFEB]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !availableCourses.length}
                  className="rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white hover:bg-[#567CBD] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add to Curriculum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
