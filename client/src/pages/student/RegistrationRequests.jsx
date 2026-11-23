
import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  BookOpen,
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
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        statusStyles[status] || statusStyles.CANCELLED
      }`}
    >
      {statusLabels[status] || status}
    </span>
  )
}

function RequestTypeBadge({ type }) {
  const isAdd = type === 'ADD'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isAdd
          ? 'bg-blue-50 text-blue-700'
          : 'bg-orange-50 text-orange-700'
      }`}
    >
      {isAdd ? (
        <BookOpen size={13} />
      ) : (
        <ArrowDownToLine size={13} />
      )}
      {isAdd ? 'Add course' : 'Drop course'}
    </span>
  )
}

function SummaryCard({ icon: Icon, label, value, color }) {
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

export default function RegistrationRequests() {
  const [requests, setRequests] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState('')
  const [reason, setReason] = useState('')
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [requestsResponse, coursesResponse] = await Promise.all([
        api.get('/student/registration-requests'),
        api.get('/student/courses/my-courses'),
      ])

      setRequests(requestsResponse.data.requests || [])
      setCourses(coursesResponse.data.courses || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load your registration requests.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const enrolledCourses = courses.filter(
    (course) => course.status === 'ENROLLED'
  )

  const pendingCount = requests.filter(
    (request) => request.status === 'PENDING'
  ).length

  const approvedCount = requests.filter(
    (request) => request.status === 'APPROVED'
  ).length

  const filteredRequests =
    activeFilter === 'ALL'
      ? requests
      : requests.filter((request) => request.status === activeFilter)

  async function handleDropRequest(event) {
    event.preventDefault()

    if (!selectedEnrollment) {
      setError('Please select a course.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      const response = await api.post(
        '/student/registration-requests/drop',
        {
          enrollmentId: selectedEnrollment,
          reason,
        }
      )

      setSuccess(
        response.data.message || 'Drop request submitted successfully.'
      )

      setSelectedEnrollment('')
      setReason('')
      await loadData()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to submit your drop request.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(requestId) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this request?'
    )

    if (!confirmed) return

    try {
      setCancellingId(requestId)
      setError('')
      setSuccess('')

      const response = await api.patch(
        `/student/registration-requests/${requestId}/cancel`
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
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#718096]">
            <span>Student</span>
            <span>/</span>
            <span>Academic</span>
            <span>/</span>
            <span className="font-medium text-[#567CBD]">
              Add/Drop Requests
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156] md:text-3xl">
            Add/Drop Requests
          </h1>

          <p className="mt-2 text-sm text-[#718096]">
            Submit course changes and track the status of your requests.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE3EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] transition hover:bg-[#F5EFEB] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
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

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          icon={FileText}
          label="Total Requests"
          value={requests.length}
          color="bg-blue-50 text-[#567CBD]"
        />
        <SummaryCard
          icon={Clock3}
          label="Pending Requests"
          value={pendingCount}
          color="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Approved Requests"
          value={approvedCount}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Drop course form */}
      <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
            <ArrowDownToLine size={21} />
          </div>
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Request to Drop a Course
            </h2>
            <p className="mt-1 text-sm text-[#718096]">
              Choose one of your currently enrolled courses and submit your
              reason.
            </p>
          </div>
        </div>

        <form onSubmit={handleDropRequest} className="space-y-4">
          <div>
            <label
              htmlFor="enrollment"
              className="mb-2 block text-sm font-semibold text-[#2F4156]"
            >
              Select course
            </label>

            <select
              id="enrollment"
              value={selectedEnrollment}
              onChange={(event) => setSelectedEnrollment(event.target.value)}
              className="w-full rounded-xl border border-[#DCE3EA] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none transition focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
            >
              <option value="">Choose an enrolled course</option>
              {enrolledCourses.map((course) => (
                <option
                  key={course.enrollment_id || course.id}
                  value={course.enrollment_id || course.id}
                >
                  {course.course_code} — {course.course_name}
                  {course.section_code
                    ? ` (Section ${course.section_code})`
                    : ''}
                </option>
              ))}
            </select>

            {enrolledCourses.length === 0 && !loading && (
              <p className="mt-2 text-xs text-[#718096]">
                You currently have no enrolled courses available to drop.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="drop-reason"
              className="mb-2 block text-sm font-semibold text-[#2F4156]"
            >
              Reason for dropping
              <span className="ml-1 font-normal text-[#718096]">
                (optional)
              </span>
            </label>

            <textarea
              id="drop-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              placeholder="Explain why you want to drop this course..."
              className="w-full resize-y rounded-xl border border-[#DCE3EA] px-4 py-3 text-sm text-[#2F4156] outline-none transition placeholder:text-[#A0AEC0] focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
            />
          </div>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-[#718096]">
              Your enrollment will not change until your request is approved.
            </p>

            <button
              type="submit"
              disabled={submitting || !selectedEnrollment}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#567CBD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#456AA8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Submit Drop Request
            </button>
          </div>
        </form>
      </section>

      {/* Request history */}
      <section className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
        <div className="border-b border-[#E7E3DF] p-5 md:p-6">
          <h2 className="font-bold text-[#2F4156]">Request History</h2>
          <p className="mt-1 text-sm text-[#718096]">
            Review the status and feedback for your course requests.
          </p>
        </div>

        {/* Filters */}
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
              onClick={() => setActiveFilter(value)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                activeFilter === value
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
            Loading your requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 rounded-2xl bg-[#F5EFEB] p-4 text-[#567CBD]">
              <FileText size={27} />
            </div>
            <h3 className="font-semibold text-[#2F4156]">
              No requests found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-[#718096]">
              {activeFilter === 'ALL'
                ? 'Your submitted course requests will appear here.'
                : `You do not have any ${statusLabels[activeFilter]?.toLowerCase()} requests.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E7E3DF]">
            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className="space-y-4 p-5 transition hover:bg-[#FCFBFA] md:p-6"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <RequestTypeBadge type={request.type} />
                      <StatusBadge status={request.status} />
                    </div>

                    <h3 className="font-bold text-[#2F4156]">
                      {request.course_code} — {request.course_name}
                    </h3>

                    <p className="mt-1 text-sm text-[#718096]">
                      Section {request.section_code || '—'}
                      {request.credits != null
                        ? ` · ${request.credits} credits`
                        : ''}
                    </p>
                  </div>

                  {request.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(request.id)}
                      disabled={cancellingId === request.id}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#718096]">
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
