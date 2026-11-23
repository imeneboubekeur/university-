
import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Clock3,
  MapPin,
  BookOpen,
  RefreshCw,
  AlertCircle,
  CalendarX2,
  GraduationCap,
} from 'lucide-react'
import api from '../../services/api'

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function normalizeDay(value) {
  if (!value) return null

  const normalized = String(value).trim().toLowerCase()

  const aliases = {
    mon: 'Monday',
    monday: 'Monday',
    tue: 'Tuesday',
    tues: 'Tuesday',
    tuesday: 'Tuesday',
    wed: 'Wednesday',
    wednesday: 'Wednesday',
    thu: 'Thursday',
    thur: 'Thursday',
    thurs: 'Thursday',
    thursday: 'Thursday',
    fri: 'Friday',
    friday: 'Friday',
    sat: 'Saturday',
    saturday: 'Saturday',
    sun: 'Sunday',
    sunday: 'Sunday',
  }

  return aliases[normalized] || null
}

function formatTime(value) {
  if (!value) return ''

  const match = String(value).match(/^(\d{1,2}):(\d{2})/)

  if (!match) return String(value)

  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function getTimeLabel(entry) {
  if (entry.startTime && entry.endTime) {
    return `${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}`
  }

  if (entry.startTime) return formatTime(entry.startTime)

  return 'Time not specified'
}

function getSemesterLabel(semester) {
  const value = String(semester || '').trim().toLowerCase()

  if (value === '1' || value === 'fall') return 'Fall'
  if (value === '2' || value === 'spring') return 'Spring'
  if (value === '3' || value === 'summer') return 'Summer'

  return semester ? `Semester ${semester}` : 'Semester not specified'
}

export default function ProfessorSchedule() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedDay, setSelectedDay] = useState('All')
  const [selectedTerm, setSelectedTerm] = useState('All')

  async function loadSchedule() {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/professor/schedule')

      setSections(response.data.sections || [])
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load your schedule.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedule()
  }, [])

  // Build timetable entries from section_meetings.
  const scheduleEntries = useMemo(() => {
    return sections.flatMap((section) => {
      const meetings = Array.isArray(section.meetings)
        ? section.meetings
        : []

      return meetings
        .map((meeting) => {
          const day = normalizeDay(meeting.day_of_week)

          if (!day) return null

          return {
            id: meeting.id,
            day,
            startTime: meeting.start_time || '',
            endTime: meeting.end_time || '',

            sectionId: section.section_id,
            termId: section.term_id,

            sectionCode: section.section_code,
            courseCode: section.course_code,
            courseName: section.course_name,

            room: meeting.room || section.room || '',
            termName: section.term_name,
            academicYear: section.academic_year,
            semester: section.semester,
            sectionStatus: section.section_status,
          }
        })
        .filter(Boolean)
    })
  }, [sections])

  // Get unique academic terms.
  const terms = useMemo(() => {
    const uniqueTerms = new Map()

    sections.forEach((section) => {
      if (!section.term_id) return

      uniqueTerms.set(
        section.term_id,
        `${section.term_name} · ${section.academic_year}`
      )
    })

    return Array.from(uniqueTerms.entries())
  }, [sections])

  // Apply search, term, and weekday filters.
  const filteredEntries = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return scheduleEntries.filter((entry) => {
      const matchesSearch = [
        entry.courseCode,
        entry.courseName,
        entry.sectionCode,
        entry.room,
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm)

      const matchesDay =
        selectedDay === 'All' || entry.day === selectedDay

      const matchesTerm =
        selectedTerm === 'All' ||
        String(entry.termId) === String(selectedTerm)

      return matchesSearch && matchesDay && matchesTerm
    })
  }, [scheduleEntries, search, selectedDay, selectedTerm])

  const daysWithClasses = DAYS.filter((day) =>
    filteredEntries.some((entry) => entry.day === day)
  )

  // Sections that have not yet received timetable meetings.
  const sectionsWithoutSchedule = sections.filter(
    (section) =>
      !Array.isArray(section.meetings) ||
      section.meetings.length === 0
  )

  const inputClass =
    'w-full rounded-xl border border-[#E2E7ED] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#567CBD]">
            Academic management
          </p>

          <h1 className="text-2xl font-bold text-[#2F4156]">
            My Teaching Schedule
          </h1>

          <p className="mt-1 text-sm text-[#8290A0]">
            View your assigned classes, teaching days, and classrooms.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSchedule}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DCE3EB] bg-white px-4 py-3 text-sm font-semibold text-[#2F4156] hover:bg-[#F8FAFC] disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center text-sm text-[#8290A0]">
          Loading your teaching schedule...
        </div>
      ) : (
        <>
          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-[#8290A0]">
                Assigned sections
                <BookOpen size={19} className="text-[#567CBD]" />
              </div>

              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {sections.length}
              </p>

              <p className="mt-1 text-xs text-[#9AA5B1]">
                Across all academic terms
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-[#8290A0]">
                Weekly sessions
                <CalendarDays size={19} className="text-[#567CBD]" />
              </div>

              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {scheduleEntries.length}
              </p>

              <p className="mt-1 text-xs text-[#9AA5B1]">
                Scheduled teaching entries
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-[#8290A0]">
                Teaching days
                <Clock3 size={19} className="text-[#567CBD]" />
              </div>

              <p className="mt-3 text-2xl font-bold text-[#2F4156]">
                {new Set(scheduleEntries.map((entry) => entry.day)).size}
              </p>

              <p className="mt-1 text-xs text-[#9AA5B1]">
                Days with scheduled classes
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#68788A]">
                  Search
                </label>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Course, section, or room..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#68788A]">
                  Academic term
                </label>

                <select
                  value={selectedTerm}
                  onChange={(event) => setSelectedTerm(event.target.value)}
                  className={inputClass}
                >
                  <option value="All">All terms</option>

                  {terms.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#68788A]">
                  Day
                </label>

                <select
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  className={inputClass}
                >
                  <option value="All">All days</option>

                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Empty states */}
          {!sections.length ? (
            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center">
              <GraduationCap
                size={36}
                className="mx-auto mb-3 text-[#9AA8B7]"
              />

              <h3 className="font-semibold text-[#2F4156]">
                No assigned sections
              </h3>

              <p className="mt-1 text-sm text-[#8290A0]">
                Your assigned teaching sections will appear here.
              </p>
            </div>
          ) : !scheduleEntries.length ? (
            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center">
              <CalendarX2
                size={36}
                className="mx-auto mb-3 text-[#9AA8B7]"
              />

              <h3 className="font-semibold text-[#2F4156]">
                No timetable entries yet
              </h3>

              <p className="mt-1 text-sm text-[#8290A0]">
                Your sections are assigned, but no weekly meetings have
                been recorded for them.
              </p>
            </div>
          ) : !filteredEntries.length ? (
            <div className="rounded-2xl border border-[#E8E5E1] bg-white p-12 text-center text-sm text-[#8290A0]">
              No classes match the selected filters.
            </div>
          ) : (
            /* Weekly timetable */
            <div className="space-y-5">
              {daysWithClasses.map((day) => {
                const dayEntries = filteredEntries
                  .filter((entry) => entry.day === day)
                  .sort((a, b) =>
                    formatTime(a.startTime).localeCompare(
                      formatTime(b.startTime)
                    )
                  )

                return (
                  <section
                    key={day}
                    className="overflow-hidden rounded-2xl border border-[#E8E5E1] bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-[#EAECEF] bg-[#F8FAFC] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F8] text-[#567CBD]">
                          <CalendarDays size={19} />
                        </div>

                        <div>
                          <h2 className="font-semibold text-[#2F4156]">
                            {day}
                          </h2>

                          <p className="text-xs text-[#8290A0]">
                            {dayEntries.length}{' '}
                            {dayEntries.length === 1 ? 'class' : 'classes'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-[#F0F1F3]">
                      {dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-32 sm:w-36">
                            <p className="font-semibold text-[#2F4156]">
                              {getTimeLabel(entry)}
                            </p>

                            <p className="mt-1 text-xs text-[#8290A0]">
                              {getSemesterLabel(entry.semester)} ·{' '}
                              {entry.academicYear}
                            </p>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-[#EAF0F8] px-2.5 py-1 text-xs font-bold text-[#567CBD]">
                                {entry.courseCode}
                              </span>

                              <span className="text-xs text-[#8290A0]">
                                Section {entry.sectionCode}
                              </span>
                            </div>

                            <h3 className="mt-2 font-semibold text-[#2F4156]">
                              {entry.courseName}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-[#68788A] sm:w-40">
                            <MapPin
                              size={17}
                              className="shrink-0 text-[#567CBD]"
                            />
                            {entry.room || 'Room not assigned'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {/* Sections without meetings */}
          {sectionsWithoutSchedule.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-semibold text-amber-900">
                Sections without a timetable
              </h3>

              <p className="mt-1 text-sm text-amber-800">
                These assigned sections do not currently have schedule
                meetings.
              </p>

              <ul className="mt-3 space-y-2">
                {sectionsWithoutSchedule.map((section) => (
                  <li
                    key={section.section_id}
                    className="text-sm text-amber-900"
                  >
                    <strong>{section.course_code}</strong> —{' '}
                    {section.course_name}, Section {section.section_code}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
