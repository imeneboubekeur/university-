
import { useCallback, useEffect, useState } from 'react'
import {
  Search,
  RefreshCw,
  ClipboardList,
  Clock3,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  FileText,
  UserRound,
  BookOpen,
  CalendarDays,
  X,
  LoaderCircle,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const statusStyles = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-[#2F4156]">
            {value ?? 0}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        statusStyles[status] || statusStyles.CANCELLED
      }`}
    >
      {status?.replaceAll('_', ' ') || 'UNKNOWN'}
    </span>
  )
}

export default function CoordinatorRequests() {
  const [requests, setRequests] = useState([])
  const [stats, setStats] = useState({})
  const [type, setType] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  const fetchRequests = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const params = new URLSearchParams({
        type,
        status,
        search,
      })

      const response = await fetch(
        `${API_URL}/coordinator/requests?${params.toString()}`,
        { credentials: 'include' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load requests.')
      }

      setRequests(data.requests || [])
      setStats(data.stats || {})
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [type, status, search])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  function openReview(request) {
    setSelectedRequest(request)
    setReviewNote('')
    setSuccess('')
    setError('')
  }

  async function submitReview(decision) {
    if (!selectedRequest || submitting) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    const endpoint =
      selectedRequest.request_category === 'REGISTRATION'
        ? 'registration'
        : 'section-change'

    try {
      const response = await fetch(
        `${API_URL}/coordinator/requests/${endpoint}/${selectedRequest.id}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: decision,
            reviewNote,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to review this request.')
      }

      setSelectedRequest(null)
      setReviewNote('')
      setSuccess(data.message || 'Request reviewed successfully.')
      await fetchRequests(true)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingCount = stats.pending || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#567CBD]">
            Department coordination
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#2F4156]">
            Student Requests
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review registration and section-change requests from your department.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchRequests(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE3EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {error && !selectedRequest && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle size={17} />
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total requests"
          value={stats.total}
          icon={ClipboardList}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          icon={Clock3}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="bg-red-50 text-red-700"
        />
      </div>

      <div className="rounded-2xl border border-[#E7E3DF] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, number, or course..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
            />
          </div>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
          >
            <option value="ALL">All request types</option>
            <option value="REGISTRATION">Registration</option>
            <option value="SECTION_CHANGE">Section changes</option>
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
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

      <div className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-[#2F4156]">Requests list</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {requests.length} request{requests.length === 1 ? '' : 's'} found
            </p>
          </div>
          <span className="rounded-lg bg-[#F5EFEB] px-3 py-1.5 text-xs font-semibold text-[#2F4156]">
            Department requests
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <LoaderCircle size={19} className="animate-spin" />
            Loading requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="rounded-2xl bg-[#F5EFEB] p-4 text-[#567CBD]">
              <FileText size={27} />
            </div>
            <h3 className="mt-4 font-semibold text-[#2F4156]">
              No requests found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              There are no requests matching your current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Request</th>
                  <th className="px-5 py-3 font-semibold">Course</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((request) => (
                  <tr key={`${request.request_category}-${request.id}`} className="hover:bg-gray-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#2F4156]">
                        {request.first_name} {request.last_name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {request.student_number}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#2F4156]">
                        {request.request_category === 'SECTION_CHANGE'
                          ? 'Section change'
                          : request.request_type === 'ADD'
                            ? 'Add course'
                            : 'Drop course'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.request_category === 'SECTION_CHANGE'
                          ? `${request.section_code} → ${request.target_section_code}`
                          : `Section ${request.section_code}`}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#2F4156]">
                        {request.course_code}
                      </p>
                      <p className="mt-0.5 max-w-[220px] truncate text-xs text-gray-500">
                        {request.course_name}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {formatDate(request.submitted_at)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openReview(request)}
                        className="rounded-lg border border-[#DCE3EA] px-3 py-2 text-xs font-semibold text-[#567CBD] transition hover:bg-[#F1F5FA]"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#172536]/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#567CBD]">
                  Request details
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#2F4156]">
                  {selectedRequest.request_category === 'SECTION_CHANGE'
                    ? 'Section change request'
                    : `${selectedRequest.request_type} course request`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={selectedRequest.status} />
                <span className="text-xs text-gray-500">
                  Submitted {formatDate(selectedRequest.submitted_at)}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                    <UserRound size={15} /> Student
                  </div>
                  <p className="font-semibold text-[#2F4156]">
                    {selectedRequest.first_name} {selectedRequest.last_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedRequest.student_number}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Year {selectedRequest.year_level ?? '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                    <BookOpen size={15} /> Course
                  </div>
                  <p className="font-semibold text-[#2F4156]">
                    {selectedRequest.course_code}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedRequest.course_name}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
                  {selectedRequest.request_category === 'SECTION_CHANGE'
                    ? <ArrowLeftRight size={15} />
                    : <CalendarDays size={15} />}
                  {selectedRequest.request_category === 'SECTION_CHANGE'
                    ? 'Section transfer'
                    : 'Requested action'}
                </div>

                {selectedRequest.request_category === 'SECTION_CHANGE' ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Current section</p>
                      <p className="mt-1 font-semibold text-[#2F4156]">
                        {selectedRequest.section_code}
                      </p>
                    </div>
                    <ArrowLeftRight className="shrink-0 text-[#567CBD]" size={20} />
                    <div className="flex-1 rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-blue-600">Target section</p>
                      <p className="mt-1 font-semibold text-[#2F4156]">
                        {selectedRequest.target_section_code}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 font-semibold text-[#2F4156]">
                    {selectedRequest.request_type === 'ADD'
                      ? 'Student requests to add this course.'
                      : 'Student requests to drop this course.'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Student's reason
                </p>
                <p className="mt-2 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {selectedRequest.reason || 'No reason provided.'}
                </p>
              </div>

              {selectedRequest.review_note && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Previous review note
                  </p>
                  <p className="mt-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                    {selectedRequest.review_note}
                  </p>
                </div>
              )}

              {['PENDING', 'UNDER_REVIEW'].includes(selectedRequest.status) && (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Review note (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Write a note for the student..."
                      className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitReview('REJECTED')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      <XCircle size={17} />
                      Reject request
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => submitReview('APPROVED')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243447] disabled:opacity-60"
                    >
                      {submitting ? (
                        <LoaderCircle size={17} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={17} />
                      )}
                      Approve request
                    </button>
                  </div>
                </>
              )}

              {!['PENDING', 'UNDER_REVIEW'].includes(selectedRequest.status) && (
                <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  This request has already been reviewed and cannot be changed here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
