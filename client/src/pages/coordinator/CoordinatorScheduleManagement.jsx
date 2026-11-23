
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import api from '../../services/api'

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

const DAY_LABELS = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
}

const EMPTY_FORM = {
  section_id: '',
  day_of_week: 'MONDAY',
  start_time: '09:00',
  end_time: '10:30',
  room: '',
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

function getErrorDetails(error) {
  const details = error.response?.data?.details

  if (Array.isArray(details)) return details
  if (typeof details === 'string') return [details]

  return []
}

function formatTime(time) {
  if (!time) return '--:--'
  return String(time).slice(0, 5)
}

function formatProfessor(meeting) {
  if (!meeting.professor_first_name && !meeting.professor_last_name) {
    return 'Professor not assigned'
  }

  return [
    meeting.professor_first_name,
    meeting.professor_last_name,
  ]
    .filter(Boolean)
    .join(' ')
}

function formatTerm(term) {
  if (!term) return 'Academic term'

  return [term.name, term.academic_year]
    .filter(Boolean)
    .join(' · ')
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-[#E8E4E0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8290A0]">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-[#2F4156]">
            {value}
          </p>

          <p className="mt-1 text-xs text-[#8290A0]">
            {description}
          </p>
        </div>

        <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
          <Icon size={21} />
        </div>
      </div>
    </div>
  )
}

function MeetingCard({ meeting, onEdit, onDelete }) {
  const room =
    meeting.room || meeting.section_room || 'Room not assigned'

  return (
    <div className="group rounded-xl border border-[#CBD9E6]/80 bg-white p-3 transition hover:border-[#567CBD]/50 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#567CBD]">
            {meeting.course_code} · Section {meeting.section_code}
          </p>

          <p className="mt-1 text-sm font-semibold leading-snug text-[#2F4156]">
            {meeting.course_name}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(meeting)}
            title="Edit meeting"
            className="rounded-lg p-1.5 text-[#567CBD] hover:bg-[#CBD9E6]/40"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(meeting)}
            title="Delete meeting"
            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <Clock3 size={14} className="shrink-0 text-[#567CBD]" />
          <span>
            {formatTime(meeting.start_time)} – {formatTime(meeting.end_time)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <DoorOpen size={14} className="shrink-0 text-[#567CBD]" />
          <span className="truncate">{room}</span>
        </div>

        <div className="flex items-center gap-2">
          <UserRound size={14} className="shrink-0 text-[#567CBD]" />
          <span className="truncate">{formatProfessor(meeting)}</span>
        </div>
      </div>
    </div>
  )
}

function MeetingModal({
  open,
  editingMeeting,
  sections,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
}) {
  if (!open) return null

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const selectedSection = sections.find(
    (section) => section.section_id === form.section_id
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#172033]/50 p-4">
      <div className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E8E4E0] p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-[#2F4156]">
              {editingMeeting
                ? 'Edit timetable entry'
                : 'Add timetable entry'}
            </h2>

            <p className="mt-1 text-sm text-[#8290A0]">
              Set the course, day, time and classroom.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-[#8290A0] hover:bg-[#F5EFEB] hover:text-[#2F4156] disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-semibold">{error.message}</p>

                  {error.details?.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {error.details.map((detail, index) => (
                        <li key={`${index}-${detail}`}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
              Course section
            </label>

            <select
              required
              value={form.section_id}
              onChange={(event) =>
                updateField('section_id', event.target.value)
              }
              className="w-full rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10"
            >
              <option value="">Select a course section</option>

              {sections.map((section) => (
                <option
                  key={section.section_id}
                  value={section.section_id}
                >
                  {section.course_code} — {section.course_name} (Section{' '}
                  {section.section_code})
                </option>
              ))}
            </select>
          </div>

          {selectedSection && (
            <div className="rounded-xl border border-[#CBD9E6]/70 bg-[#F5EFEB]/60 p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[#8290A0]">Professor</p>

                  <p className="mt-1 font-semibold text-[#2F4156]">
                    {selectedSection.professor_first_name ||
                    selectedSection.professor_last_name
                      ? `${selectedSection.professor_first_name || ''} ${
                          selectedSection.professor_last_name || ''
                        }`.trim()
                      : 'Not assigned'}
                  </p>
                </div>

                <div>
                  <p className="text-[#8290A0]">Section room</p>

                  <p className="mt-1 font-semibold text-[#2F4156]">
                    {selectedSection.room || 'Not assigned'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
              Day of the week
            </label>

            <select
              value={form.day_of_week}
              onChange={(event) =>
                updateField('day_of_week', event.target.value)
              }
              className="w-full rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABELS[day]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                Start time
              </label>

              <input
                type="time"
                required
                value={form.start_time}
                onChange={(event) =>
                  updateField('start_time', event.target.value)
                }
                className="w-full rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
                End time
              </label>

              <input
                type="time"
                required
                value={form.end_time}
                onChange={(event) =>
                  updateField('end_time', event.target.value)
                }
                className="w-full rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
              Classroom
            </label>

            <input
              type="text"
              value={form.room}
              onChange={(event) =>
                updateField('room', event.target.value)
              }
              placeholder="Example: B-204"
              maxLength={100}
              className="w-full rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
            />

            <p className="mt-1 text-xs text-[#8290A0]">
              Leave empty to use the classroom assigned to the section.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#E8E4E0] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#CBD9E6] px-5 py-3 text-sm font-semibold text-[#2F4156] hover:bg-[#F5EFEB] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#567CBD] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <LoaderCircle size={16} className="animate-spin" />
              )}

              {saving
                ? 'Saving...'
                : editingMeeting
                  ? 'Save changes'
                  : 'Add meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CoordinatorScheduleManagement() {
  const [terms, setTerms] = useState([])
  const [sections, setSections] = useState([])
  const [meetings, setMeetings] = useState([])

  const [selectedTerm, setSelectedTerm] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingMeetingId, setDeletingMeetingId] = useState(null)

  const [pageError, setPageError] = useState('')
  const [success, setSuccess] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)

  // Load academic terms and accessible course sections.
  const loadOptions = useCallback(async () => {
    const response = await api.get(
      '/department-coordinator/schedule/options'
    )

    const data = response.data || {}
    const availableTerms = data.terms || []
    const availableSections = data.sections || []

    setTerms(availableTerms)
    setSections(availableSections)

    const nextTerm =
      availableTerms.find((term) => term.id === selectedTerm) ||
      availableTerms.find((term) => term.is_active) ||
      availableTerms[0] ||
      null

    const nextTermId = nextTerm?.id || ''

    setSelectedTerm(nextTermId)

    return nextTermId
  }, [selectedTerm])

  // Load timetable entries for a selected academic term.
  const loadMeetings = useCallback(async (termId) => {
    if (!termId) {
      setMeetings([])
      return
    }

    const response = await api.get(
      '/department-coordinator/schedule',
      {
        params: { termId },
      }
    )

    setMeetings(response.data?.meetings || [])
  }, [])

  const loadPage = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setPageError('')

      await loadOptions()
    } catch (error) {
      setPageError(
        getErrorMessage(error, 'Unable to load schedule information.')
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [loadOptions])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  // Reload timetable whenever the selected term changes.
  useEffect(() => {
    if (!selectedTerm) {
      setMeetings([])
      return
    }

    let cancelled = false

    async function fetchMeetings() {
      try {
        setPageError('')

        const response = await api.get(
          '/department-coordinator/schedule',
          {
            params: { termId: selectedTerm },
          }
        )

        if (!cancelled) {
          setMeetings(response.data?.meetings || [])
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            getErrorMessage(error, 'Unable to load timetable.')
          )
        }
      }
    }

    fetchMeetings()

    return () => {
      cancelled = true
    }
  }, [selectedTerm])

  const selectedTermInfo = useMemo(
    () => terms.find((term) => term.id === selectedTerm),
    [terms, selectedTerm]
  )

  const selectedTermSections = useMemo(
    () =>
      sections.filter(
        (section) => section.term_id === selectedTerm
      ),
    [sections, selectedTerm]
  )

  const meetingsByDay = useMemo(() => {
    const grouped = Object.fromEntries(
      DAYS.map((day) => [day, []])
    )

    meetings.forEach((meeting) => {
      if (grouped[meeting.day_of_week]) {
        grouped[meeting.day_of_week].push(meeting)
      }
    })

    Object.values(grouped).forEach((dayMeetings) => {
      dayMeetings.sort((a, b) =>
        String(a.start_time).localeCompare(String(b.start_time))
      )
    })

    return grouped
  }, [meetings])

  const assignedProfessorCount = useMemo(() => {
    return new Set(
      meetings
        .filter((meeting) => meeting.instructor_id)
        .map((meeting) => meeting.instructor_id)
    ).size
  }, [meetings])

  function openCreateModal() {
    setEditingMeeting(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setSuccess('')
    setModalOpen(true)
  }

  function openEditModal(meeting) {
    setEditingMeeting(meeting)

    setForm({
      section_id: meeting.section_id,
      day_of_week: meeting.day_of_week,
      start_time: formatTime(meeting.start_time),
      end_time: formatTime(meeting.end_time),
      room: meeting.room || '',
    })

    setFormError(null)
    setSuccess('')
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return

    setModalOpen(false)
    setEditingMeeting(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setFormError(null)
    setSuccess('')

    if (!form.section_id) {
      setFormError({
        message: 'Please select a course section.',
        details: [],
      })
      return
    }

    if (form.start_time >= form.end_time) {
      setFormError({
        message: 'The end time must be later than the start time.',
        details: [],
      })
      return
    }

    try {
      setSaving(true)

      const payload = {
        section_id: form.section_id,
        day_of_week: form.day_of_week,
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room.trim(),
      }

      if (editingMeeting) {
        await api.patch(
          `/department-coordinator/schedule/${editingMeeting.id}`,
          payload
        )
      } else {
        await api.post(
          '/department-coordinator/schedule',
          payload
        )
      }

      setModalOpen(false)
      setEditingMeeting(null)
      setForm(EMPTY_FORM)
      setFormError(null)

      setSuccess(
        editingMeeting
          ? 'Timetable entry updated successfully.'
          : 'Timetable entry created successfully.'
      )

      await loadMeetings(selectedTerm)
    } catch (error) {
      setFormError({
        message: getErrorMessage(
          error,
          'Unable to save timetable entry.'
        ),
        details: getErrorDetails(error),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(meeting) {
    const confirmed = window.confirm(
      `Delete the timetable entry for ${meeting.course_code} — ${meeting.course_name}?`
    )

    if (!confirmed) return

    try {
      setDeletingMeetingId(meeting.id)
      setPageError('')
      setSuccess('')

      await api.delete(
        `/department-coordinator/schedule/${meeting.id}`
      )

      setSuccess('Timetable entry deleted successfully.')

      await loadMeetings(selectedTerm)
    } catch (error) {
      setPageError(
        getErrorMessage(error, 'Unable to delete timetable entry.')
      )
    } finally {
      setDeletingMeetingId(null)
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true)
      setPageError('')
      setSuccess('')

      const termId = await loadOptions()

      if (termId) {
        await loadMeetings(termId)
      } else {
        setMeetings([])
      }
    } catch (error) {
      setPageError(
        getErrorMessage(error, 'Unable to refresh timetable.')
      )
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-medium text-[#567CBD]">
          <LoaderCircle size={23} className="animate-spin" />
          Loading schedule management...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading and actions */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-[#8290A0]">
            <CalendarDays size={16} />
            <span>Academic Management</span>
            <span>/</span>
            <span className="font-medium text-[#567CBD]">
              Schedule Management
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-[#2F4156] sm:text-3xl">
            Schedule Management
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-[#8290A0]">
            Organize course meetings, assign classrooms and manage your
            department's weekly timetable.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm font-semibold text-[#2F4156] hover:bg-[#F5EFEB] disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!selectedTerm || selectedTermSections.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#567CBD] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={17} />
            Add meeting
          </button>
        </div>
      </div>

      {/* Error message */}
      {pageError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>{pageError}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Academic term selector */}
      <div className="rounded-2xl border border-[#E8E4E0] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#2F4156]">
              Academic term
            </p>

            <p className="mt-1 text-xs text-[#8290A0]">
              Select the term whose timetable you want to manage.
            </p>
          </div>

          <select
            value={selectedTerm}
            onChange={(event) => setSelectedTerm(event.target.value)}
            className="w-full rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm font-medium text-[#2F4156] outline-none focus:border-[#567CBD] sm:max-w-sm"
          >
            <option value="">Select an academic term</option>

            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {formatTerm(term)}
                {term.is_active ? ' (Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Scheduled meetings"
          value={meetings.length}
          description="Entries in the selected term"
        />

        <StatCard
          icon={BookOpen}
          label="Sections"
          value={
            new Set(
              meetings.map((meeting) => meeting.section_id)
            ).size
          }
          description="Sections with timetable entries"
        />

        <StatCard
          icon={UserRound}
          label="Professors"
          value={assignedProfessorCount}
          description="Professors in this timetable"
        />

        <StatCard
          icon={GraduationCap}
          label="Available sections"
          value={selectedTermSections.length}
          description="Sections accessible to you"
        />
      </div>

      {!selectedTerm ? (
        <div className="rounded-2xl border border-dashed border-[#CBD9E6] bg-white px-6 py-16 text-center">
          <CalendarDays
            size={35}
            className="mx-auto text-[#8290A0]"
          />

          <h3 className="mt-4 font-semibold text-[#2F4156]">
            No academic term available
          </h3>

          <p className="mt-2 text-sm text-[#8290A0]">
            There are no academic terms to display.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-[#2F4156]">
              Weekly timetable
            </h2>

            <p className="text-sm text-[#8290A0]">
              {formatTerm(selectedTermInfo)} · Select a meeting to edit
              or delete it.
            </p>
          </div>

          {meetings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD9E6] bg-white px-6 py-16 text-center">
              <CalendarDays
                size={35}
                className="mx-auto text-[#8290A0]"
              />

              <h3 className="mt-4 font-semibold text-[#2F4156]">
                No meetings scheduled yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-[#8290A0]">
                Add the first course meeting to start building your
                department's timetable.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                disabled={selectedTermSections.length === 0}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-4 py-3 text-sm font-semibold text-white hover:bg-[#567CBD] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                Add first meeting
              </button>

              {selectedTermSections.length === 0 && (
                <p className="mt-3 text-xs text-[#8290A0]">
                  No accessible course sections are available for this term.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {DAYS.map((day) => (
                <section
                  key={day}
                  className="min-h-40 rounded-2xl border border-[#E8E4E0] bg-[#FAFBFC] p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-[#2F4156]">
                      {DAY_LABELS[day]}
                    </h3>

                    <span className="rounded-full bg-[#CBD9E6]/50 px-2.5 py-1 text-xs font-semibold text-[#567CBD]">
                      {meetingsByDay[day].length}
                    </span>
                  </div>

                  {meetingsByDay[day].length === 0 ? (
                    <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-[#CBD9E6] bg-white px-3 text-center text-xs text-[#A0AAB6]">
                      No meetings
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {meetingsByDay[day].map((meeting) => (
                        <div
                          key={meeting.id}
                          className={
                            deletingMeetingId === meeting.id
                              ? 'pointer-events-none opacity-50'
                              : ''
                          }
                        >
                          <MeetingCard
                            meeting={meeting}
                            onEdit={openEditModal}
                            onDelete={handleDelete}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <MeetingModal
        open={modalOpen}
        editingMeeting={editingMeeting}
        sections={selectedTermSections}
        form={form}
        setForm={setForm}
        saving={saving}
        error={formError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
