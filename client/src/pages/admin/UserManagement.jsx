
import { useCallback, useEffect, useState } from 'react'
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  BriefcaseBusiness,
  Building2,
  Power,
  X,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const roles = [
  'STUDENT',
  'PROFESSOR',
  'SECRETARY',
  'DEPARTMENT_COORDINATOR',
  'ADMIN',
]

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  role: 'STUDENT',
  departmentId: '',
  studentNumber: '',
  enrollmentYear: new Date().getFullYear().toString(),
  yearLevel: '1',
  employeeNumber: '',
  academicTitle: '',
}

const inputClass =
  'w-full rounded-xl border border-[#E3E5E8] bg-white px-3.5 py-2.5 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

function formatRole(role) {
  return role
    ?.replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function RoleBadge({ role }) {
  const styles = {
    STUDENT: 'bg-blue-50 text-blue-700',
    PROFESSOR: 'bg-purple-50 text-purple-700',
    SECRETARY: 'bg-amber-50 text-amber-700',
    DEPARTMENT_COORDINATOR: 'bg-indigo-50 text-indigo-700',
    ADMIN: 'bg-rose-50 text-rose-700',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[role] || 'bg-gray-100 text-gray-600'}`}>
      {formatRole(role)}
    </span>
  )
}

function AccountStatus({ active }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
      active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`} />
      {active ? 'Active' : 'Inactive'}
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
      <p className="mt-3 text-3xl font-bold text-[#2F4156]">{value}</p>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#2F4156]">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
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
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        search: search.trim(),
        role: roleFilter,
        status: statusFilter,
      })

      const data = await request(`/admin/users?${params}`)
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [request, search, roleFilter, statusFilter])

  const loadDepartments = useCallback(async () => {
    try {
      const data = await request('/admin/users/departments')
      setDepartments(data.departments || [])
    } catch (err) {
      setError(err.message)
    }
  }, [request])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function notifySuccess(message) {
    setSuccess(message)
    window.setTimeout(() => setSuccess(''), 3500)
  }

  async function handleCreate(event) {
    event.preventDefault()

    try {
      setSubmitting(true)
      setError('')

      const payload = { ...form }

      if (payload.role !== 'STUDENT') {
        delete payload.studentNumber
        delete payload.enrollmentYear
        delete payload.yearLevel
      }

      if (payload.role !== 'PROFESSOR') {
        delete payload.employeeNumber
        delete payload.academicTitle
      }

     if (
  !['STUDENT', 'PROFESSOR', 'DEPARTMENT_COORDINATOR'].includes(
    payload.role
  )
) {
  delete payload.departmentId
}

      await request('/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setShowCreate(false)
      setForm(emptyForm)
      notifySuccess('User account created successfully.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(user) {
    const action = user.is_active ? 'deactivate' : 'activate'

    if (!window.confirm(`Are you sure you want to ${action} this account?`)) {
      return
    }

    try {
      setError('')

      await request(`/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.is_active }),
      })

      notifySuccess(`Account ${action}d successfully.`)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const activeCount = users.filter((user) => user.is_active).length
  const studentCount = users.filter((user) => user.role === 'STUDENT').length
  const professorCount = users.filter((user) => user.role === 'PROFESSOR').length
  const administratorCount = users.filter((user) => user.role === 'ADMIN').length

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 text-sm text-gray-500">
            Administration / User Management
          </div>
          <h1 className="text-2xl font-bold text-[#2F4156]">
            User Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage accounts and access across the university.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => {
              setError('')
              setShowCreate(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243448]"
          >
            <UserPlus size={17} />
            Create account
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total accounts" value={users.length} icon={Users} color="bg-blue-50 text-blue-600" />
        <StatCard title="Active accounts" value={activeCount} icon={ShieldCheck} color="bg-green-50 text-green-600" />
        <StatCard title="Students" value={studentCount} icon={GraduationCap} color="bg-indigo-50 text-indigo-600" />
        <StatCard title="Professors" value={professorCount} icon={BriefcaseBusiness} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{administratorCount} administrator account(s) in the current results.</span>
        <span>·</span>
        <span>Maximum 300 accounts per query.</span>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, student or employee number..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputClass}>
            <option value="ALL">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>{formatRole(role)}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
            <option value="ALL">All account statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-2xl border border-[#E8E5E2] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#ECE9E6] p-5">
          <div>
            <h2 className="font-bold text-[#2F4156]">University accounts</h2>
            <p className="mt-1 text-xs text-gray-500">
              {users.length} account(s) in the current results
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={35} className="mx-auto text-gray-300" />
            <h3 className="mt-3 font-semibold text-[#2F4156]">No accounts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-[#FAFAF9] text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">User</th>
                  <th className="px-5 py-4 font-semibold">Role</th>
                  <th className="px-5 py-4 font-semibold">Department</th>
                  <th className="px-5 py-4 font-semibold">Account status</th>
                  <th className="px-5 py-4 font-semibold">Created</th>
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEEB]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#FCFCFB]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF2F8] text-sm font-bold text-[#567CBD]">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-[#2F4156]">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                            <Mail size={12} /> {user.email}
                          </p>
                          {user.phone && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                              <Phone size={12} /> {user.phone}
                            </p>
                          )}
                          {user.student_number && (
                            <p className="mt-1 text-xs text-gray-400">
                              Student No: {user.student_number}
                            </p>
                          )}
                          {user.employee_number && (
                            <p className="mt-1 text-xs text-gray-400">
                              Employee No: {user.employee_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#2F4156]">
                        {user.department_name || '—'}
                      </p>
                      {user.department_code && (
                        <p className="mt-1 text-xs text-gray-400">
                          {user.department_code}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <AccountStatus active={user.is_active} />
                    </td>

                    <td className="px-5 py-4 text-sm text-gray-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => toggleStatus(user)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
                          user.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        <Power size={14} />
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create account modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ECE9E6] bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-[#2F4156]">Create university account</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Create an account with the appropriate university role.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <input required value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Last name" required>
                  <input required value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Email address" required>
                  <input required type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Temporary password" required>
                  <input required type="password" minLength={8} value={form.password} onChange={(e) => updateForm('password', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Phone number">
                  <input value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} className={inputClass} />
                </Field>
                <Field label="Account role" required>
                  <select value={form.role} onChange={(e) => updateForm('role', e.target.value)} className={inputClass}>
                    {roles.map((role) => (
                      <option key={role} value={role}>{formatRole(role)}</option>
                    ))}
                  </select>
                </Field>
              </div>

             {(
  form.role === 'STUDENT' ||
  form.role === 'PROFESSOR' ||
  form.role === 'DEPARTMENT_COORDINATOR'
) && (
                <div className="rounded-xl border border-[#E5EAF1] bg-[#FAFBFD] p-4">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
                    <Building2 size={17} /> Department information
                  </h3>

                  <Field label="Department" required>
                    <select
                      required
                      value={form.departmentId}
                      onChange={(e) => updateForm('departmentId', e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select a department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name} ({department.code}) — {department.faculty_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {form.role === 'STUDENT' && (
                <div className="rounded-xl border border-[#E5EAF1] bg-[#FAFBFD] p-4">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
                    <GraduationCap size={17} /> Student information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Student number" required>
                      <input required value={form.studentNumber} onChange={(e) => updateForm('studentNumber', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Enrollment year" required>
                      <input required type="number" min="2000" max="2100" value={form.enrollmentYear} onChange={(e) => updateForm('enrollmentYear', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Year level" required>
                      <select required value={form.yearLevel} onChange={(e) => updateForm('yearLevel', e.target.value)} className={inputClass}>
                        {[1, 2, 3, 4, 5, 6].map((year) => (
                          <option key={year} value={year}>{`Year ${year}`}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              {form.role === 'PROFESSOR' && (
                <div className="rounded-xl border border-[#E5EAF1] bg-[#FAFBFD] p-4">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
                    <BriefcaseBusiness size={17} /> Professor information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Employee number" required>
                      <input required value={form.employeeNumber} onChange={(e) => updateForm('employeeNumber', e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Academic title">
                      <input value={form.academicTitle} onChange={(e) => updateForm('academicTitle', e.target.value)} placeholder="e.g. Assistant Professor" className={inputClass} />
                    </Field>
                  </div>
                </div>
              )}

              {/*form.role === 'DEPARTMENT_COORDINATOR' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  This creates the coordinator's login account. Department assignment is not included because the current database schema does not yet define a coordinator-to-department relationship.
                </div>
              )*/}

              <div className="flex justify-end gap-2 border-t border-[#ECE9E6] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#243448] disabled:opacity-50"
                >
                  {submitting ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
