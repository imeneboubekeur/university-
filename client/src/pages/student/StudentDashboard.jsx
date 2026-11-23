
import { useCallback, useEffect, useState } from 'react'

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Mail,
  RefreshCw,
  School,
  UserRound,
  Hash,
  Building2,
  CheckCircle2,
  FileText,
} from 'lucide-react'

import api from '../../services/api'

const statusStyles = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  SUSPENDED: 'bg-red-50 text-red-700 border-red-200',
  GRADUATED: 'bg-blue-50 text-blue-700 border-blue-200',
  WITHDRAWN: 'bg-gray-100 text-gray-600 border-gray-200',
}

function InfoCard({ icon: Icon, label, value, description }) {
  const displayValue =
    value !== null && value !== undefined && value !== ''
      ? value
      : 'Not available'

  return (
    <div className="rounded-2xl border border-[#E8E2DE] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#CBD9E6]/50 text-[#2F4156]">
          <Icon size={21} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </p>

          <p className="mt-2 break-words text-base font-semibold text-[#2F4156]">
            {displayValue}
          </p>

          {description && (
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function getInitials(firstName, lastName) {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
}

function formatDate(date) {
  if (!date) return 'Not available'

  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function StudentDashboard() {
  const [student, setStudent] = useState(null)
  const [stats, setStats] = useState(null)
  const [currentTerm, setCurrentTerm] = useState(null)
  const [latestTranscript, setLatestTranscript] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/student/dashboard')

      setStudent(response.data.student)
      setStats(response.data.stats || null)
      setCurrentTerm(response.data.currentTerm || null)
      setLatestTranscript(response.data.latestTranscript || null)
    } catch (err) {
      console.error('Student dashboard error:', err)

      setError(
        err.response?.data?.message ||
          'Unable to load your student information. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#CBD9E6] border-t-[#2F4156]" />

          <p className="mt-4 text-sm text-gray-500">
            Loading your dashboard...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle size={26} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-[#2F4156]">
            Unable to load dashboard
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {error}
          </p>

          <button
            onClick={fetchDashboard}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#567CBD]"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="rounded-2xl border border-[#E8E2DE] bg-white p-8 text-center">
        <UserRound className="mx-auto text-gray-400" size={32} />

        <h2 className="mt-3 font-semibold text-[#2F4156]">
          Student profile not found
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Your account does not currently have an associated student profile.
        </p>
      </div>
    )
  }

  const fullName =
    `${student.first_name || ''} ${student.last_name || ''}`.trim()

  const initials = getInitials(
    student.first_name,
    student.last_name
  )

  const status = student.status || 'UNKNOWN'

  const gpa =
    stats?.gpa !== null && stats?.gpa !== undefined
      ? Number(stats.gpa).toFixed(2)
      : 'No issued transcript'

  return (
    <div className="space-y-7">

      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-[#567CBD]">
            Academic Management Platform
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#2F4156] md:text-3xl">
            Student Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Welcome back, {student.first_name}. Here is your academic profile.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#DCE3E9] bg-white px-4 py-2.5 text-sm font-medium text-[#2F4156] shadow-sm transition hover:bg-[#F5EFEB]"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Welcome card */}
      <section className="overflow-hidden rounded-2xl bg-[#2F4156] p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white">
              {student.image_url ? (
                <img
                  src={student.image_url}
                  alt={fullName}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                initials || <UserRound size={28} />
              )}
            </div>

            <div>
              <p className="text-sm text-[#CBD9E6]">
                Welcome back
              </p>

              <h2 className="mt-1 text-xl font-bold md:text-2xl">
                {fullName || 'Student'}
              </h2>

              <p className="mt-1 text-sm text-[#CBD9E6]">
                Student account
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#CBD9E6]">
              Student status
            </p>

            <div className="mt-2 flex items-center gap-2">
              <CheckCircle2 size={17} />

              <span className="text-sm font-semibold">
                {status.replaceAll('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Overview */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#2F4156]">
            Academic Overview
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your academic progress based on university records.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            icon={GraduationCap}
            label="Cumulative GPA"
            value={gpa}
            description="From your latest issued transcript"
          />

          <InfoCard
            icon={BookOpen}
            label="Completed credits"
            value={stats?.completedCredits ?? 0}
            description="Credits from your latest issued transcript"
          />

          <InfoCard
            icon={CalendarDays}
            label="Current enrollments"
            value={stats?.enrolledCourses ?? 0}
            description="Courses in the active academic term"
          />

          <InfoCard
            icon={BookOpen}
            label="Enrolled credits"
            value={stats?.enrolledCredits ?? 0}
            description="Credits from current enrollments"
          />

          <InfoCard
            icon={CheckCircle2}
            label="Published grades"
            value={stats?.coursesWithPublishedGrades ?? 0}
            description="Current-term courses with published grades"
          />

          <InfoCard
            icon={CalendarDays}
            label="Pending requests"
            value={stats?.pendingRequests ?? 0}
            description="Requests awaiting review"
          />
        </div>
      </section>

      {/* Current Academic Term */}
      <section className="rounded-2xl border border-[#E8E2DE] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#CBD9E6]/50 text-[#2F4156]">
            <CalendarDays size={21} />
          </div>

          <div>
            <h2 className="font-bold text-[#2F4156]">
              Current Academic Term
            </h2>

            <p className="text-sm text-gray-500">
              Academic calendar information
            </p>
          </div>
        </div>

        {currentTerm ? (
          <>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Term
                </p>

                <p className="mt-2 font-semibold text-[#2F4156]">
                  {currentTerm.name || 'Not available'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Academic year
                </p>

                <p className="mt-2 font-semibold text-[#2F4156]">
                  {currentTerm.academic_year || 'Not available'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Semester
                </p>

                <p className="mt-2 font-semibold text-[#2F4156]">
                  {currentTerm.semester || 'Not available'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Term dates
                </p>

                <p className="mt-2 text-sm font-semibold text-[#2F4156]">
                  {formatDate(currentTerm.start_date)}
                  {' – '}
                  {formatDate(currentTerm.end_date)}
                </p>
              </div>
            </div>

            {/* Registration window */}
            <div className="mt-6 border-t border-gray-100 pt-5">
              <h3 className="text-sm font-bold text-[#2F4156]">
                Registration Window
              </h3>

              {currentTerm.registration_window_id ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">
                      Registration opens
                    </p>

                    <p className="mt-1 text-sm font-medium text-[#2F4156]">
                      {formatDate(currentTerm.registration_opens_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Registration closes
                    </p>

                    <p className="mt-1 text-sm font-medium text-[#2F4156]">
                      {formatDate(currentTerm.registration_closes_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  No active registration window is configured for this term.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="mt-5 rounded-xl bg-[#F5EFEB] p-4 text-sm text-gray-500">
            There is currently no active academic term.
          </p>
        )}
      </section>

      {/* Personal Information */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <UserRound size={19} className="text-[#567CBD]" />

          <h2 className="text-lg font-bold text-[#2F4156]">
            Personal Information
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            icon={UserRound}
            label="Full name"
            value={fullName}
            description="Your registered name"
          />

          <InfoCard
            icon={Mail}
            label="Email address"
            value={student.email}
            description="Your university account email"
          />

          <InfoCard
            icon={Hash}
            label="Student number"
            value={student.student_number}
            description="Your student identification number"
          />
        </div>
      </section>

      {/* Academic Information */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <GraduationCap size={20} className="text-[#567CBD]" />

          <h2 className="text-lg font-bold text-[#2F4156]">
            Academic Information
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            icon={School}
            label="Faculty"
            value={student.faculty_name}
            description={student.faculty_code || 'Faculty'}
          />

          <InfoCard
            icon={Building2}
            label="Department"
            value={student.department_name}
            description={student.department_code || 'Department'}
          />

          <InfoCard
            icon={CalendarDays}
            label="Enrollment year"
            value={student.enrollment_year}
            description="Year of university admission"
          />

          <InfoCard
            icon={BookOpen}
            label="Year level"
            value={
              student.year_level
                ? `Year ${student.year_level}`
                : 'Not available'
            }
            description="Your current academic year"
          />

          <InfoCard
            icon={CheckCircle2}
            label="Student status"
            value={status.replaceAll('_', ' ')}
            description="Current registration status"
          />

          <InfoCard
            icon={GraduationCap}
            label="Academic department"
            value={student.department_code}
            description="Department identification code"
          />
        </div>
      </section>

      {/* Profile Summary */}
      <section className="rounded-2xl border border-[#E8E2DE] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Profile Summary
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your current university registration information.
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#CBD9E6]/50 text-[#2F4156]">
            <GraduationCap size={22} />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3">
            <span className="text-sm text-gray-500">
              Student ID
            </span>

            <span className="break-all text-right text-sm font-semibold text-[#2F4156]">
              {student.student_id}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3">
            <span className="text-sm text-gray-500">
              Faculty code
            </span>

            <span className="text-sm font-semibold text-[#2F4156]">
              {student.faculty_code || '—'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3">
            <span className="text-sm text-gray-500">
              Department code
            </span>

            <span className="text-sm font-semibold text-[#2F4156]">
              {student.department_code || '—'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3">
            <span className="text-sm text-gray-500">
              Account status
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                statusStyles[status] ||
                'border-gray-200 bg-gray-50 text-gray-600'
              }`}
            >
              {status.replaceAll('_', ' ')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-gray-500">
              Latest transcript
            </span>

            <span className="flex items-center gap-2 text-sm font-semibold text-[#2F4156]">
              <FileText size={16} />
              {latestTranscript?.transcript_number || 'Not issued'}
            </span>
          </div>
        </div>
      </section>

    </div>
  )
}
