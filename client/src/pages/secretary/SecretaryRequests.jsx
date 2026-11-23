
import { useCallback, useEffect, useState } from 'react'
import {
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  ArrowLeftRight,
  ClipboardList,
  X,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL

const statusStyles = {
  PENDING: 'bg-amber-50 text-amber-700',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export default function SecretaryRequests() {
  const [requests, setRequests] = useState([])
  const [status, setStatus] = useState('PENDING')
  const [type, setType] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [decision, setDecision] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ status, type })
      const response = await fetch(
        `${API_URL}/secretary/requests?${params.toString()}`,
        { credentials: 'include' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load requests.')
      }

      setRequests(data.requests || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status, type])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  async function submitReview() {
    if (!selected || !decision) return

    setSaving(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/secretary/requests/${selected.request_type}/${selected.id}/review`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, reviewNote }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to process this request.')
      }

      setSelected(null)
      setDecision('')
      setReviewNote('')
      await fetchRequests()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredRequests = requests.filter((request) => {
    const fullName = `${request.first_name} ${request.last_name}`.toLowerCase()
    const term = search.toLowerCase()

    return (
      fullName.includes(term) ||
      request.student_number?.toLowerCase().includes(term) ||
      request.course_code?.toLowerCase().includes(term) ||
      request.course_name?.toLowerCase().includes(term)
    )
  })

  const pendingCount = requests.filter(
    (request) => request.request_status === 'PENDING'
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            Secretary workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#2F4156]">
            Student Requests
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review course registration and section-change requests.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Displayed requests</p>
            <ClipboardList className="text-[#567CBD]" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {requests.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Pending requests</p>
            <Clock3 className="text-amber-500" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Matching requests</p>
            <Search className="text-[#567CBD]" size={20} />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#2F4156]">
            {filteredRequests.length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_190px_190px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, number, or course..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#567CBD]"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
          >
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ALL">All statuses</option>
          </select>

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#567CBD]"
          >
            <option value="ALL">All request types</option>
            <option value="REGISTRATION">Add / Drop</option>
            <option value="SECTION_CHANGE">Section change</option>
          </select>
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
                <th className="px-3 py-3 font-semibold">Course</th>
                <th className="px-3 py-3 font-semibold">Request</th>
                <th className="px-3 py-3 font-semibold">Submitted</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-12 text-center text-sm text-gray-500">
                    Loading requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-12 text-center text-sm text-gray-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={`${request.request_type}-${request.id}`} className="hover:bg-gray-50/70">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-[#2F4156]">
                        {request.first_name} {request.last_name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.student_number}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <p className="font-medium text-[#2F4156]">
                        {request.course_code}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.course_name}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <span className="inline-flex rounded-lg bg-[#CBD9E6]/40 px-2.5 py-1 text-xs font-semibold text-[#2F4156]">
                        {request.request_type === 'SECTION_CHANGE'
                          ? 'Section change'
                          : request.action_type}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        {request.section_code}
                        {request.target_section_code
                          ? ` → ${request.target_section_code}`
                          : ''}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-sm text-gray-600">
                      {request.submitted_at
                        ? new Date(request.submitted_at).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="px-3 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[request.request_status] || 'bg-gray-100 text-gray-600'}`}>
                        {request.request_status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-3 py-4 text-right">
                      <button
                        onClick={() => setSelected(request)}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[#2F4156] hover:border-[#567CBD] hover:bg-[#CBD9E6]/30"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#567CBD]">
                  Request review
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#2F4156]">
                  {selected.request_type === 'SECTION_CHANGE'
                    ? 'Section Change Request'
                    : `${selected.action_type} Request`}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close review"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#F5EFEB] p-3">
                  <p className="text-xs text-gray-500">Student</p>
                  <p className="mt-1 font-semibold text-[#2F4156]">
                    {selected.first_name} {selected.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selected.student_number}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5EFEB] p-3">
                  <p className="text-xs text-gray-500">Course</p>
                  <p className="mt-1 font-semibold text-[#2F4156]">
                    {selected.course_code}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selected.course_name}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Section
                </p>
                <p className="mt-1 text-sm text-[#2F4156]">
                  {selected.section_code}
                  {selected.target_section_code
                    ? ` → ${selected.target_section_code}`
                    : ''}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Student's reason
                </p>
                <p className="mt-1 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                  {selected.reason || 'No reason provided.'}
                </p>
              </div>

              {selected.review_note && (
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Previous review note
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {selected.review_note}
                  </p>
                </div>
              )}

              {['PENDING', 'UNDER_REVIEW'].includes(selected.request_status) ? (
                <>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                      Secretary note
                    </label>
                    <textarea
                      rows="3"
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      placeholder="Add a note for this decision..."
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#567CBD]"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={() => {
                        setDecision('REJECTED')
                        setTimeout(submitReview, 0)
                      }}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={16} /> Reject
                    </button>

                    <button
                      onClick={() => {
                        setDecision('APPROVED')
                        setTimeout(submitReview, 0)
                      }}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#243548] disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                  This request has already been processed.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
