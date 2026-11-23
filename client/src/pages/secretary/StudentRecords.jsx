
import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  Users,
  GraduationCap,
  Mail,
  X,
  UserRound,
  Building2,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const statusStyles = {
  ACTIVE: 'bg-green-50 text-green-700',
  SUSPENDED: 'bg-amber-50 text-amber-700',
  GRADUATED: 'bg-blue-50 text-blue-700',
  WITHDRAWN: 'bg-red-50 text-red-700',
}

export default function StudentRecords() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

  const fetchStudents = useCallback(async (searchTerm = '') => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }

      const response = await fetch(
        `${API_URL}/secretary/students?${params.toString()}`,
        { credentials: 'include' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load student records.')
      }

      setStudents(data.students || [])
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(search)
    }, 350)

    return () => clearTimeout(timer)
  }, [search, fetchStudents])

  const activeCount = students.filter(
    (student) => student.status === 'ACTIVE'
  ).length

  const graduatedCount = students.filter(
    (student) => student.status === 'GRADUATED'
  ).length

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            Secretary workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#2F4156]">
            Student Records
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Search and manage student academic records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchStudents(search)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Students found</p>
            <Users size={20} className="text-[#567CBD]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {students.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Active students</p>
            <GraduationCap size={20} className="text-green-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Graduated students</p>
            <GraduationCap size={20} className="text-blue-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {graduatedCount}
          </p>
        </div>
      </div>

      {/* Student table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-5">
          <h2 className="font-semibold text-[#2F4156]">
            Student directory
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Search by student name, student number, or email.
          </p>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search students..."
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3 font-semibold">Student</th>
                <th className="px-3 py-3 font-semibold">Student number</th>
                <th className="px-3 py-3 font-semibold">Department</th>
                <th className="px-3 py-3 font-semibold">Year</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-12 text-center text-sm text-gray-500">
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-12 text-center">
                    <Users size={30} className="mx-auto text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-600">
                      No students found
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Try another name, student number, or email.
                    </p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/70">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CBD9E6]/50 text-[#2F4156]">
                          <UserRound size={19} />
                        </div>
                        <div>
                          <p className="font-semibold text-[#2F4156]">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-sm font-medium text-gray-700">
                      {student.student_number}
                    </td>

                    <td className="px-3 py-4">
                      <p className="text-sm text-gray-700">
                        {student.department_name || '—'}
                      </p>
                      {student.faculty_name && (
                        <p className="mt-1 text-xs text-gray-400">
                          {student.faculty_name}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-4 text-sm text-gray-600">
                      {student.year_level
                        ? `Year ${student.year_level}`
                        : '—'}
                    </td>

                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusStyles[student.status] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {student.status || 'UNKNOWN'}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(student)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#2F4156] hover:border-[#567CBD] hover:bg-[#CBD9E6]/30"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
          Showing {students.length} student record(s).
        </div>
      </div>

      {/* Student details modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#567CBD]">
                  Student information
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#2F4156]">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close student details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-xl bg-[#F5EFEB] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#CBD9E6] text-[#2F4156]">
                  <UserRound size={22} />
                </div>
                <div>
                  <p className="font-semibold text-[#2F4156]">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedStudent.student_number}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Email address</p>
                  <p className="mt-1 flex items-center gap-2 break-all text-sm font-medium text-[#2F4156]">
                    <Mail size={15} />
                    {selectedStudent.email || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium text-[#2F4156]">
                    <Building2 size={15} />
                    {selectedStudent.department_name || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Faculty</p>
                  <p className="mt-1 text-sm font-medium text-[#2F4156]">
                    {selectedStudent.faculty_name || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Enrollment year</p>
                  <p className="mt-1 text-sm font-medium text-[#2F4156]">
                    {selectedStudent.enrollment_year || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Year level</p>
                  <p className="mt-1 text-sm font-medium text-[#2F4156]">
                    {selectedStudent.year_level
                      ? `Year ${selectedStudent.year_level}`
                      : '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="mt-1 text-sm font-medium text-[#2F4156]">
                    {selectedStudent.status || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 p-5">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#243548]"
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
