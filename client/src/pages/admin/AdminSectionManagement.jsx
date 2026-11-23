
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  BookOpen,
  Users,
  DoorOpen,
  CalendarDays,
  X,
  CheckCircle2,
  XCircle,
  Settings2,
  GraduationCap,
  Layers,
  Save
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const STATUSES = ['PLANNED', 'OPEN', 'CLOSED', 'CANCELLED']

const EMPTY_FORM = {
  courseId: '',
  termId: '',
  sectionCode: '',
  instructorId: '',
  capacity: '30',
  room: '',
  status: 'PLANNED',
  scheduleText: '{}',
  departmentQuotas: {}
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
    throw new Error(data.message || 'Request failed.')
  }

  return data
}

function semesterName(value) {
  return Number(value) === 1 ? 'Fall' : 'Spring'
}

function statusClasses(status) {
  const classes = {
    OPEN: 'bg-green-50 text-green-700',
    PLANNED: 'bg-blue-50 text-blue-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-50 text-red-700'
  }

  return classes[status] || 'bg-gray-100 text-gray-600'
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-[#E8E4E0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8290A0]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#2F4156]">{value}</p>
          <p className="mt-1 text-xs text-[#8290A0]">{description}</p>
        </div>
        <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

export default function AdminSectionManagement() {
  const [activeTab, setActiveTab] = useState('sections')

  const [terms, setTerms] = useState([])
  const [courses, setCourses] = useState([])
  const [professors, setProfessors] = useState([])
  const [sections, setSections] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [search, setSearch] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  // Department course quota management
  const [quotaTermId, setQuotaTermId] = useState('')
  const [quotaCourseId, setQuotaCourseId] = useState('')
  const [courseQuotas, setCourseQuotas] = useState([])
  const [quotaValues, setQuotaValues] = useState({})
  const [quotaLoading, setQuotaLoading] = useState(false)

  const loadOptions = useCallback(async () => {
    const data = await apiRequest('/admin/sections/options')
    setTerms(data.terms || [])
    setCourses(data.courses || [])
    setProfessors(data.professors || [])
  }, [])

  const loadSections = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (search.trim()) params.set('search', search.trim())
      if (termFilter) params.set('termId', termFilter)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (departmentFilter) params.set('departmentId', departmentFilter)

      const data = await apiRequest(
        `/admin/sections?${params.toString()}`
      )

      setSections(data.sections || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, termFilter, statusFilter, departmentFilter])

  useEffect(() => {
    loadOptions().catch(err => setError(err.message))
  }, [loadOptions])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  const departments = useMemo(() => {
    const unique = new Map()

    courses.forEach(course => {
      unique.set(course.department_id, {
        id: course.department_id,
        name: course.department_name,
        code: course.department_code
      })
    })

    return [...unique.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [courses])

  const selectedCourseAssociations = useMemo(
    () => courses.filter(course => course.course_id === form.courseId),
    [courses, form.courseId]
  )

  const activeCount = sections.filter(section => section.status === 'OPEN').length
  const enrolledCount = sections.reduce(
    (total, section) => total + Number(section.enrolled_count || 0),
    0
  )
  const capacityCount = sections.reduce(
    (total, section) => total + Number(section.capacity || 0),
    0
  )

  function showMessage(message) {
    setSuccess(message)
    setError('')
  }

  function openCreateModal() {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      termId: terms.find(term => term.is_active)?.id || ''
    })
    setModalOpen(true)
  }

  async function openEditModal(section) {
    setError('')
    setEditingId(section.id)

    try {
      const data = await apiRequest(`/admin/sections/${section.id}`)
      const item = data.section

      const departmentQuotas = {}
      ;(item.department_quotas || []).forEach(quota => {
        departmentQuotas[quota.courseDepartmentId] = String(quota.quota)
      })

      setForm({
        courseId: item.course_id,
        termId: item.term_id,
        sectionCode: item.section_code || '',
        instructorId: item.instructor_id || '',
        capacity: String(item.capacity),
        room: item.room || '',
        status: item.status,
        scheduleText: JSON.stringify(item.schedule || {}, null, 2),
        departmentQuotas
      })

      setModalOpen(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function openDetails(section) {
    setError('')

    try {
      const data = await apiRequest(`/admin/sections/${section.id}`)
      setSelectedSection(data.section)
      setSelectedStudents(data.students || [])
      setDetailsOpen(true)
    } catch (err) {
      setError(err.message)
    }
  }

  function updateForm(name, value) {
    setForm(current => ({ ...current, [name]: value }))
  }

  function updateDepartmentQuota(courseDepartmentId, value) {
    setForm(current => ({
      ...current,
      departmentQuotas: {
        ...current.departmentQuotas,
        [courseDepartmentId]: value
      }
    }))
  }

  async function handleSectionSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    let schedule

    try {
      schedule = JSON.parse(form.scheduleText || '{}')
    } catch {
      setError('Schedule must contain valid JSON.')
      setSaving(false)
      return
    }

    const departmentQuotas = selectedCourseAssociations
      .filter(course => form.departmentQuotas[course.course_department_id] !== undefined &&
        form.departmentQuotas[course.course_department_id] !== '')
      .map(course => ({
        courseDepartmentId: course.course_department_id,
        quota: Number(form.departmentQuotas[course.course_department_id])
      }))

    const payload = {
      courseId: form.courseId,
      termId: form.termId,
      sectionCode: form.sectionCode,
      instructorId: form.instructorId || null,
      capacity: Number(form.capacity),
      room: form.room,
      status: form.status,
      schedule,
      departmentQuotas
    }

    try {
      if (editingId) {
        await apiRequest(`/admin/sections/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            sectionCode: payload.sectionCode,
            instructorId: payload.instructorId,
            capacity: payload.capacity,
            room: payload.room,
            status: payload.status,
            schedule: payload.schedule,
            departmentQuotas: payload.departmentQuotas
          })
        })
        showMessage('Section updated successfully.')
      } else {
        await apiRequest('/admin/sections', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
        showMessage('Section created successfully.')
      }

      setModalOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await loadSections()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function changeSectionStatus(section, status) {
    setError('')
    setSuccess('')

    try {
      await apiRequest(`/admin/sections/${section.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })

      showMessage(`Section status changed to ${status}.`)
      await loadSections()
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadCourseQuotas(termId, courseId) {
    if (!termId || !courseId) {
      setCourseQuotas([])
      setQuotaValues({})
      return
    }

    setQuotaLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ termId, courseId })
      const data = await apiRequest(
        `/admin/sections/course-quotas?${params.toString()}`
      )

      setCourseQuotas(data.quotas || [])

      const values = {}
      ;(data.quotas || []).forEach(item => {
        values[item.course_department_id] =
          item.quota === null ? '' : String(item.quota)
      })

      setQuotaValues(values)
    } catch (err) {
      setError(err.message)
    } finally {
      setQuotaLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'quotas' && quotaTermId && quotaCourseId) {
      loadCourseQuotas(quotaTermId, quotaCourseId)
    }
  }, [activeTab, quotaTermId, quotaCourseId])

  async function saveQuotas() {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const quotas = courseQuotas.map(item => ({
        courseDepartmentId: item.course_department_id,
        quota: Number(quotaValues[item.course_department_id] || 0)
      }))

      await apiRequest('/admin/sections/course-quotas', {
        method: 'PUT',
        body: JSON.stringify({
          termId: quotaTermId,
          quotas
        })
      })

      showMessage('Department quotas saved successfully.')
      await loadCourseQuotas(quotaTermId, quotaCourseId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedQuotaCourse = courses.find(
    course => course.course_id === quotaCourseId
  )

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#567CBD]">
            <Layers size={15} />
            Academic Structure
          </div>
          <h1 className="text-2xl font-bold text-[#2F4156]">
            Section & Quota Management
          </h1>
          <p className="mt-1 text-sm text-[#8290A0]">
            Manage course sections, instructors, capacity, and department allocations.
          </p>
        </div>

        {activeTab === 'sections' && (
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white hover:bg-[#567CBD]"
          >
            <Plus size={18} />
            Create Section
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <XCircle size={18} />
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
          <button onClick={() => setSuccess('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E8E4E0]">
        <button
          onClick={() => setActiveTab('sections')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === 'sections'
              ? 'border-[#567CBD] text-[#2F4156]'
              : 'border-transparent text-[#8290A0]'
          }`}
        >
          <span className="flex items-center gap-2">
            <BookOpen size={17} />
            Course Sections
          </span>
        </button>

        <button
          onClick={() => setActiveTab('quotas')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === 'quotas'
              ? 'border-[#567CBD] text-[#2F4156]'
              : 'border-transparent text-[#8290A0]'
          }`}
        >
          <span className="flex items-center gap-2">
            <GraduationCap size={17} />
            Department Quotas
          </span>
        </button>
      </div>

      {activeTab === 'sections' && (
        <>
          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Layers}
              label="Sections"
              value={sections.length}
              description="Current filtered results"
            />
            <StatCard
              icon={CheckCircle2}
              label="Open Sections"
              value={activeCount}
              description="Accepting registrations"
            />
            <StatCard
              icon={Users}
              label="Enrolled Students"
              value={enrolledCount}
              description="Across displayed sections"
            />
            <StatCard
              icon={DoorOpen}
              label="Total Capacity"
              value={capacityCount}
              description="Places across displayed sections"
            />
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-[#E8E4E0] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
              <Settings2 size={17} />
              Search and filters
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8290A0]"
                />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Course, section, room..."
                  className="w-full rounded-xl border border-[#E8E4E0] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#567CBD]"
                />
              </div>

              <select
                value={termFilter}
                onChange={e => setTermFilter(e.target.value)}
                className="rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none"
              >
                <option value="">All academic terms</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} — {term.academic_year}
                  </option>
                ))}
              </select>

              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none"
              >
                <option value="">All departments</option>
                {departments.map(department => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none"
                >
                  <option value="ALL">All statuses</option>
                  {STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <button
                  onClick={loadSections}
                  title="Refresh"
                  className="rounded-xl border border-[#E8E4E0] px-3 text-[#567CBD]"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>
          </div>

          {/* Sections table */}
          <div className="overflow-hidden rounded-2xl border border-[#E8E4E0] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#E8E4E0] px-5 py-4">
              <div>
                <h2 className="font-semibold text-[#2F4156]">Course Sections</h2>
                <p className="mt-1 text-xs text-[#8290A0]">
                  {sections.length} sections found
                </p>
              </div>
              <CalendarDays size={21} className="text-[#567CBD]" />
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-[#8290A0]">
                Loading sections...
              </div>
            ) : sections.length === 0 ? (
              <div className="p-12 text-center">
                <Layers size={35} className="mx-auto mb-3 text-[#CBD9E6]" />
                <p className="font-semibold text-[#2F4156]">No sections found</p>
                <p className="mt-1 text-sm text-[#8290A0]">
                  Create a section or adjust your filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[#F8F7F5] text-xs uppercase tracking-wider text-[#8290A0]">
                    <tr>
                      <th className="px-5 py-4">Course / Section</th>
                      <th className="px-5 py-4">Academic Term</th>
                      <th className="px-5 py-4">Instructor</th>
                      <th className="px-5 py-4">Room</th>
                      <th className="px-5 py-4">Enrollment</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F0EDE9]">
                    {sections.map(section => {
                      const enrolled = Number(section.enrolled_count || 0)
                      const capacity = Number(section.capacity || 0)
                      const percentage = capacity
                        ? Math.min(100, (enrolled / capacity) * 100)
                        : 0

                      return (
                        <tr key={section.id} className="hover:bg-[#FAF9F7]">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#2F4156]">
                              {section.course_code} — {section.section_code}
                            </p>
                            <p className="mt-1 text-xs text-[#8290A0]">
                              {section.course_name}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-[#2F4156]">
                              {section.term_name}
                            </p>
                            <p className="mt-1 text-xs text-[#8290A0]">
                              {section.academic_year} · {semesterName(section.semester)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-[#2F4156]">
                              {section.instructor_first_name
                                ? `${section.instructor_first_name} ${section.instructor_last_name}`
                                : 'Not assigned'}
                            </p>
                            <p className="mt-1 text-xs text-[#8290A0]">
                              {section.employee_number || '—'}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-[#2F4156]">
                            {section.room || 'Not assigned'}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-[#2F4156]">
                                {enrolled}/{capacity}
                              </span>
                              <span className="text-xs text-[#8290A0]">
                                {Math.max(0, capacity - enrolled)} left
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-[#E8E4E0]">
                              <div
                                className="h-full rounded-full bg-[#567CBD]"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(section.status)}`}>
                              {section.status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openDetails(section)}
                                className="rounded-lg border border-[#E8E4E0] px-3 py-2 text-xs font-semibold text-[#567CBD] hover:bg-[#F5EFEB]"
                              >
                                View
                              </button>
                              <button
                                onClick={() => openEditModal(section)}
                                className="rounded-lg border border-[#E8E4E0] px-3 py-2 text-xs font-semibold text-[#2F4156] hover:bg-[#F5EFEB]"
                              >
                                Edit
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
        </>
      )}

      {activeTab === 'quotas' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#E8E4E0] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#2F4156]">Department Course Quotas</h2>
            <p className="mt-1 text-sm text-[#8290A0]">
              Set the total number of places each department receives for a course during a selected term.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                  Academic Term
                </label>
                <select
                  value={quotaTermId}
                  onChange={e => setQuotaTermId(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm"
                >
                  <option value="">Select term</option>
                  {terms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} — {term.academic_year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                  Course
                </label>
                <select
                  value={quotaCourseId}
                  onChange={e => setQuotaCourseId(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm"
                >
                  <option value="">Select course</option>
                  {[...new Map(courses.map(course => [
                    course.course_id,
                    course
                  ])).values()].map(course => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {quotaTermId && quotaCourseId && (
            <div className="overflow-hidden rounded-2xl border border-[#E8E4E0] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E8E4E0] px-5 py-4">
                <div>
                  <h3 className="font-semibold text-[#2F4156]">
                    Department Allocations
                  </h3>
                  <p className="mt-1 text-xs text-[#8290A0]">
                    {selectedQuotaCourse?.code} — {selectedQuotaCourse?.name}
                  </p>
                </div>
                <button
                  onClick={saveQuotas}
                  disabled={saving || quotaLoading}
                  className="flex items-center gap-2 rounded-xl bg-[#2F4156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#567CBD] disabled:opacity-50"
                >
                  <Save size={16} />
                  Save Quotas
                </button>
              </div>

              {quotaLoading ? (
                <div className="p-10 text-center text-sm text-[#8290A0]">
                  Loading quotas...
                </div>
              ) : courseQuotas.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#8290A0]">
                  No department associations are available for this course.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-[#F8F7F5] text-xs uppercase tracking-wider text-[#8290A0]">
                      <tr>
                        <th className="px-5 py-4">Department</th>
                        <th className="px-5 py-4">Default Quota</th>
                        <th className="px-5 py-4">Places in Sections</th>
                        <th className="px-5 py-4">Term Quota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EDE9]">
                      {courseQuotas.map(item => (
                        <tr key={item.course_department_id}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#2F4156]">
                              {item.department_name}
                            </p>
                            <p className="mt-1 text-xs text-[#8290A0]">
                              {item.department_code}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-[#2F4156]">
                            {item.default_quota ?? 'Not set'}
                          </td>
                          <td className="px-5 py-4 text-[#2F4156]">
                            {item.allocated_to_sections}
                          </td>
                          <td className="px-5 py-4">
                            <input
                              type="number"
                              min="0"
                              value={quotaValues[item.course_department_id] ?? ''}
                              onChange={e => setQuotaValues(current => ({
                                ...current,
                                [item.course_department_id]: e.target.value
                              }))}
                              placeholder="Enter quota"
                              className="w-32 rounded-lg border border-[#E8E4E0] px-3 py-2 outline-none focus:border-[#567CBD]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Section Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8E4E0] p-5">
              <div>
                <h2 className="text-lg font-bold text-[#2F4156]">
                  {editingId ? 'Edit Course Section' : 'Create Course Section'}
                </h2>
                <p className="mt-1 text-xs text-[#8290A0]">
                  Configure the section and its department allocations.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-[#8290A0] hover:bg-[#F5EFEB]"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSectionSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Course *
                  </label>
                  <select
                    required
                    disabled={Boolean(editingId)}
                    value={form.courseId}
                    onChange={e => updateForm('courseId', e.target.value)}
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Select course</option>
                    {[...new Map(courses.map(course => [
                      course.course_id,
                      course
                    ])).values()].map(course => (
                      <option key={course.course_id} value={course.course_id}>
                        {course.code} — {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Academic Term *
                  </label>
                  <select
                    required
                    disabled={Boolean(editingId)}
                    value={form.termId}
                    onChange={e => updateForm('termId', e.target.value)}
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm disabled:bg-gray-100"
                  >
                    <option value="">Select term</option>
                    {terms.map(term => (
                      <option key={term.id} value={term.id}>
                        {term.name} — {term.academic_year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Section Code *
                  </label>
                  <input
                    required
                    value={form.sectionCode}
                    onChange={e => updateForm('sectionCode', e.target.value)}
                    placeholder="Example: A, B, 01"
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm outline-none focus:border-[#567CBD]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Instructor
                  </label>
                  <select
                    value={form.instructorId}
                    onChange={e => updateForm('instructorId', e.target.value)}
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm"
                  >
                    <option value="">Not assigned</option>
                    {professors.map(professor => (
                      <option key={professor.id} value={professor.id}>
                        {professor.first_name} {professor.last_name}
                        {' — '}{professor.employee_number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Capacity *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={e => updateForm('capacity', e.target.value)}
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Room
                  </label>
                  <input
                    value={form.room}
                    onChange={e => updateForm('room', e.target.value)}
                    placeholder="Example: B-204"
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                    Section Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => updateForm('status', e.target.value)}
                    className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 text-sm"
                  >
                    {STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department quotas for this section */}
              {form.courseId && (
                <div className="rounded-xl border border-[#E8E4E0] p-4">
                  <h3 className="font-semibold text-[#2F4156]">
                    Section Department Quotas
                  </h3>
                  <p className="mt-1 text-xs text-[#8290A0]">
                    Allocate this section's capacity to the departments associated with the selected course. The total cannot exceed section capacity.
                  </p>

                  <div className="mt-4 space-y-3">
                    {selectedCourseAssociations.map(course => (
                      <div
                        key={course.course_department_id}
                        className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-[#2F4156]">
                            {course.department_name}
                          </p>
                          <p className="text-xs text-[#8290A0]">
                            {course.department_code}
                          </p>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={form.departmentQuotas[course.course_department_id] ?? ''}
                          onChange={e => updateDepartmentQuota(
                            course.course_department_id,
                            e.target.value
                          )}
                          placeholder="Quota"
                          className="w-full rounded-lg border border-[#E8E4E0] px-3 py-2 text-sm sm:w-32"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                  Weekly Schedule (JSON)
                </label>
                <textarea
                  rows={5}
                  value={form.scheduleText}
                  onChange={e => updateForm('scheduleText', e.target.value)}
                  placeholder={'{"monday": {"start": "09:00", "end": "11:00"}}'}
                  className="w-full rounded-xl border border-[#E8E4E0] px-3 py-3 font-mono text-xs outline-none focus:border-[#567CBD]"
                />
                <p className="mt-1 text-xs text-[#8290A0]">
                  Enter valid JSON. Example: {"{"}"monday": {"{"}"start": "09:00", "end": "11:00"{"}"}{"}"}.
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E8E4E0] pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E8E4E0] px-5 py-3 text-sm font-semibold text-[#2F4156]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white hover:bg-[#567CBD] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section Details Modal */}
      {detailsOpen && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8E4E0] p-5">
              <div>
                <h2 className="text-lg font-bold text-[#2F4156]">
                  {selectedSection.course_code} — {selectedSection.section_code}
                </h2>
                <p className="mt-1 text-sm text-[#8290A0]">
                  {selectedSection.course_name}
                </p>
              </div>
              <button onClick={() => setDetailsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F8F7F5] p-4">
                <p className="text-xs text-[#8290A0]">Academic Term</p>
                <p className="mt-1 font-semibold text-[#2F4156]">
                  {selectedSection.term_name} — {selectedSection.academic_year}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8F7F5] p-4">
                <p className="text-xs text-[#8290A0]">Instructor</p>
                <p className="mt-1 font-semibold text-[#2F4156]">
                  {selectedSection.instructor_first_name
                    ? `${selectedSection.instructor_first_name} ${selectedSection.instructor_last_name}`
                    : 'Not assigned'}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8F7F5] p-4">
                <p className="text-xs text-[#8290A0]">Capacity</p>
                <p className="mt-1 font-semibold text-[#2F4156]">
                  {selectedSection.capacity}
                </p>
              </div>
              <div className="rounded-xl bg-[#F8F7F5] p-4">
                <p className="text-xs text-[#8290A0]">Room</p>
                <p className="mt-1 font-semibold text-[#2F4156]">
                  {selectedSection.room || 'Not assigned'}
                </p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <h3 className="mb-3 font-semibold text-[#2F4156]">
                Enrolled Students ({selectedStudents.length})
              </h3>

              {selectedStudents.length === 0 ? (
                <p className="rounded-xl bg-[#F8F7F5] p-5 text-center text-sm text-[#8290A0]">
                  No students are currently enrolled in this section.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E8E4E0]">
                  <table className="w-full min-w-[550px] text-left text-sm">
                    <thead className="bg-[#F8F7F5] text-xs uppercase text-[#8290A0]">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Student Number</th>
                        <th className="px-4 py-3">Department</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EDE9]">
                      {selectedStudents.map(student => (
                        <tr key={student.enrollment_id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-[#2F4156]">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-xs text-[#8290A0]">
                              {student.email}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[#2F4156]">
                            {student.student_number}
                          </td>
                          <td className="px-4 py-3 text-[#2F4156]">
                            {student.department_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#E8E4E0] p-5">
              {selectedSection.status !== 'OPEN' && (
                <button
                  onClick={() => {
                    changeSectionStatus(selectedSection, 'OPEN')
                    setDetailsOpen(false)
                  }}
                  className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Open Section
                </button>
              )}

              {selectedSection.status === 'OPEN' && (
                <button
                  onClick={() => {
                    changeSectionStatus(selectedSection, 'CLOSED')
                    setDetailsOpen(false)
                  }}
                  className="rounded-xl border border-[#E8E4E0] px-4 py-2.5 text-sm font-semibold text-[#2F4156]"
                >
                  Close Section
                </button>
              )}

              <button
                onClick={() => setDetailsOpen(false)}
                className="rounded-xl border border-[#E8E4E0] px-4 py-2.5 text-sm font-semibold text-[#2F4156]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
