
import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Send,
  X,
  XCircle,
} from 'lucide-react'
import api from '../../services/api'

const statusStyles = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  UNDER_REVIEW: 'border-blue-200 bg-blue-50 text-blue-700',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
  CANCELLED: 'border-gray-200 bg-gray-100 text-gray-600',
}

const statusLabels = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        statusStyles[status] || statusStyles.CANCELLED
      }`}
    >
      {statusLabels[status] || status}
    </span>
  )
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#718096]">{label}</p>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon size={19} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-[#2F4156]">{value}</p>
    </div>
  )
}

export default function SectionChangeRequests() {
  const [options, setOptions] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)

  const [enrollmentId, setEnrollmentId] = useState('')
  const [targetSectionId, setTargetSectionId] = useState('')
  const [reason, setReason] = useState('')
  const [filter, setFilter] = useState('ALL')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [optionsResponse, requestsResponse] = await Promise.all([
        api.get('/student/section-changes/options'),
        api.get('/student/section-changes'),
      ])

      setOptions(optionsResponse.data.options || [])
      setRequests(requestsResponse.data.requests || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load section-change information.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedOptions = options.filter(
    (option) => option.enrollment_id === enrollmentId
  )

  const pendingCount = requests.filter(
    (request) => request.status === 'PENDING'
  ).length

  const approvedCount = requests.filter(
    (request) => request.status === 'APPROVED'
  ).length

  const filteredRequests =
    filter === 'ALL'
      ? requests
      : requests.filter((request) => request.status === filter)

  function handleEnrollmentChange(value) {
    setEnrollmentId(value)
    setTargetSectionId('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!enrollmentId || !targetSectionId) {
      setError('Please select your current course and a target section.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const response = await api.post('/student/section-changes', {
        enrollmentId,
        targetSectionId,
        reason,
      })

      setSuccess(
        response.data.message || 'Section-change request submitted.'
      )

      setEnrollmentId('')
      setTargetSectionId('')
      setReason('')

      await loadData()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to submit your section-change request.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(requestId) {
    if (!window.confirm('Cancel this section-change request?')) return

    try {
      setCancellingId(requestId)
      setError('')
      setSuccess('')

      const response = await api.patch(
        `/student/section-changes/${requestId}/cancel`
      )

      setSuccess(
        response.data.message || 'Request cancelled successfully.'
      )

      await loadData()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to cancel this request.'
      )
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#718096]">
            <span>Student</span>
            <span>/</span>
            <span>Academic</span>
            <span>/</span>
            <span className="font-medium text-[#567CBD]">
              Section Change
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156] md:text-3xl">
            Section Change Requests
          </h1>

          <p className="mt-2 text-sm text-[#718096]">
            Request to move from your current course section to another
            available section.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE3EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] hover:bg-[#F5EFEB] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <p>{success}</p>
          <button
            type="button"
            onClick={() => setSuccess('')}
            className="ml-auto"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Requests"
          value={requests.length}
          icon={FileText}
          color="bg-blue-50 text-[#567CBD]"
        />
        <SummaryCard
          label="Pending Requests"
          value={pendingCount}
          icon={Clock3}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          label="Approved Requests"
          value={approvedCount}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Request form */}
      <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-3 text-[#567CBD]">
            <ArrowLeftRight size={21} />
          </div>
          <div>
            <h2 className="font-bold text-[#2F4156]">
              New Section Change Request
            </h2>
            <p className="mt-1 text-sm text-[#718096]">
              Select an enrolled course, then choose another section of the
              same course.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-[#718096]">
            <LoaderCircle size={19} className="animate-spin" />
            Loading available sections...
          </div>
        ) : options.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DCE3EA] bg-[#FCFBFA] p-6 text-center">
            <CalendarDays className="mx-auto mb-3 text-[#718096]" size={27} />
            <h3 className="font-semibold text-[#2F4156]">
              No section changes available
            </h3>
            <p className="mx-auto mt-1 max-w-lg text-sm text-[#718096]">
              You currently have no eligible alternative sections. This can
              happen when the section-change period is closed or no other
              sections are open for your enrolled courses.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="current-course"
                className="mb-2 block text-sm font-semibold text-[#2F4156]"
              >
                Current course and section
              </label>

              <select
                id="current-course"
                value={enrollmentId}
                onChange={(event) =>
                  handleEnrollmentChange(event.target.value)
                }
                className="w-full rounded-xl border border-[#DCE3EA] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
              >
                <option value="">Choose your current enrollment</option>
                {Array.from(
                  new Map(
                    options.map((option) => [
                      option.enrollment_id,
                      option,
                    ])
                  ).values()
                ).map((option) => (
                  <option
                    key={option.enrollment_id}
                    value={option.enrollment_id}
                  >
                    {option.course_code} — {option.course_name}
                    {' · Section '}
                    {option.current_section_code}
                  </option>
                ))}
              </select>
            </div>

            {enrollmentId && (
              <div>
                <label
                  htmlFor="target-section"
                  className="mb-2 block text-sm font-semibold text-[#2F4156]"
                >
                  New section
                </label>

                <select
                  id="target-section"
                  value={targetSectionId}
                  onChange={(event) =>
                    setTargetSectionId(event.target.value)
                  }
                  className="w-full rounded-xl border border-[#DCE3EA] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
                >
                  <option value="">Choose another section</option>
                  {selectedOptions.map((option) => {
                    const remaining = Math.max(
                      0,
                      Math.min(
                        option.capacity - option.enrolled_count,
                        option.department_quota -
                          option.department_enrolled_count
                      )
                    )

                    return (
                      <option
                        key={option.target_section_id}
                        value={option.target_section_id}
                        disabled={remaining <= 0}
                      >
                        Section {option.target_section_code}
                        {' · '}
                        {remaining} seat(s) available
                        {option.target_room
                          ? ` · ${option.target_room}`
                          : ''}
                      </option>
                    )
                  })}
                </select>

                {selectedOptions.length === 0 && (
                  <p className="mt-2 text-xs text-[#718096]">
                    No alternative sections are available for this course.
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="section-reason"
                className="mb-2 block text-sm font-semibold text-[#2F4156]"
              >
                Reason
                <span className="ml-1 font-normal text-[#718096]">
                  (optional)
                </span>
              </label>

              <textarea
                id="section-reason"
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why you would like to change sections..."
                className="w-full resize-y rounded-xl border border-[#DCE3EA] px-4 py-3 text-sm text-[#2F4156] outline-none placeholder:text-[#A0AEC0] focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
              />
            </div>

            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-xs text-[#718096]">
                Your current enrollment will remain unchanged until approval.
              </p>

              <button
                type="submit"
                disabled={submitting || !enrollmentId || !targetSectionId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#567CBD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#456AA8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Submit Request
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Request history */}
      <section className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="border-b border-[#E7E3DF] p-5 md:p-6">
          <h2 className="font-bold text-[#2F4156]">
            Section Change History
          </h2>
          <p className="mt-1 text-sm text-[#718096]">
            Track the status and reviewer feedback for your requests.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[#E7E3DF] px-5 py-3 md:px-6">
          {[
            ['ALL', 'All'],
            ['PENDING', 'Pending'],
            ['UNDER_REVIEW', 'Under Review'],
            ['APPROVED', 'Approved'],
            ['REJECTED', 'Rejected'],
            ['CANCELLED', 'Cancelled'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                filter === value
                  ? 'bg-[#2F4156] text-white'
                  : 'bg-[#F5EFEB] text-[#718096] hover:bg-[#EAE3DD]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#718096]">
            <LoaderCircle size={20} className="animate-spin" />
            Loading requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
            <FileText size={28} className="mb-3 text-[#8A9AAF]" />
            <h3 className="font-semibold text-[#2F4156]">
              No requests found
            </h3>
            <p className="mt-1 text-sm text-[#718096]">
              Your section-change requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7E3DF]">
            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className="space-y-4 p-5 hover:bg-[#FCFBFA] md:p-6"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={request.status} />
                      <span className="text-xs text-[#718096]">
                        {request.term_name}
                      </span>
                    </div>

                    <h3 className="font-bold text-[#2F4156]">
                      {request.course_code} — {request.course_name}
                    </h3>

                    <p className="mt-1 text-sm text-[#718096]">
                      Section {request.current_section_code}
                      {' → '}
                      <span className="font-semibold text-[#567CBD]">
                        Section {request.target_section_code}
                      </span>
                    </p>
                  </div>

                  {request.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(request.id)}
                      disabled={cancellingId === request.id}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingId === request.id ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={14} />
                      )}
                      Cancel request
                    </button>
                  )}
                </div>

                {request.reason && (
                  <div className="rounded-xl bg-[#F8F7F5] p-3">
                    <p className="mb-1 text-xs font-semibold text-[#718096]">
                      Your reason
                    </p>
                    <p className="text-sm text-[#2F4156]">
                      {request.reason}
                    </p>
                  </div>
                )}

                {request.review_note && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-700">
                      <MessageSquare size={14} />
                      Reviewer feedback
                    </div>
                    <p className="text-sm text-[#2F4156]">
                      {request.review_note}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#718096]">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    Submitted: {formatDate(request.submitted_at)}
                  </span>

                  {request.reviewed_at && (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Reviewed: {formatDate(request.reviewed_at)}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
