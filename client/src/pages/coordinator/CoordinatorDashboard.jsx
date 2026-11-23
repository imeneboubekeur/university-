
import { useEffect, useState } from 'react'
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Building2,
  Clock3,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

export default function CoordinatorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(
        `${API_URL}/coordinator/dashboard`,
        {
          credentials: 'include',
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(
          result.message || 'Unable to load coordinator dashboard.'
        )
      }

      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const summary = data?.summary

  const statistics = [
    {
      label: 'Total Students',
      value: summary?.totalStudents ?? 0,
      icon: Users,
      description: 'Active students in your department',
    },
    {
      label: 'Professors',
      value: summary?.totalProfessors ?? 0,
      icon: GraduationCap,
      description: 'Department teaching staff',
    },
    {
      label: 'Courses',
      value: summary?.totalCourses ?? 0,
      icon: BookOpen,
      description: 'Available department courses',
    },
    {
      label: 'Sections',
      value: summary?.totalSections ?? 0,
      icon: CalendarDays,
      description: 'Sections in the active term',
    },
  ]

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center text-sm text-[#8290A0]">
        Loading department dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            Academic Management
          </p>

          <h1 className="text-2xl font-bold text-[#2F4156]">
            Department Dashboard
          </h1>

          <p className="mt-1 text-sm text-[#8290A0]">
            Monitor your department's academic activities and statistics.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE3EB] bg-white px-4 py-3 text-sm font-semibold text-[#2F4156] hover:bg-[#F8FAFC] disabled:opacity-50"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load dashboard</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Department information */}
          <div className="rounded-2xl bg-[#2F4156] p-6 text-white shadow-sm">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#CBD9E6]">
                  Your Department
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {data.department.name}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#CBD9E6]">
                  <span className="rounded-lg bg-white/10 px-3 py-1.5">
                    {data.department.code}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Building2 size={15} />
                    {data.department.facultyName}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 p-4 sm:min-w-56">
                <p className="text-xs font-medium text-[#CBD9E6]">
                  Department Coordinator
                </p>

                <p className="mt-2 font-semibold">
                  {data.coordinator.firstName}{' '}
                  {data.coordinator.lastName}
                </p>

                <p className="mt-1 text-xs text-[#CBD9E6]">
                  {data.coordinator.email}
                </p>
              </div>
            </div>
          </div>

          {/* Active term */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF0F8] text-[#567CBD]">
                <Clock3 size={21} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8290A0]">
                  Active Academic Term
                </p>

                <h3 className="mt-1 font-semibold text-[#2F4156]">
                  {data.activeTerm
                    ? data.activeTerm.name
                    : 'No active term'}
                </h3>
              </div>
            </div>

            {data.activeTerm && (
              <div className="text-sm text-[#8290A0]">
                {data.activeTerm.academic_year} ·{' '}
                {Number(data.activeTerm.semester) === 1
                  ? 'Fall'
                  : Number(data.activeTerm.semester) === 2
                    ? 'Spring'
                    : `Semester ${data.activeTerm.semester}`}
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#8290A0]">
                      {item.label}
                    </p>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F8] text-[#567CBD]">
                      <Icon size={20} />
                    </div>
                  </div>

                  <p className="mt-4 text-3xl font-bold text-[#2F4156]">
                    {item.value}
                  </p>

                  <p className="mt-2 text-xs text-[#9AA5B1]">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Pending requests */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#2F4156]">
                Requests Overview
              </h2>

              <p className="mt-1 text-sm text-[#8290A0]">
                Requests currently awaiting review in your department.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#8290A0]">
                      Registration Requests
                    </p>

                    <p className="mt-3 text-3xl font-bold text-[#2F4156]">
                      {summary.pendingRegistrationRequests}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF0F8] text-[#567CBD]">
                    <ClipboardList size={22} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-[#9AA5B1]">
                  Pending add/drop requests
                </p>
              </div>

              <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#8290A0]">
                      Section Change Requests
                    </p>

                    <p className="mt-3 text-3xl font-bold text-[#2F4156]">
                      {summary.pendingSectionChangeRequests}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF0F8] text-[#567CBD]">
                    <CalendarDays size={22} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-[#9AA5B1]">
                  Pending section change requests
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
