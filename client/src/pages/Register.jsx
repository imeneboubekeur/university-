
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Hash,
  Building2,
  Calendar,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentNumber: '',
    departmentId: '',
    enrollmentYear: new Date().getFullYear(),
    yearLevel: '1',
  })

  const [faculties, setFaculties] = useState([])
  const [facultyId, setFacultyId] = useState('')
  const [loadingFaculties, setLoadingFaculties] = useState(true)
  const [academicError, setAcademicError] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Load faculties and their departments from the backend
  useEffect(() => {
    async function fetchAcademicStructure() {
      try {
        setLoadingFaculties(true)
        setAcademicError('')

        const response = await api.get('/academic/structure')

        setFaculties(response.data.faculties || [])
      } catch (err) {
        console.error('Failed to load academic structure:', err)
        setAcademicError(
          'Unable to load faculties. Please refresh the page.'
        )
      } finally {
        setLoadingFaculties(false)
      }
    }

    fetchAcademicStructure()
  }, [])

  // Get departments belonging to the selected faculty
  const selectedFaculty = faculties.find(
    (faculty) => faculty.id === facultyId
  )

  const departments = selectedFaculty?.departments || []

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }))
  }

  const handleFacultyChange = (event) => {
    setFacultyId(event.target.value)

    // Reset department when faculty changes
    setForm((previousForm) => ({
      ...previousForm,
      departmentId: '',
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!form.departmentId) {
      setError('Please select your department.')
      return
    }

    try {
      setLoading(true)

      const {
        confirmPassword,
        ...registrationData
      } = form

      await register({
        ...registrationData,
        enrollmentYear: Number(form.enrollmentYear),
        yearLevel: Number(form.yearLevel),
      })

      navigate('/dashboard')
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2F4156] outline-none transition placeholder:text-gray-400 focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10'

  const labelClass =
    'mb-2 block text-xs font-semibold uppercase tracking-wider text-[#2F4156]'

  return (
    <div className="min-h-screen bg-[#F5EFEB] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">

        {/* Branding section */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#2F4156] p-12 text-white lg:flex">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" />

          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <GraduationCap size={28} />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  UnivAdmin Pro
                </h1>
                <p className="text-xs text-white/60">
                  Academic Management Platform
                </p>
              </div>
            </div>

            <div className="max-w-md">
              <span className="mb-5 inline-block rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/80">
                STUDENT REGISTRATION
              </span>

              <h2 className="mb-6 text-4xl font-bold leading-tight">
                Start your academic journey with us.
              </h2>

              <p className="text-base leading-7 text-white/70">
                Create your student account to access your academic
                information, courses, registrations, grades, and university
                services in one place.
              </p>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-6">
            <p className="text-xs text-white/50">
              © {new Date().getFullYear()} UnivAdmin Pro. All rights reserved.
            </p>
          </div>
        </div>

        {/* Registration form */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-lg">

            {/* Mobile branding */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F4156] text-white">
                <GraduationCap size={25} />
              </div>

              <div>
                <h1 className="font-bold text-[#2F4156]">
                  UnivAdmin Pro
                </h1>
                <p className="text-xs text-gray-500">
                  Academic Management Platform
                </p>
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#567CBD]">
                CREATE ACCOUNT
              </p>

              <h2 className="text-3xl font-bold text-[#2F4156]">
                Student Registration
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Enter your information to create your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Personal information */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-[#2F4156]">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>First Name</label>

                    <div className="relative">
                      <User
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="First name"
                        className={`${inputClass} pl-10`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Last Name</label>

                    <div className="relative">
                      <User
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Last name"
                        className={`${inputClass} pl-10`}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account information */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-[#2F4156]">
                  Account Information
                </h3>

                <div>
                  <label className={labelClass}>University Email</label>

                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="your.email@university.edu"
                      className={`${inputClass} pl-10`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Academic information */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-[#2F4156]">
                  Academic Information
                </h3>

                <div className="space-y-4">

                  {/* Student number */}
                  <div>
                    <label className={labelClass}>Student Number</label>

                    <div className="relative">
                      <Hash
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="text"
                        name="studentNumber"
                        value={form.studentNumber}
                        onChange={handleChange}
                        placeholder="Enter your student number"
                        className={`${inputClass} pl-10`}
                        required
                      />
                    </div>
                  </div>

                  {/* Faculty dropdown */}
                  <div>
                    <label className={labelClass}>Faculty</label>

                    <div className="relative">
                      <Building2
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <select
                        value={facultyId}
                        onChange={handleFacultyChange}
                        className={`${inputClass} pl-10`}
                        required
                        disabled={loadingFaculties || faculties.length === 0}
                      >
                        <option value="">
                          {loadingFaculties
                            ? 'Loading faculties...'
                            : 'Select your faculty'}
                        </option>

                        {faculties.map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Department dropdown */}
                  <div>
                    <label className={labelClass}>Department</label>

                    <div className="relative">
                      <BookOpen
                        size={17}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <select
                        name="departmentId"
                        value={form.departmentId}
                        onChange={handleChange}
                        className={`${inputClass} pl-10`}
                        required
                        disabled={!facultyId || departments.length === 0}
                      >
                        <option value="">
                          {!facultyId
                            ? 'Select a faculty first'
                            : departments.length === 0
                              ? 'No departments available'
                              : 'Select your department'}
                        </option>

                        {departments.map((department) => (
                          <option
                            key={department.id}
                            value={department.id}
                          >
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {academicError && (
                    <p className="text-sm text-red-600">
                      {academicError}
                    </p>
                  )}

                  {/* Enrollment year and year level */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Enrollment Year</label>

                      <div className="relative">
                        <Calendar
                          size={17}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="number"
                          name="enrollmentYear"
                          value={form.enrollmentYear}
                          onChange={handleChange}
                          min="2000"
                          max={new Date().getFullYear()}
                          className={`${inputClass} pl-10`}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Year Level</label>

                      <div className="relative">
                        <BookOpen
                          size={17}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <select
                          name="yearLevel"
                          value={form.yearLevel}
                          onChange={handleChange}
                          className={`${inputClass} pl-10`}
                          required
                        >
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                          <option value="5">5th Year</option>
                          <option value="6">6th Year</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-[#2F4156]">
                  Security
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Password</label>

                    <div className="relative">
                      <Lock
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="At least 8 characters"
                        className={`${inputClass} pl-10 pr-11`}
                        required
                        minLength={8}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2F4156]"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Confirm Password</label>

                    <div className="relative">
                      <Lock
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        className={`${inputClass} pl-10 pr-11`}
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2F4156]"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || loadingFaculties || faculties.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#243548] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating Account...' : 'Create Student Account'}

                {!loading && <ArrowRight size={17} />}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-[#567CBD] hover:underline"
                >
                  Sign in
                </Link>
              </p>

              <p className="text-center text-xs leading-5 text-gray-400">
                Your account will be registered with the Student role.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
