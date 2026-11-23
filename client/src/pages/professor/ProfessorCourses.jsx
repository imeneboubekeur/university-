
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Users,
  Layers,
  Search,
  RefreshCw,
  AlertCircle,
  MapPin,
  CalendarDays,
  Clock,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  FileText,
UploadCloud,
Download,
Trash2,
LoaderCircle,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function formatSemester(semester) {
  if (Number(semester) === 1) return 'Fall'
  if (Number(semester) === 2) return 'Spring'
  return 'Semester'
}

function formatSchedule(schedule) {
  if (!schedule) return 'Not scheduled'

  if (typeof schedule === 'string') {
    try {
      schedule = JSON.parse(schedule)
    } catch {
      return schedule
    }
  }

  if (Array.isArray(schedule)) {
    return schedule.map((item) => {
      if (typeof item === 'string') return item

      const day = item.day || item.dayOfWeek || ''
      const start = item.startTime || item.start_time || ''
      const end = item.endTime || item.end_time || ''

      return [day, start && end ? `${start} - ${end}` : start || end]
        .filter(Boolean)
        .join(' · ')
    }).join(', ') || 'Not scheduled'
  }

  if (typeof schedule === 'object') {
    return Object.entries(schedule)
      .map(([day, value]) => {
        if (typeof value === 'string') return `${day}: ${value}`
        if (Array.isArray(value)) return `${day}: ${value.join(', ')}`
        return `${day}: ${JSON.stringify(value)}`
      })
      .join(' · ')
  }

  return String(schedule)
}

function StatusBadge({ status }) {
  const styles = {
    OPEN: 'bg-green-50 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    PLANNED: 'bg-blue-50 text-blue-700',
    CANCELLED: 'bg-red-50 text-red-700',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
      styles[status] || 'bg-gray-100 text-gray-600'
    }`}>
      {status || 'UNKNOWN'}
    </span>
  )
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#7B8490]">{label}</p>
          <h3 className="mt-2 text-3xl font-bold text-[#2F4156]">{value}</h3>
        </div>
        <div className="rounded-xl bg-[#CBD9E6]/50 p-3 text-[#567CBD]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}
function formatFileSize(bytes) {
  const size = Number(bytes || 0)

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function SectionCard({ section }) {
  const [expanded, setExpanded] = useState(false)

  const [materials, setMaterials] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [selectedFile, setSelectedFile] = useState(null)
  const [materialTitle, setMaterialTitle] = useState('')

  const [materialError, setMaterialError] = useState('')
  const [materialSuccess, setMaterialSuccess] = useState('')

  const capacity = Number(section.capacity || 0)
  const enrolled = Number(section.enrolledCount || 0)

  const percentage = capacity
    ? Math.min((enrolled / capacity) * 100, 100)
    : 0

  async function loadMaterials() {
    try {
      setMaterialsLoading(true)
      setMaterialError('')

      const response = await fetch(
        `${API_URL}/professor/sections/${section.id}/materials`,
        {
          credentials: 'include',
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to load course materials.')
      }

      setMaterials(result.materials || [])
    } catch (error) {
      setMaterialError(error.message)
    } finally {
      setMaterialsLoading(false)
    }
  }

  useEffect(() => {
    if (expanded) {
      loadMaterials()
    }
  }, [expanded, section.id])

  async function handleUpload(event) {
    event.preventDefault()

    if (!selectedFile) {
      setMaterialError('Please select a PDF file.')
      return
    }

    if (selectedFile.type !== 'application/pdf') {
      setMaterialError('Only PDF files are allowed.')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setMaterialError('The maximum file size is 10 MB.')
      return
    }

    try {
      setUploading(true)
      setMaterialError('')
      setMaterialSuccess('')

      const formData = new FormData()
      formData.append('file', selectedFile)

      if (materialTitle.trim()) {
        formData.append('title', materialTitle.trim())
      }

      const response = await fetch(
        `${API_URL}/professor/sections/${section.id}/materials`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to upload PDF.')
      }

      setMaterials((previous) => [
        result.material,
        ...previous,
      ])

      setSelectedFile(null)
      setMaterialTitle('')
      setMaterialSuccess('PDF uploaded successfully.')

      const fileInput = document.getElementById(
        `material-file-${section.id}`
      )

      if (fileInput) fileInput.value = ''
    } catch (error) {
      setMaterialError(error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(materialId) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this course material?'
    )

    if (!confirmed) return

    try {
      setDeletingId(materialId)
      setMaterialError('')
      setMaterialSuccess('')

      const response = await fetch(
        `${API_URL}/professor/sections/${section.id}/materials/${materialId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to delete material.')
      }

      setMaterials((previous) =>
        previous.filter((item) => item.id !== materialId)
      )

      setMaterialSuccess('Course material deleted successfully.')
    } catch (error) {
      setMaterialError(error.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-[#E8E5E1] bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#2F4156]">
              Section {section.sectionCode}
            </span>
            <StatusBadge status={section.status} />
          </div>

          <p className="mt-1 text-sm text-[#9299A2]">
            {section.term?.name} · {section.term?.academicYear}
          </p>
        </div>

        <div className="flex items-center justify-between gap-5 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="text-sm font-semibold text-[#2F4156]">
              {enrolled} / {capacity}
            </p>
            <p className="text-xs text-[#9299A2]">
              Enrolled students
            </p>
          </div>

          {expanded
            ? <ChevronUp size={19} className="text-[#7B8490]" />
            : <ChevronDown size={19} className="text-[#7B8490]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#F0EFED] p-4">
          {/* Section information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2 text-sm text-[#697586]">
              <MapPin size={17} className="mt-0.5 text-[#567CBD]" />
              <div>
                <p className="text-xs text-[#9299A2]">Room</p>
                <p className="mt-1 font-medium text-[#2F4156]">
                  {section.room || 'Not assigned'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-[#697586]">
              <Clock size={17} className="mt-0.5 text-[#567CBD]" />
              <div>
                <p className="text-xs text-[#9299A2]">Schedule</p>
                <p className="mt-1 font-medium text-[#2F4156]">
                  {formatSchedule(section.schedule)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-[#697586]">
              <CalendarDays size={17} className="mt-0.5 text-[#567CBD]" />
              <div>
                <p className="text-xs text-[#9299A2]">Academic term</p>
                <p className="mt-1 font-medium text-[#2F4156]">
                  {section.term?.name} · {section.term?.academicYear}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-[#697586]">
              <GraduationCap size={17} className="mt-0.5 text-[#567CBD]" />
              <div>
                <p className="text-xs text-[#9299A2]">Credits / ECTS</p>
                <p className="mt-1 font-medium text-[#2F4156]">
                  {section.courseCredits ?? '—'} credits
                </p>
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-[#7B8490]">Section capacity</span>
              <span className="font-semibold text-[#2F4156]">
                {Math.round(percentage)}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F3]">
              <div
                className="h-full rounded-full bg-[#567CBD]"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Course materials */}
          <div className="mt-6 border-t border-[#F0EFED] pt-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <FileText size={19} className="text-[#567CBD]" />
                  <h4 className="font-bold text-[#2F4156]">
                    Course Materials
                  </h4>
                </div>

                <p className="mt-1 text-xs text-[#9299A2]">
                  Upload and manage PDF documents for this section.
                </p>
              </div>

              <span className="w-fit rounded-lg bg-[#CBD9E6]/40 px-3 py-1.5 text-xs font-semibold text-[#567CBD]">
                {materials.length} files
              </span>
            </div>

            {/* Feedback */}
            {materialError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {materialError}
              </div>
            )}

            {materialSuccess && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {materialSuccess}
              </div>
            )}

            {/* Upload form */}
            <form
              onSubmit={handleUpload}
              className="mt-4 rounded-xl border border-dashed border-[#CBD9E6] bg-[#F8FAFC] p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#2F4156]">
                    Material title
                  </label>

                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(event) => setMaterialTitle(event.target.value)}
                    placeholder="e.g. Lecture 01 - Introduction"
                    maxLength={255}
                    className="w-full rounded-lg border border-[#E2E5E9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#2F4156]">
                    Select PDF
                  </label>

                  <input
                    id={`material-file-${section.id}`}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] || null)
                      setMaterialError('')
                      setMaterialSuccess('')
                    }}
                    className="w-full rounded-lg border border-[#E2E5E9] bg-white px-3 py-2 text-xs text-[#697586] file:mr-3 file:rounded-md file:border-0 file:bg-[#CBD9E6]/50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2F4156]"
                  />
                </div>
              </div>

              {selectedFile && (
                <p className="mt-2 text-xs text-[#697586]">
                  Selected: {selectedFile.name} · {formatFileSize(selectedFile.size)}
                </p>
              )}

              <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-xs text-[#9299A2]">
                  PDF only · Maximum size 10 MB
                </p>

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#567CBD] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#456BA9] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <UploadCloud size={16} />
                  )}

                  {uploading ? 'Uploading...' : 'Upload PDF'}
                </button>
              </div>
            </form>

            {/* Materials list */}
            <div className="mt-5 space-y-3">
              {materialsLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#9299A2]">
                  <LoaderCircle size={17} className="animate-spin" />
                  Loading course materials...
                </div>
              ) : materials.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D8DDE3] p-6 text-center">
                  <FileText size={27} className="mx-auto text-[#9AA7B5]" />
                  <p className="mt-2 text-sm font-medium text-[#2F4156]">
                    No materials uploaded yet
                  </p>
                  <p className="mt-1 text-xs text-[#9299A2]">
                    Uploaded PDFs will appear here.
                  </p>
                </div>
              ) : (
                materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-[#E8E5E1] p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-red-50 p-3 text-red-500">
                        <FileText size={21} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#2F4156]">
                          {material.title}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#9299A2]">
                          {material.originalFilename} · {formatFileSize(material.fileSizeBytes)}
                        </p>

                        <p className="mt-1 text-xs text-[#9299A2]">
                          {new Date(material.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <a
                        href={material.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD9E6] px-3 py-2 text-xs font-semibold text-[#567CBD] hover:bg-[#F5F8FC]"
                      >
                        <Download size={15} />
                        Download
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDelete(material.id)}
                        disabled={deletingId === material.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === material.id ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export default function ProfessorCourses() {
  const [courses, setCourses] = useState([])
  const [summary, setSummary] = useState({
    totalCourses: 0,
    totalSections: 0,
    totalStudents: 0,
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadCourses() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`${API_URL}/professor/courses`, {
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to load courses.')
      }

      setCourses(result.courses || [])
      setSummary(result.summary || {
        totalCourses: 0,
        totalSections: 0,
        totalStudents: 0,
      })
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const filteredCourses = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return courses

    return courses.filter((course) =>
      [
        course.code,
        course.name,
        course.description,
        ...course.sections.map((section) => section.sectionCode),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [courses, search])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center gap-3 text-sm text-[#7B8490]">
        <RefreshCw size={20} className="animate-spin" />
        Loading your courses...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle size={22} />
          <p className="font-semibold">{error}</p>
        </div>
        <button
          onClick={loadCourses}
          className="mt-4 rounded-lg bg-[#2F4156] px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#567CBD]">
            Professor Portal
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#2F4156]">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-[#7B8490]">
            View your assigned courses, sections, and student enrollment.
          </p>
        </div>

        <button
          onClick={loadCourses}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156]"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Assigned Courses"
          value={summary.totalCourses}
          icon={BookOpen}
        />
        <SummaryCard
          label="Assigned Sections"
          value={summary.totalSections}
          icon={Layers}
        />
        <SummaryCard
          label="Enrolled Students"
          value={summary.totalStudents}
          icon={Users}
        />
      </div>

      <div className="rounded-2xl border border-[#E8E5E1] bg-white p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A2]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course code, name, or section..."
            className="w-full rounded-xl border border-[#E2E5E9] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#567CBD]"
          />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#2F4156]">
              Assigned Courses
            </h2>
            <p className="mt-1 text-sm text-[#9299A2]">
              All course sections assigned to your account.
            </p>
          </div>
          <span className="rounded-lg bg-[#CBD9E6]/50 px-3 py-1.5 text-sm font-semibold text-[#567CBD]">
            {filteredCourses.length} courses
          </span>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8DDE3] bg-white p-10 text-center">
            <BookOpen className="mx-auto text-[#9AA7B5]" size={35} />
            <h3 className="mt-3 font-semibold text-[#2F4156]">
              {search ? 'No matching courses' : 'No assigned courses yet'}
            </h3>
            <p className="mt-1 text-sm text-[#9299A2]">
              {search
                ? 'Try another course name or code.'
                : 'Your assigned course sections will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <article
                key={course.id}
                className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#567CBD]">
                      {course.code}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-[#2F4156]">
                      {course.name}
                    </h3>
                    {course.description && (
                      <p className="mt-2 max-w-3xl text-sm text-[#7B8490]">
                        {course.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-[#F5EFEB] px-3 py-1.5 text-xs font-semibold text-[#2F4156]">
                      {course.credits} credits
                    </span>
                    <span className="rounded-lg bg-[#CBD9E6]/50 px-3 py-1.5 text-xs font-semibold text-[#567CBD]">
                      {course.ects} ECTS
                    </span>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#F0EFED] pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#2F4156]">
                      Course Sections
                    </h4>
                    <span className="text-xs text-[#9299A2]">
                      {course.sections.length} sections
                    </span>
                  </div>

                  <div className="space-y-3">
                    {course.sections.map((section) => (
                      <SectionCard
                        key={section.id}
                        section={{
                          ...section,
                          courseCredits: course.credits,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
