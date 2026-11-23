
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Users,
  Filter,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const inputClass =
  'rounded-xl border border-[#E3E5E8] bg-white px-3.5 py-2.5 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

function formatDate(value) {
  if (!value) return 'Unknown date'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Unknown date'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function StatusBadge({ status }) {
  const styles = {
    PENDING: 'bg-amber-50 text-amber-700',
    UNDER_REVIEW: 'bg-blue-50 text-blue-700',
    APPROVED: 'bg-green-50 text-green-700',
    REJECTED: 'bg-red-50 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  }

  const labels = {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {labels[status] || status}
    </span>
  )
}

function SummaryCard({ title, value, icon: Icon, color }) {
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

export default function SecretaryNotifications() {
  const [notifications, setNotifications] = useState([])
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
  })

  const [status, setStatus] = useState('ALL')
  const [type, setType] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams({
        status,
        type,
        search: search.trim(),
      })

      const response = await fetch(
        `${API_URL}/secretary/notifications?${params}`,
        { credentials: 'include' }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load notifications.')
      }

      setNotifications(data.notifications || [])
      setSummary(data.summary || {
        total: 0,
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status, type, search])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <span>Secretary</span>
            <span>/</span>
            <span>Notifications</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#EAF0F7] p-3 text-[#567CBD]">
              <Bell size={23} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2F4156]">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor university registration activity and student requests.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadNotifications}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pending requests"
          value={summary.pending}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          title="Under review"
          value={summary.underReview}
          icon={AlertCircle}
          color="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="Approved"
          value={summary.approved}
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />
        <SummaryCard
          title="Rejected"
          value={summary.rejected}
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[#E8E5E2] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={17} className="text-[#567CBD]" />
          <h2 className="font-semibold text-[#2F4156]">
            Filter notifications
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or course..."
              className={`${inputClass} w-full pl-9`}
            />
          </div>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            <option value="ALL">All notification types</option>
            <option value="REGISTRATION">Registration requests</option>
            <option value="SECTION_CHANGE">Section changes</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Notification list */}
      <div className="overflow-hidden rounded-2xl border border-[#E8E5E2] bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-[#ECE9E6] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Recent activity
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Showing up to 100 matching activities.
            </p>
          </div>

          <span className="text-sm text-gray-500">
            {summary.total} result(s)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={35} className="mx-auto text-gray-300" />
            <h3 className="mt-3 font-semibold text-[#2F4156]">
              No notifications found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no activities matching your selected filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0EEEB]">
            {notifications.map((item) => {
              const isSectionChange =
                item.notification_type === 'SECTION_CHANGE'

              const isAdd = item.action === 'ADD'

              return (
                <div
                  key={`${item.notification_type}-${item.id}`}
                  className="flex flex-col gap-4 p-5 transition hover:bg-[#FCFCFB] sm:flex-row sm:items-start"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isSectionChange
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-[#EDF2F8] text-[#567CBD]'
                    }`}
                  >
                    {isSectionChange ? (
                      <Users size={20} />
                    ) : (
                      <BookOpen size={20} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#2F4156]">
                        {isSectionChange
                          ? 'Section change request'
                          : `${isAdd ? 'Course registration' : 'Course drop'} request`}
                      </h3>

                      <StatusBadge status={item.status} />
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      <span className="font-semibold text-[#2F4156]">
                        {item.first_name} {item.last_name}
                      </span>
                      {' '}({item.student_number}) submitted a request for{' '}
                      <span className="font-semibold text-[#2F4156]">
                        {item.course_code} — {item.course_name}
                      </span>
                      {' '}(Section {item.section_code}).
                    </p>

                    {item.reason && (
                      <p className="mt-2 rounded-lg bg-[#F8F7F5] px-3 py-2 text-sm text-gray-600">
                        <span className="font-semibold text-gray-700">
                          Reason:
                        </span>{' '}
                        {item.reason}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <Clock size={13} />
                      {formatDate(item.submitted_at)}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center">
                    <Link
                      to="/secretary/requests"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3E6EA] px-3.5 py-2.5 text-sm font-semibold text-[#567CBD] hover:bg-[#EDF2F8]"
                    >
                      View requests
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
