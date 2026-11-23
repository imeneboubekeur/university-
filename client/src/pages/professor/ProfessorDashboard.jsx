
import { useEffect, useState } from 'react'
import {
  BookOpen,
  Users,
  DoorOpen,
  GraduationCap,
  CalendarDays,
  MapPin,
  Clock,
  RefreshCw,
  AlertCircle,
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
    return schedule
      .map((item) => {
        if (typeof item === 'string') return item

        const day = item.day || item.dayOfWeek || ''
        const start = item.startTime || item.start_time || ''
        const end = item.endTime || item.end_time || ''

        return [day, start && end ? `${start} - ${end}` : start || end]
          .filter(Boolean)
          .join(' · ')
      })
      .join(', ') || 'Not scheduled'
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

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#7B8490]">{title}</p>
          <h3 className="mt-3 text-3xl font-bold text-[#2F4156]">
            {value}
          </h3>
          <p className="mt-2 text-xs text-[#9299A2]">{description}</p>
        </div>

        <div className="rounded-xl bg-[#CBD9E6]/50 p-3 text-[#567CBD]">
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    OPEN: 'bg-green-50 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-600',
    PLANNED: 'bg-blue-50 text-blue-700',
    CANCELLED: 'bg-red-50 text-red-700',
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status || 'UNKNOWN'}
    </span>
  )
}

export default function ProfessorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`${API_URL}/professor/dashboard`, {
        method: 'GET',
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to load professor dashboard.')
      }

      setData(result)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#7B8490]">
          <RefreshCw className="animate-spin" size={20} />
          Loading professor dashboard...
        </div>
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
          onClick={loadDashboard}
          className="mt-4 rounded-lg bg-[#2F4156] px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!data?.professor) return null

  const { professor, activeTerm, summary, sections } = data

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#567CBD]">
            Professor Portal
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#2F4156]">
            Welcome, {professor.academic_title ? `${professor.academic_title} ` : ''}
            {professor.first_name} {professor.last_name}
          </h1>
          <p className="mt-1 text-sm text-[#7B8490]">
            Manage your teaching activities and assigned course sections.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] hover:bg-[#F8FAFC]"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Professor information */}
      <div className="rounded-2xl bg-[#2F4156] p-6 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <GraduationCap size={28} />
            </div>

            <div>
              <p className="text-sm text-white/70">Professor account</p>
              <h2 className="mt-1 text-lg font-bold">
                {professor.first_name} {professor.last_name}
              </h2>
              <p className="mt-1 text-sm text-white/70">{professor.email}</p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-white/60">Employee number</p>
              <p className="mt-1 font-semibold">{professor.employee_number}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Department</p>
              <p className="mt-1 font-semibold">{professor.department_name}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-white/60">Faculty</p>
              <p className="mt-1 font-semibold">{professor.faculty_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active academic term */}
      <div className="flex flex-col justify-between gap-2 rounded-2xl border border-[#E8E5E1] bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#CBD9E6]/50 p-3 text-[#567CBD]">
            <CalendarDays size={21} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9299A2]">
              Active academic term
            </p>
            <p className="mt-1 font-bold text-[#2F4156]">
              {activeTerm
                ? `${activeTerm.name} · ${activeTerm.academic_year}`
                : 'No active academic term'}
            </p>
          </div>
        </div>

        {activeTerm && (
          <span className="w-fit rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {formatSemester(activeTerm.semester)}
          </span>
        )}
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Assigned Sections"
          value={summary.totalSections}
          description="Sections assigned to you"
          icon={BookOpen}
        />
        <StatCard
          title="Enrolled Students"
          value={summary.totalStudents}
          description="Students in your sections"
          icon={Users}
        />
        <StatCard
          title="Open Sections"
          value={summary.openSections}
          description="Sections currently open"
          icon={DoorOpen}
        />
        <StatCard
          title="Total Capacity"
          value={summary.totalCapacity}
          description="Combined section capacity"
          icon={GraduationCap}
        />
      </div>

      {/* Assigned courses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#2F4156]">
              My Teaching Sections
            </h2>
            <p className="mt-1 text-sm text-[#9299A2]">
              Course sections assigned to your professor account.
            </p>
          </div>
          <span className="rounded-lg bg-[#CBD9E6]/50 px-3 py-1.5 text-sm font-semibold text-[#567CBD]">
            {sections.length} sections
          </span>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8DDE3] bg-white p-10 text-center">
            <BookOpen className="mx-auto text-[#9AA7B5]" size={34} />
            <h3 className="mt-3 font-semibold text-[#2F4156]">
              No assigned sections
            </h3>
            <p className="mt-1 text-sm text-[#9299A2]">
              No course sections have been assigned to you for this term.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {sections.map((section) => {
              const enrolled = Number(section.enrolled_count || 0)
              const capacity = Number(section.capacity || 0)
              const percentage = capacity
                ? Math.min((enrolled / capacity) * 100, 100)
                : 0

              return (
                <article
                  key={section.section_id}
                  className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#567CBD]">
                        {section.course_code} · Section {section.section_code}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-[#2F4156]">
                        {section.course_name}
                      </h3>
                      <p className="mt-1 text-xs text-[#9299A2]">
                        {section.credits} credits · {section.ects} ECTS
                      </p>
                    </div>
                    <StatusBadge status={section.section_status} />
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-[#F0EFED] pt-4 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-[#697586]">
                      <Users size={16} className="text-[#567CBD]" />
                      {enrolled} / {capacity} students
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#697586]">
                      <MapPin size={16} className="text-[#567CBD]" />
                      {section.room || 'Room not assigned'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#697586]">
                      <CalendarDays size={16} className="text-[#567CBD]" />
                      {section.term_name} · {section.academic_year}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#697586]">
                      <Clock size={16} className="text-[#567CBD]" />
                      {formatSchedule(section.schedule)}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="font-medium text-[#7B8490]">
                        Section capacity
                      </span>
                      <span className="font-bold text-[#2F4156]">
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
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
