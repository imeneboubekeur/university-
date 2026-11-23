
import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Search,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import api from '../../services/api'

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const number = Number(value)

  if (!Number.isFinite(number)) return '—'

  return number.toLocaleString('en-US', {
    maximumFractionDigits,
  })
}

function getAssessmentType(type) {
  if (!type) return 'Assessment'

  return String(type)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getScorePercentage(score, maxScore) {
  const numericScore = Number(score)
  const numericMax = Number(maxScore)

  if (
    score === null ||
    score === undefined ||
    maxScore === null ||
    maxScore === undefined ||
    !Number.isFinite(numericScore) ||
    !Number.isFinite(numericMax) ||
    numericMax <= 0
  ) {
    return null
  }

  return (numericScore / numericMax) * 100
}

function getScoreColor(percentage) {
  if (percentage === null) return 'text-gray-500'
  if (percentage >= 85) return 'text-green-600'
  if (percentage >= 70) return 'text-blue-600'
  if (percentage >= 50) return 'text-amber-600'

  return 'text-red-600'
}

function AssessmentRow({ assessment }) {
  const percentage = getScorePercentage(
    assessment.score,
    assessment.maxScore
  )

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-600">
          <FileText size={18} />
        </div>

        <div className="min-w-0">
          <p className="font-medium text-gray-900">
            {assessment.name || 'Assessment'}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>
              {getAssessmentType(assessment.type)}
            </span>

            {assessment.percentage !== null &&
              assessment.percentage !== undefined && (
                <>
                  <span>•</span>
                  <span>
                    {formatNumber(assessment.percentage)}% of course
                  </span>
                </>
              )}

            {assessment.publishedAt && (
              <>
                <span>•</span>
                <span>
                  Published {formatDate(assessment.publishedAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-right">
          <p className={`text-lg font-semibold ${getScoreColor(percentage)}`}>
            {assessment.score === null ||
            assessment.score === undefined
              ? '—'
              : formatNumber(assessment.score)}
            <span className="text-sm font-normal text-gray-400">
              {assessment.maxScore !== null &&
              assessment.maxScore !== undefined
                ? ` / ${formatNumber(assessment.maxScore)}`
                : ''}
            </span>
          </p>

          {percentage !== null && (
            <p className="text-xs text-gray-500">
              {formatNumber(percentage)}%
            </p>
          )}

          {assessment.letterGrade && (
            <p className="mt-1 text-xs font-semibold text-gray-700">
              Grade: {assessment.letterGrade}
            </p>
          )}
        </div>

        <CheckCircle2
          size={18}
          className="shrink-0 text-green-500"
        />
      </div>
    </div>
  )
}

function CourseCard({ course }) {
  const assessments = course.assessments || []

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5a4545]/10 text-[#5a4545]">
            <BookOpen size={22} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                {course.courseCode}
              </span>

              {course.sectionCode && (
                <span className="text-xs text-gray-500">
                  Section {course.sectionCode}
                </span>
              )}
            </div>

            <h3 className="mt-2 text-base font-semibold text-gray-900">
              {course.courseName}
            </h3>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
              {course.credits !== null &&
                course.credits !== undefined && (
                  <span>{course.credits} credits</span>
                )}

              {course.ects !== null &&
                course.ects !== undefined && (
                  <span>{course.ects} ECTS</span>
                )}
            </div>
          </div>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-2xl font-semibold text-gray-900">
            {assessments.length}
          </p>
          <p className="text-xs text-gray-500">
            Published {assessments.length === 1 ? 'grade' : 'grades'}
          </p>
        </div>
      </div>

      <div className="px-5 pb-2">
        {assessments.length > 0 ? (
          <>
            <div className="flex items-center justify-between border-t border-gray-100 py-3">
              <h4 className="text-sm font-semibold text-gray-800">
                Assessment results
              </h4>

              <span className="text-xs text-gray-500">
                Published results only
              </span>
            </div>

            {assessments.map((assessment) => (
              <AssessmentRow
                key={assessment.id}
                assessment={assessment}
              />
            ))}
          </>
        ) : (
          <div className="flex items-start gap-3 border-t border-gray-100 py-5">
            <Clock3
              size={19}
              className="mt-0.5 shrink-0 text-amber-500"
            />

            <div>
              <p className="text-sm font-medium text-gray-800">
                No published grades yet
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Your course is registered, but no assessment results
                have been published yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentGrades() {
  const [data, setData] = useState({
    term: null,
    courses: [],
    totalCourses: 0,
    totalPublishedGrades: 0,
  })

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchGrades() {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/student/grades/current-term')

      setData({
        term: response.data.term || null,
        courses: response.data.courses || [],
        totalCourses: response.data.totalCourses || 0,
        totalPublishedGrades: response.data.totalPublishedGrades || 0,
      })
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load your grades. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGrades()
  }, [])

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) return data.courses

    return data.courses.filter((course) => {
      return (
        course.courseCode?.toLowerCase().includes(normalizedSearch) ||
        course.courseName?.toLowerCase().includes(normalizedSearch) ||
        course.sectionCode?.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [data.courses, search])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw
            size={28}
            className="mx-auto animate-spin text-[#5a4545]"
          />
          <p className="mt-3 text-sm text-gray-500">
            Loading your grades...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 text-red-600" size={22} />

          <div className="flex-1">
            <h2 className="font-semibold text-red-800">
              Could not load grades
            </h2>
            <p className="mt-1 text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={fetchGrades}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <GraduationCap size={17} />
            <span>Student Portal</span>
            <span>/</span>
            <span className="text-gray-700">My Grades</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            My Grades
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View your published assessment results for the current term.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchGrades}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Active term */}
      <div className="rounded-2xl bg-[#5a4545] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <CalendarDays size={17} />
              Active Academic Term
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              {data.term?.name || 'No active academic term'}
            </h2>

            {data.term && (
              <p className="mt-1 text-sm text-white/70">
                {data.term.academic_year}
                {data.term.semester
                  ? ` • Semester ${data.term.semester}`
                  : ''}
              </p>
            )}
          </div>

          {data.term && (
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-xs text-white/70">Academic period</p>
              <p className="mt-1 text-sm font-medium">
                {formatDate(data.term.start_date)}
                {' – '}
                {formatDate(data.term.end_date)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <BookOpen size={21} />
            </div>
            <span className="text-xs text-gray-400">Current term</span>
          </div>

          <p className="mt-4 text-2xl font-bold text-gray-900">
            {data.totalCourses}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Enrolled courses
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <Award size={21} />
            </div>
            <span className="text-xs text-gray-400">Available results</span>
          </div>

          <p className="mt-4 text-2xl font-bold text-gray-900">
            {data.totalPublishedGrades}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Published assessment grades
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <TrendingUp size={21} />
            </div>
            <span className="text-xs text-gray-400">Visibility</span>
          </div>

          <p className="mt-4 text-2xl font-bold text-gray-900">
            Published
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Only officially published results
          </p>
        </div>
      </div>

      {/* Course list */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Course results
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Your grades are organized by enrolled course.
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#5a4545] focus:ring-2 focus:ring-[#5a4545]/10"
            />
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.courseId}
                course={course}
              />
            ))}
          </div>
        ) : data.courses.length > 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
            <Search size={30} className="mx-auto text-gray-300" />
            <h3 className="mt-3 font-semibold text-gray-800">
              No courses found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try another course name or code.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center">
            <BookOpen size={36} className="mx-auto text-gray-300" />

            <h3 className="mt-4 font-semibold text-gray-900">
              {data.term
                ? 'No enrolled courses for this term'
                : 'No active academic term'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              {data.term
                ? 'Your enrolled courses and their published grades will appear here.'
                : 'There is currently no active academic term. Please check again later.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
