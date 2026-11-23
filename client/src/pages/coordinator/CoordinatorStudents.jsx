
import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  GraduationCap,
  UserCheck,
  UserX,
  BookOpen,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  X,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const inputClass =
  'w-full rounded-xl border border-[#E3E5E8] bg-white px-3.5 py-2.5 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

function StudentStatus({ status }) {
  const styles = {
    ACTIVE: 'bg-green-50 text-green-700',
    SUSPENDED: 'bg-amber-50 text-amber-700',
    GRADUATED: 'bg-blue-50 text-blue-700',
    WITHDRAWN: 'bg-gray-100 text-gray-600',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {status
        ? status.charAt(0) + status.slice(1).toLowerCase()
        : 'Unknown'}
    </span>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-3 text-3xl font-bold text-[#2F4156]">
        {value ?? 0}
      </p>
    </div>
  )
}

function StudentAvatar({ student }) {
  const initials = `${student.first_name?.[0] || ''}${
    student.last_name?.[0] || ''
  }`.toUpperCase()

  if (student.image_url) {
    return (
      <img
        src={student.image_url}
        alt={`${student.first_name} ${student.last_name}`}
        className="h-11 w-11 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EDF2F8] text-sm font-bold text-[#567CBD]">
      {initials || '?'}
    </div>
  )
}

export default function CoordinatorStudents() {
  const [students, setStudents] = useState([])
  const [department, setDepartment] = useState(null)
  const [statistics, setStatistics] = useState({
    total_students: 0,
    active_students: 0,
    suspended_students: 0,
    graduated_students: 0,
    withdrawn_students: 0,
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [yearLevelFilter, setYearLevelFilter] = useState('ALL')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
        yearLevel: yearLevelFilter,
      })

      const response = await fetch(
        `${API_URL}/coordinator/students?${params}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to load department students.'
        )
      }

      setStudents(data.students || [])
      setDepartment(data.department || null)
      setStatistics((previous) => ({
        ...previous,
        ...(data.statistics || {}),
      }))
    } catch (err) {
      setError(err.message)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, yearLevelFilter])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  function clearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setYearLevelFilter('ALL')
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm text-gray-500">
            Department Coordination / Students
          </p>

          <h1 className="text-2xl font-bold text-[#2F4156]">
            Students Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and search students registered in your department.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStudents}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Department information */}
      {department && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EDF2F8] text-[#567CBD]">
            <Building2 size={23} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Your assigned department
            </p>

            <h2 className="mt-1 font-bold text-[#2F4156]">
              {department.name}
              {department.code && (
                <span className="ml-2 rounded-md bg-[#EDF2F8] px-2 py-1 text-xs font-semibold text-[#567CBD]">
                  {department.code}
                </span>
              )}
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {department.faculty_name}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total students"
          value={statistics.total_students}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Active students"
          value={statistics.active_students}
          icon={UserCheck}
          color="bg-green-50 text-green-600"
        />

        <StatCard
          title="Suspended students"
          value={statistics.suspended_students}
          icon={UserX}
          color="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Graduated students"
          value={statistics.graduated_students}
          icon={GraduationCap}
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Department student directory
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Search and filter students in your department.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="text-left text-xs font-semibold text-[#567CBD] hover:underline sm:text-right"
          >
            Clear filters
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, student number..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="ALL">All student statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="GRADUATED">Graduated</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>

          <select
            value={yearLevelFilter}
            onChange={(event) => setYearLevelFilter(event.target.value)}
            className={inputClass}
          >
            <option value="ALL">All year levels</option>
            {[1, 2, 3, 4, 5, 6].map((year) => (
              <option key={year} value={String(year)}>
                Year {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8E5E2] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-[#ECE9E6] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Students
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {students.length} student(s) in the current results
            </p>
          </div>

          <span className="inline-flex items-center gap-2 text-xs text-gray-500">
            <BookOpen size={15} />
            Department directory
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={36} className="mx-auto text-gray-300" />

            <h3 className="mt-3 font-semibold text-[#2F4156]">
              No students found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-[#FAFAF9] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Student
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Student number
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Academic year
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Enrollment year
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EEEB]">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-[#FCFCFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <StudentAvatar student={student} />

                        <div>
                          <p className="font-semibold text-[#2F4156]">
                            {student.first_name} {student.last_name}
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <Mail size={12} />
                            {student.email}
                          </p>

                          {student.phone && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <Phone size={12} />
                              {student.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-[#2F4156]">
                      {student.student_number}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      Year {student.year_level}
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {student.enrollment_year}
                    </td>

                    <td className="px-5 py-4">
                      <StudentStatus status={student.student_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
