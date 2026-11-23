
import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  BookOpen,
  GraduationCap,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  X,
  BriefcaseBusiness,
} from 'lucide-react'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const inputClass =
  'w-full rounded-xl border border-[#E3E5E8] bg-white px-3.5 py-2.5 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

function AccountStatus({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? 'bg-green-50 text-green-700'
          : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">
          {title}
        </p>
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

function ProfessorAvatar({ professor }) {
  const initials = `${professor.first_name?.[0] || ''}${
    professor.last_name?.[0] || ''
  }`.toUpperCase()

  if (professor.image_url) {
    return (
      <img
        src={professor.image_url}
        alt={`${professor.first_name} ${professor.last_name}`}
        className="h-11 w-11 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0ECF8] text-sm font-bold text-[#7956A8]">
      {initials || '?'}
    </div>
  )
}

export default function CoordinatorProfessors() {
  const [professors, setProfessors] = useState([])
  const [department, setDepartment] = useState(null)

  const [statistics, setStatistics] = useState({
    total_professors: 0,
    active_professors: 0,
    inactive_professors: 0,
  })

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfessors = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        search: search.trim(),
        status: statusFilter,
      })

      const response = await fetch(
        `${API_URL}/coordinator/professors?${params}`,
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
          data.message || 'Unable to load department professors.'
        )
      }

      setProfessors(data.professors || [])
      setDepartment(data.department || null)

      setStatistics((previous) => ({
        ...previous,
        ...(data.statistics || {}),
      }))
    } catch (err) {
      setError(err.message)
      setProfessors([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    loadProfessors()
  }, [loadProfessors])

  function clearFilters() {
    setSearch('')
    setStatusFilter('ALL')
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm text-gray-500">
            Department Coordination / Professors
          </p>

          <h1 className="text-2xl font-bold text-[#2F4156]">
            Professors Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View professors and their teaching assignments in your department.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProfessors}
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

      {/* Department */}
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total professors"
          value={statistics.total_professors}
          icon={Users}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Active professors"
          value={statistics.active_professors}
          icon={UserCheck}
          color="bg-green-50 text-green-600"
        />

        <StatCard
          title="Inactive professors"
          value={statistics.inactive_professors}
          icon={UserX}
          color="bg-gray-100 text-gray-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Department professor directory
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Search by name, email, employee number, or academic title.
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

        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search professor..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={inputClass}
          >
            <option value="ALL">All account statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Professor table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8E5E2] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-[#ECE9E6] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Department professors
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              {professors.length} professor(s) in the current results
            </p>
          </div>

          <span className="inline-flex items-center gap-2 text-xs text-gray-500">
            <BriefcaseBusiness size={15} />
            Faculty directory
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading professors...
          </div>
        ) : professors.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={36} className="mx-auto text-gray-300" />

            <h3 className="mt-3 font-semibold text-[#2F4156]">
              No professors found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-[#FAFAF9] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Professor
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Employee number
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Teaching sections
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Courses
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Enrolled students
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EEEB]">
                {professors.map((professor) => (
                  <tr
                    key={professor.professor_id}
                    className="hover:bg-[#FCFCFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <ProfessorAvatar professor={professor} />

                        <div>
                          <p className="font-semibold text-[#2F4156]">
                            {professor.first_name} {professor.last_name}
                          </p>

                          <p className="mt-1 text-xs text-[#7956A8]">
                            {professor.academic_title || 'Professor'}
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <Mail size={12} />
                            {professor.email}
                          </p>

                          {professor.phone && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <Phone size={12} />
                              {professor.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-[#2F4156]">
                      {professor.employee_number}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen size={15} className="text-[#567CBD]" />
                        {professor.total_sections}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                        <GraduationCap size={16} className="text-[#567CBD]" />
                        {professor.total_courses}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-600">
                      {professor.total_enrolled_students}
                    </td>

                    <td className="px-5 py-4">
                      <AccountStatus active={professor.is_active} />
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
