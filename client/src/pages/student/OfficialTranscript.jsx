
import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  GraduationCap,
  LoaderCircle,
  Printer,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import api from '../../services/api'

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatGPA(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toFixed(2)
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-[#E7E3DF] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-[#718096]">{label}</p>
        <Icon size={18} className="text-[#567CBD]" />
      </div>
      <p className="break-words text-sm font-bold text-[#2F4156]">
        {value || '—'}
      </p>
    </div>
  )
}

export default function OfficialTranscript() {
  const [transcripts, setTranscripts] = useState([])
  const [student, setStudent] = useState(null)
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const loadTranscripts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/student/transcripts')

      const transcriptList = response.data.transcripts || []

      setStudent(response.data.student || null)
      setTranscripts(transcriptList)

      if (transcriptList.length > 0) {
        await loadTranscriptDetail(transcriptList[0].id)
      } else {
        setSelectedTranscript(null)
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load your official transcripts.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  async function loadTranscriptDetail(transcriptId) {
    try {
      setDetailLoading(true)
      setError('')

      const response = await api.get(
        `/student/transcripts/${transcriptId}`
      )

      setSelectedTranscript(response.data.transcript)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load this transcript.'
      )
      setSelectedTranscript(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadTranscripts()
  }, [loadTranscripts])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[#718096]">
        <LoaderCircle size={22} className="animate-spin" />
        Loading your official transcript...
      </div>
    )
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
              Official Transcript
            </span>
          </div>

          <h1 className="text-2xl font-bold text-[#2F4156] md:text-3xl">
            Official Transcript
          </h1>

          <p className="mt-2 text-sm text-[#718096]">
            View your officially issued academic records and grades.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadTranscripts}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE3EA] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] hover:bg-[#F5EFEB]"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!selectedTranscript || detailLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#567CBD] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#456AA8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={16} />
            Print Transcript
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={19} />
          {error}
        </div>
      )}

      {/* No issued transcripts */}
      {transcripts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE3EA] bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#567CBD]">
            <GraduationCap size={32} />
          </div>

          <h2 className="text-lg font-bold text-[#2F4156]">
            No official transcript available
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#718096]">
            You do not have an issued transcript yet. Once the Secretary
            or authorized university staff issues your transcript, it will
            appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Transcript selector */}
          {transcripts.length > 1 && (
            <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm">
              <label
                htmlFor="transcript-selector"
                className="mb-2 block text-sm font-semibold text-[#2F4156]"
              >
                Select transcript
              </label>

              <select
                id="transcript-selector"
                value={selectedTranscript?.id || ''}
                onChange={(event) =>
                  loadTranscriptDetail(event.target.value)
                }
                className="w-full max-w-lg rounded-xl border border-[#DCE3EA] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
              >
                {transcripts.map((transcript) => (
                  <option key={transcript.id} value={transcript.id}>
                    {transcript.transcript_number}
                    {' · '}
                    {transcript.term_name || transcript.academic_year || 'Academic record'}
                  </option>
                ))}
              </select>
            </section>
          )}

          {detailLoading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#718096]">
              <LoaderCircle size={21} className="animate-spin" />
              Loading transcript details...
            </div>
          ) : selectedTranscript ? (
            <div id="official-transcript-document" className="space-y-5">
              {/* Student information */}
              <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:p-7">
                <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#E7E3DF] pb-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#2F4156] p-3 text-white">
                      <GraduationCap size={26} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#2F4156]">
                        Academic Record
                      </h2>
                      <p className="text-xs text-[#718096]">
                        UnivAdmin Pro · Academic Management Platform
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <ShieldCheck size={15} />
                    Officially Issued
                  </div>
                </div>

                <div className="mb-5">
                  <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-[#567CBD]">
                    Student Information
                  </h3>
                  <p className="text-xs text-[#718096]">
                    Personal and academic identification
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoCard
                    label="Full Name"
                    value={`${student?.first_name || ''} ${student?.last_name || ''}`.trim()}
                    icon={GraduationCap}
                  />
                  <InfoCard
                    label="Student Number"
                    value={student?.student_number}
                    icon={Award}
                  />
                  <InfoCard
                    label="Email Address"
                    value={student?.email}
                    icon={FileText}
                  />
                  <InfoCard
                    label="Department"
                    value={student?.department_name}
                    icon={BookOpen}
                  />
                  <InfoCard
                    label="Faculty"
                    value={student?.faculty_name}
                    icon={GraduationCap}
                  />
                  <InfoCard
                    label="Academic Year Level"
                    value={student?.year_level}
                    icon={CalendarDays}
                  />
                </div>
              </section>

              {/* Transcript metadata */}
              <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#2F4156]">
                      Transcript Details
                    </h3>
                    <p className="mt-1 text-xs text-[#718096]">
                      Official document identification
                    </p>
                  </div>
                  <FileText className="text-[#567CBD]" size={23} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoCard
                    label="Transcript Number"
                    value={selectedTranscript.transcript_number}
                    icon={FileText}
                  />
                  <InfoCard
                    label="Academic Term"
                    value={selectedTranscript.term_name || selectedTranscript.academic_year}
                    icon={CalendarDays}
                  />
                  <InfoCard
                    label="Generated Date"
                    value={formatDate(selectedTranscript.generated_at)}
                    icon={CalendarDays}
                  />
                  <InfoCard
                    label="Issued Date"
                    value={formatDate(selectedTranscript.issued_at)}
                    icon={CheckCircle2}
                  />
                </div>
              </section>

              {/* GPA summary */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#2F4156] p-6 text-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/70">
                      Cumulative GPA
                    </p>
                    <Award size={23} className="text-[#CBD9E6]" />
                  </div>
                  <p className="mt-3 text-4xl font-bold">
                    {formatGPA(selectedTranscript.cumulative_gpa)}
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    As recorded on this issued transcript
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E7E3DF] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#718096]">
                      Total Credits
                    </p>
                    <BookOpen size={23} className="text-[#567CBD]" />
                  </div>
                  <p className="mt-3 text-4xl font-bold text-[#2F4156]">
                    {selectedTranscript.total_credits ?? 0}
                  </p>
                  <p className="mt-2 text-xs text-[#718096]">
                    Credits recorded on this transcript
                  </p>
                </div>
              </section>

              {/* Course grades */}
              <section className="overflow-hidden rounded-2xl border border-[#E7E3DF] bg-white shadow-sm">
                <div className="border-b border-[#E7E3DF] p-5 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2.5 text-[#567CBD]">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2F4156]">
                        Academic Results
                      </h3>
                      <p className="mt-1 text-xs text-[#718096]">
                        Course grades and credit information
                      </p>
                    </div>
                  </div>
                </div>

                {selectedTranscript.entries?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] text-left text-sm">
                      <thead className="bg-[#F5EFEB] text-xs uppercase tracking-wide text-[#718096]">
                        <tr>
                          <th className="px-5 py-4">Course Code</th>
                          <th className="px-5 py-4">Course Name</th>
                          <th className="px-5 py-4">Term</th>
                          <th className="px-5 py-4 text-center">Credits</th>
                          <th className="px-5 py-4 text-center">Grade</th>
                          <th className="px-5 py-4 text-center">Numeric</th>
                          <th className="px-5 py-4 text-center">Quality Points</th>
                          <th className="px-5 py-4 text-center">GPA</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#E7E3DF]">
                        {selectedTranscript.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-[#FCFBFA]">
                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#2F4156]">
                              {entry.course_code}
                            </td>
                            <td className="px-5 py-4 text-[#2F4156]">
                              {entry.course_name}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 text-[#718096]">
                              {entry.term_label}
                            </td>
                            <td className="px-5 py-4 text-center text-[#2F4156]">
                              {entry.credits}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-bold text-[#567CBD]">
                                {entry.letter_grade || '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center text-[#2F4156]">
                              {entry.numeric_grade ?? '—'}
                            </td>
                            <td className="px-5 py-4 text-center text-[#2F4156]">
                              {entry.quality_points ?? '—'}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {entry.counts_toward_gpa ? (
                                <CheckCircle2
                                  size={17}
                                  className="mx-auto text-emerald-600"
                                />
                              ) : (
                                <span className="text-xs text-[#A0AEC0]">
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-10 text-center text-sm text-[#718096]">
                    No course entries are recorded on this transcript.
                  </div>
                )}

                <div className="border-t border-[#E7E3DF] bg-[#FCFBFA] px-5 py-4 text-xs text-[#718096]">
                  The GPA column indicates whether each course is included
                  in the GPA calculation. It does not independently
                  recalculate your cumulative GPA.
                </div>
              </section>

              {/* Issuer information */}
              <section className="rounded-2xl border border-[#E7E3DF] bg-white p-5 shadow-sm md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-bold text-[#2F4156]">
                      Issuance Information
                    </h3>
                    <p className="mt-1 text-sm text-[#718096]">
                      Issued by:{' '}
                      {selectedTranscript.issuer_first_name
                        ? `${selectedTranscript.issuer_first_name} ${selectedTranscript.issuer_last_name || ''}`
                        : 'Authorized university office'}
                    </p>
                    <p className="mt-1 text-xs text-[#718096]">
                      Transcript No. {selectedTranscript.transcript_number}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                    <ShieldCheck size={19} />
                    Issued
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
