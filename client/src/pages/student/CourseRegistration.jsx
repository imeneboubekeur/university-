
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  Users,
  UserRound,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import api from '../../services/api'

function formatSchedule(schedule) {
  if (!schedule) return 'Schedule not announced'

  if (typeof schedule === 'string') {
    try {
      schedule = JSON.parse(schedule)
    } catch {
      return schedule
    }
  }

  if (Array.isArray(schedule)) {
    return schedule
      .map((item) => {
        if (typeof item === 'string') return item

        return [
          item.day,
          item.startTime || item.start_time,
          item.endTime || item.end_time,
        ].filter(Boolean).join(' · ')
      })
      .join(', ')
  }

  if (typeof schedule === 'object') {
    return Object.entries(schedule)
      .map(([day, details]) => {
        if (typeof details === 'string') return `${day}: ${details}`
        if (Array.isArray(details)) return `${day}: ${details.join(', ')}`
        return `${day}: ${JSON.stringify(details)}`
      })
      .join(' · ')
  }

  return String(schedule)
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0)

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date) {
  if (!date) return 'Date unavailable'

  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function RequirementBadge({ type }) {
  const styles = {
    REQUIRED: 'bg-blue-50 text-blue-700',
    ELECTIVE: 'bg-purple-50 text-purple-700',
    FREE_ELECTIVE: 'bg-amber-50 text-amber-700',
  }

  const labels = {
    REQUIRED: 'Required',
    ELECTIVE: 'Elective',
    FREE_ELECTIVE: 'Free elective',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
      styles[type] || 'bg-gray-100 text-gray-600'
    }`}>
      {labels[type] || type}
    </span>
  )
}

function MaterialsSection({ sectionId }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await api.get(
        `/student/sections/${sectionId}/materials`
      )

      setMaterials(response.data.materials || [])
      setLoaded(true)
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load course materials.'
      )
    } finally {
      setLoading(false)
    }
  }

    const downloadMaterial = (material) => {
    const baseURL = api.defaults.baseURL.replace(/\/$/, '')

    const downloadUrl =
      `${baseURL}/student/materials/${encodeURIComponent(material.id)}/download`

    // Navigate through the backend instead of using Axios.
    // The backend checks enrollment and redirects to Cloudinary.
    window.location.assign(downloadUrl)
  }
  return (
    <div className="mt-5 border-t border-gray-100 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 font-semibold text-[#2F4156]">
            <FileText size={18} className="text-[#567CBD]" />
            Course Materials
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            PDFs uploaded by your professor for this section.
          </p>
        </div>

        <button
          onClick={fetchMaterials}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[#DCE3E9] px-3 py-2 text-xs font-semibold text-[#2F4156] hover:bg-[#F5EFEB] disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loaded ? 'Refresh materials' : 'View materials'}
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-gray-500">
          Loading course materials...
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loaded && !loading && (
        <div className="mt-4 space-y-3">
          {materials.length > 0 ? (
            materials.map((material) => (
              <div
                key={material.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[#E8E2DE] bg-[#FAF9F7] p-4 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
                    <FileText size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[#2F4156]">
                      {material.title}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {material.originalFilename}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      {formatFileSize(material.fileSizeBytes)}
                      {' · '}
                      Uploaded {formatDate(material.createdAt)}
                    </p>
                  </div>
                </div>

              <button
  type="button"
  onClick={() => downloadMaterial(material)}
  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2F4156] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#567CBD]"
>
  <Download size={15} />
  Download PDF
</button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center">
              <FileText size={24} className="mx-auto text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-600">
                No materials uploaded yet
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Your professor has not uploaded any PDFs for this section.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course, onRegister, submitting }) {
  const unavailable =
    course.already_enrolled ||
    course.request_pending ||
    Number(course.remaining_seats) <= 0 ||
    (course.department_remaining_seats !== null &&
      Number(course.department_remaining_seats) <= 0)

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8E2DE] bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-gray-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wider text-[#567CBD]">
              {course.course_code}
            </p>

            <h3 className="mt-2 text-lg font-bold text-[#2F4156]">
              {course.course_name}
            </h3>
          </div>

          <RequirementBadge type={course.requirement_type} />
        </div>

        {course.description && (
          <p className="mt-3 text-sm leading-6 text-gray-500">
            {course.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={15} />
            {course.credits} credits
          </span>

          <span className="inline-flex items-center gap-1.5">
            <GraduationCap size={15} />
            {course.ects} ECTS
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-[#2F4156]">
            Section {course.section_code}
          </h4>

          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            {course.section_status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F5EFEB] p-3">
            <p className="text-xs text-gray-500">Available seats</p>
            <p className="mt-1 text-lg font-bold text-[#2F4156]">
              {course.remaining_seats}
              <span className="ml-1 text-xs font-normal text-gray-400">
                / {course.capacity}
              </span>
            </p>
          </div>

          <div className="rounded-xl bg-[#F5EFEB] p-3">
            <p className="text-xs text-gray-500">Enrolled students</p>
            <p className="mt-1 text-lg font-bold text-[#2F4156]">
              {course.enrolled_count}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <UserRound size={16} className="mt-0.5 shrink-0 text-[#567CBD]" />
            <span>
              {course.instructor_first_name
                ? `${course.academic_title || ''} ${course.instructor_first_name} ${course.instructor_last_name || ''}`.trim()
                : 'Instructor not assigned'}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-[#567CBD]" />
            <span>{course.room || 'Room not assigned'}</span>
          </div>

          <div className="flex items-start gap-2">
            <CalendarDays size={16} className="mt-0.5 shrink-0 text-[#567CBD]" />
            <span>{formatSchedule(course.schedule)}</span>
          </div>

          {course.department_quota !== null && (
            <div className="flex items-start gap-2">
              <Users size={16} className="mt-0.5 shrink-0 text-[#567CBD]" />
              <span>
                Department seats remaining: {course.department_remaining_seats}
              </span>
            </div>
          )}
        </div>

        {course.already_enrolled ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            <CheckCircle2 size={17} />
            Already enrolled
          </div>
        ) : course.request_pending ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            <Clock size={17} />
            Request pending
          </div>
        ) : (
          <button
            onClick={() => onRegister(course)}
            disabled={unavailable || submitting === course.section_id}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#567CBD] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting === course.section_id ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Submitting...
              </>
            ) : Number(course.remaining_seats) <= 0 ? (
              'Section full'
            ) : (
              'Request registration'
            )}
          </button>
        )}
      </div>
    </article>
  )
}

export default function CourseRegistration() {
  const [courses, setCourses] = useState([])
  const [myCourses, setMyCourses] = useState([])
  const [currentTerm, setCurrentTerm] = useState(null)
  const [registrationOpen, setRegistrationOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [requirementFilter, setRequirementFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('catalog')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedCourse, setSelectedCourse] = useState(null)

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [catalogResponse, enrolledResponse] = await Promise.all([
        api.get('/student/courses/catalog'),
        api.get('/student/courses/my-courses'),
      ])

      setCourses(catalogResponse.data.courses || [])
      setCurrentTerm(catalogResponse.data.currentTerm || null)
      setRegistrationOpen(Boolean(catalogResponse.data.registrationOpen))
      setMyCourses(enrolledResponse.data.courses || [])
    } catch (err) {
      console.error('Course registration error:', err)

      setError(
        err.response?.data?.message ||
        'Unable to load the course catalogue.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch = [
        course.course_code,
        course.course_name,
        course.instructor_first_name,
        course.instructor_last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesRequirement =
        requirementFilter === 'ALL' ||
        course.requirement_type === requirementFilter

      return matchesSearch && matchesRequirement
    })
  }, [courses, search, requirementFilter])

  async function submitRegistration() {
    if (!selectedCourse) return

    try {
      setSubmitting(selectedCourse.section_id)
      setError('')
      setSuccess('')

      const response = await api.post(
        '/student/courses/requests',
        { sectionId: selectedCourse.section_id }
      )

      setSuccess(
        response.data.message ||
        'Your registration request was submitted.'
      )

      setSelectedCourse(null)
      await fetchCourses()
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to submit your registration request.'
      )
    } finally {
      setSubmitting('')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#CBD9E6] border-t-[#2F4156]" />
          <p className="mt-4 text-sm text-gray-500">
            Loading course catalogue...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#567CBD]">
            Academic Management Platform
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#2F4156] md:text-3xl">
            Course Registration
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Explore courses and submit your registration requests.
          </p>
        </div>

        <button
          onClick={fetchCourses}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#DCE3E9] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] shadow-sm hover:bg-[#F5EFEB]"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto" aria-label="Dismiss error">
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto" aria-label="Dismiss success">
            <X size={17} />
          </button>
        </div>
      )}

      <section className="rounded-2xl bg-[#2F4156] p-5 text-white shadow-sm md:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#CBD9E6]">
              Current academic term
            </p>

            <h2 className="mt-2 text-xl font-bold">
              {currentTerm?.name || 'No active academic term'}
            </h2>

            {currentTerm && (
              <p className="mt-1 text-sm text-[#CBD9E6]">
                {currentTerm.academic_year} · {currentTerm.semester}
              </p>
            )}
          </div>

          <div className={`w-fit rounded-xl px-4 py-3 text-sm font-semibold ${
            registrationOpen
              ? 'bg-green-400/15 text-green-200'
              : 'bg-white/10 text-[#CBD9E6]'
          }`}>
            {registrationOpen ? 'Registration is open' : 'Registration is closed'}
          </div>
        </div>
      </section>

      <div className="flex gap-2 border-b border-[#E8E2DE]">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'catalog'
              ? 'border-[#567CBD] text-[#2F4156]'
              : 'border-transparent text-gray-400 hover:text-[#2F4156]'
          }`}
        >
          Course Catalogue ({courses.length})
        </button>

        <button
          onClick={() => setActiveTab('enrolled')}
          className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === 'enrolled'
              ? 'border-[#567CBD] text-[#2F4156]'
              : 'border-transparent text-gray-400 hover:text-[#2F4156]'
          }`}
        >
          My Enrollments ({myCourses.length})
        </button>
      </div>

      {activeTab === 'catalog' ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by course code, name or instructor..."
                className="w-full rounded-xl border border-[#E8E2DE] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#567CBD]"
              />
            </div>

            <select
              value={requirementFilter}
              onChange={(event) => setRequirementFilter(event.target.value)}
              className="rounded-xl border border-[#E8E2DE] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
            >
              <option value="ALL">All course types</option>
              <option value="REQUIRED">Required</option>
              <option value="ELECTIVE">Elective</option>
              <option value="FREE_ELECTIVE">Free elective</option>
            </select>
          </div>

          {!registrationOpen && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              The registration window is currently closed. You can explore available courses, but you cannot submit registration requests.
            </div>
          )}

          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.section_id}
                  course={course}
                  onRegister={setSelectedCourse}
                  submitting={submitting}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E8E2DE] bg-white p-10 text-center">
              <BookOpen size={32} className="mx-auto text-gray-400" />
              <h3 className="mt-3 font-semibold text-[#2F4156]">
                No courses found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                No available courses match your search or department.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {myCourses.length > 0 ? (
            myCourses.map((course) => (
              <div
                key={course.enrollment_id}
                className="rounded-2xl border border-[#E8E2DE] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-bold text-[#567CBD]">
                      {course.course_code} · {course.section_code}
                    </p>

                    <h3 className="mt-2 font-bold text-[#2F4156]">
                      {course.course_name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      {course.term_name} · {course.academic_year}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {course.credits} credits · {course.ects} ECTS
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    {course.enrollment_status}
                  </span>
                </div>

                <MaterialsSection sectionId={course.section_id} />
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-[#E8E2DE] bg-white p-10 text-center">
              <GraduationCap size={32} className="mx-auto text-gray-400" />

              <h3 className="mt-3 font-semibold text-[#2F4156]">
                No current enrollments
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Your enrolled courses will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#182535]/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#567CBD]">
                  Registration request
                </p>

                <h2 className="mt-2 text-xl font-bold text-[#2F4156]">
                  Confirm request
                </h2>
              </div>

              <button onClick={() => setSelectedCourse(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Close dialog">
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#F5EFEB] p-4">
              <p className="text-xs font-semibold text-[#567CBD]">
                {selectedCourse.course_code} · Section {selectedCourse.section_code}
              </p>

              <p className="mt-2 font-bold text-[#2F4156]">
                {selectedCourse.course_name}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                {selectedCourse.credits} credits · {selectedCourse.ects} ECTS
              </p>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              You are submitting an ADD registration request. It will be sent for review and will not enroll you automatically.
            </p>

            {!registrationOpen && (
              <p className="mt-3 text-sm font-medium text-red-600">
                Registration is closed. You cannot submit this request.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedCourse(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={submitRegistration}
                disabled={!registrationOpen || Boolean(submitting)}
                className="flex-1 rounded-xl bg-[#2F4156] px-4 py-3 text-sm font-semibold text-white hover:bg-[#567CBD] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {submitting ? 'Submitting...' : 'Confirm request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
