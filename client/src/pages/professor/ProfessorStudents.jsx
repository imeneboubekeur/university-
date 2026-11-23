
import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Mail,
  Building2,
  ChevronDown,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function SummaryCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#7B8490]">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-[#2F4156]">{value}</h3>
        </div>
        <div className="rounded-xl bg-[#CBD9E6]/50 p-3 text-[#567CBD]">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    ACTIVE: 'bg-green-50 text-green-700',
    SUSPENDED: 'bg-red-50 text-red-700',
    GRADUATED: 'bg-blue-50 text-blue-700',
    WITHDRAWN: 'bg-gray-100 text-gray-600',
  }

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
      styles[status] || 'bg-gray-100 text-gray-600'
    }`}>
      {status || 'UNKNOWN'}
    </span>
  )
}

export default function ProfessorStudents() {
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [selectedSection, setSelectedSection] = useState(null)
  const [search, setSearch] = useState('')
  const [loadingSections, setLoadingSections] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [error, setError] = useState('')

  async function loadStudents(sectionId) {
    try {
      setLoadingStudents(true)
      setError('')

      const url = new URL(`${API_URL}/professor/students`)

      if (sectionId) {
        url.searchParams.set('sectionId', sectionId)
      }

      const response = await fetch(url, {
        credentials: 'include',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to load students.')
      }

      setSections(result.sections || [])
      setStudents(result.students || [])
      setSelectedSection(result.selectedSection || null)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setStudents([])
      setSelectedSection(null)
    } finally {
      setLoadingSections(false)
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    loadStudents('')
  }, [])

  function handleSectionChange(event) {
    const sectionId = event.target.value
    setSelectedSectionId(sectionId)
    setSearch('')
    loadStudents(sectionId)
  }

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return students

    return students.filter((student) => {
      const fullName =
        `${student.first_name} ${student.last_name}`.toLowerCase()

      return (
        fullName.includes(term) ||
        String(student.student_number || '').toLowerCase().includes(term) ||
        String(student.email || '').toLowerCase().includes(term) ||
        String(student.department_name || '').toLowerCase().includes(term)
      )
    })
  }, [students, search])

  if (loadingSections) {
    return (
      <div className="flex min-h-[400px] items-center justify-center gap-3 text-sm text-[#7B8490]">
        <RefreshCw size={20} className="animate-spin" />
        Loading your sections...
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#567CBD]">
            Professor Portal
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#2F4156]">
            My Students
          </h1>
          <p className="mt-1 text-sm text-[#7B8490]">
            View students enrolled in your assigned course sections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadStudents(selectedSectionId)}
          disabled={loadingStudents}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E5E9] bg-white px-4 py-2.5 text-sm font-semibold text-[#2F4156] disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loadingStudents ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Section selector */}
      <div className="rounded-2xl border border-[#E8E5E1] bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-[#2F4156]">
          Select Course Section
        </label>

        <div className="relative">
          <BookOpen
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567CBD]"
          />
          <select
            value={selectedSectionId}
            onChange={handleSectionChange}
            className="w-full appearance-none rounded-xl border border-[#E2E5E9] bg-white py-3 pl-10 pr-10 text-sm text-[#2F4156] outline-none focus:border-[#567CBD]"
          >
            <option value="">Choose a section...</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.course_code} — {section.course_name}
                {' · Section '}{section.section_code}
                {' · '}{section.term_name} {section.academic_year}
              </option>
            ))}
          </select>
          <ChevronDown
            size={17}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9299A2]"
          />
        </div>

        {sections.length === 0 && (
          <p className="mt-3 text-sm text-[#9299A2]">
            No course sections are currently assigned to your account.
          </p>
        )}

        {selectedSection && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#697586]">
            <span className="rounded-lg bg-[#CBD9E6]/50 px-3 py-1.5 font-semibold text-[#567CBD]">
              {selectedSection.course_code}
            </span>
            <span>
              Section {selectedSection.section_code}
            </span>
            <span>·</span>
            <span>
              {selectedSection.term_name} {selectedSection.academic_year}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-600">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Student statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Assigned Sections"
          value={sections.length}
          icon={BookOpen}
        />
        <SummaryCard
          title="Students in Section"
          value={selectedSection ? selectedSection.enrolled_count : '—'}
          icon={Users}
        />
        <SummaryCard
          title="Matching Students"
          value={selectedSectionId ? filteredStudents.length : '—'}
          icon={GraduationCap}
        />
      </div>

      {/* Student table */}
      <section className="overflow-hidden rounded-2xl border border-[#E8E5E1] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#F0EFED] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-[#2F4156]">
              Enrolled Students
            </h2>
            <p className="mt-1 text-xs text-[#9299A2]">
              {selectedSection
                ? `${selectedSection.course_code} · Section ${selectedSection.section_code}`
                : 'Select a section to view its students.'}
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A2]"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!selectedSectionId}
              placeholder="Search students..."
              className="w-full rounded-xl border border-[#E2E5E9] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#567CBD] disabled:bg-gray-50"
            />
          </div>
        </div>

        {loadingStudents ? (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-[#7B8490]">
            <RefreshCw size={19} className="animate-spin" />
            Loading students...
          </div>
        ) : !selectedSectionId ? (
          <div className="p-12 text-center">
            <Users className="mx-auto text-[#9AA7B5]" size={36} />
            <h3 className="mt-3 font-semibold text-[#2F4156]">
              Select a course section
            </h3>
            <p className="mt-1 text-sm text-[#9299A2]">
              The enrolled student list will appear here.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto text-[#9AA7B5]" size={36} />
            <h3 className="mt-3 font-semibold text-[#2F4156]">
              {search ? 'No matching students' : 'No enrolled students'}
            </h3>
            <p className="mt-1 text-sm text-[#9299A2]">
              {search
                ? 'Try searching with another name or student number.'
                : 'There are currently no enrolled students in this section.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#F8F9FA]">
                <tr className="text-xs uppercase tracking-wide text-[#7B8490]">
                  <th className="px-5 py-4 font-semibold">Student</th>
                  <th className="px-5 py-4 font-semibold">Student Number</th>
                  <th className="px-5 py-4 font-semibold">Department</th>
                  <th className="px-5 py-4 font-semibold">Year</th>
                  <th className="px-5 py-4 font-semibold">Enrollment</th>
                  <th className="px-5 py-4 font-semibold">Student Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F0EFED]">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.enrollment_id}
                    className="hover:bg-[#FAFBFC]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CBD9E6]/50 font-bold text-[#567CBD]">
                          {student.first_name?.[0]}
                          {student.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2F4156]">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-[#9299A2]">
                            <Mail size={12} />
                            {student.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-[#2F4156]">
                      {student.student_number}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#697586]">
                        <Building2 size={15} className="text-[#567CBD]" />
                        {student.department_name}
                      </div>
                      <p className="mt-1 pl-6 text-xs text-[#9299A2]">
                        {student.department_code}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#697586]">
                      Year {student.year_level}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        {student.enrollment_status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={student.student_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedSectionId && filteredStudents.length > 0 && (
          <div className="border-t border-[#F0EFED] px-5 py-4 text-xs text-[#9299A2]">
            Showing {filteredStudents.length} of {students.length} enrolled students
          </div>
        )}
      </section>
    </div>
  )
}
