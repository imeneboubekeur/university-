
import { useEffect, useRef, useState } from 'react'
import {
  UserRound,
  ShieldCheck,
  GraduationCap,
  Building2,
  Mail,
  Phone,
  LockKeyhole,
  Save,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Camera,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
const API_URL = import.meta.env.VITE_API_URL

const roleLabels = {
  STUDENT: 'Student',
  PROFESSOR: 'Professor',
  SECRETARY: 'Secretary',
  DEPARTMENT_COORDINATOR: 'Department Coordinator',
  ADMIN: 'Administrator',
}

function Field({ label, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#2F4156]">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl border border-[#CBD9E6] bg-white px-4 py-3 text-sm text-[#2F4156] outline-none transition focus:border-[#567CBD] focus:ring-2 focus:ring-[#567CBD]/10 disabled:bg-[#F5EFEB] disabled:text-slate-500"
      />
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-xl border border-[#CBD9E6]/70 bg-[#F5EFEB]/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[#2F4156]">
        {value || 'Not available'}
      </p>
    </div>
  )
}

export default function ProfileSettings() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
const photoInputRef = useRef(null)

const [uploadingPhoto, setUploadingPhoto] = useState(false)
const [photoPreview, setPhotoPreview] = useState('')
const { updateUser } = useAuth()
  useEffect(() => {
    loadProfile()
  }, [])
async function handlePhotoUpload(event) {
  const file = event.target.files?.[0]

  if (!file) return

  setError('')
  setSuccess('')

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ]

  if (!allowedTypes.includes(file.type)) {
    setError('Please select a JPG, PNG, or WEBP image.')
    event.target.value = ''
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    setError('The profile picture must not exceed 5 MB.')
    event.target.value = ''
    return
  }

  const previewUrl = URL.createObjectURL(file)

  try {
    setUploadingPhoto(true)
    setPhotoPreview(previewUrl)

    const formData = new FormData()
    formData.append('profilePicture', file)

    const response = await fetch(`${API_URL}/profile/photo`, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Unable to upload your profile picture.'
      )
    }

    setProfile((previous) => ({
      ...previous,
      ...data.profile,
    }))
updateUser(data.profile)
    setPhotoPreview('')
    setSuccess('Your profile picture has been updated successfully.')
  } catch (err) {
    setPhotoPreview('')
    setError(err.message)
  } finally {
    URL.revokeObjectURL(previewUrl)
    setUploadingPhoto(false)

    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }
}
  async function loadProfile() {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`${API_URL}/profile`, {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load your profile.')
      }

      const user = data.profile

      setProfile(user)
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      setSavingProfile(true)

      const response = await fetch(`${API_URL}/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update your profile.')
      }

      setProfile((previous) => ({
        ...previous,
        ...data.profile,
      }))

      setSuccess('Your personal information has been updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('The new passwords do not match.')
      return
    }

    try {
      setSavingPassword(true)

      const response = await fetch(`${API_URL}/profile/password`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to change your password.')
      }

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })

      setSuccess('Your password has been changed successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#567CBD]" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600">
        {error || 'Unable to load your profile.'}
      </div>
    )
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim()
  const role = roleLabels[profile.role] || profile.role

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-sm font-medium text-[#567CBD]">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#2F4156]">
          Profile & Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your personal information and account security.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Account overview */}
      <section className="overflow-hidden rounded-2xl border border-[#CBD9E6] bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-[#2F4156] p-6 sm:flex-row sm:items-center">
         <div className="relative h-20 w-20 shrink-0">
  <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-white/30 bg-white/15">
    {photoPreview || profile.image_url ? (
      <img
        src={photoPreview || profile.image_url}
        alt={`${fullName}'s profile`}
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center text-white">
        <UserRound size={36} />
      </div>
    )}
  </div>

  <button
    type="button"
    onClick={() => photoInputRef.current?.click()}
    disabled={uploadingPhoto}
    title="Change profile picture"
    className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#2F4156] bg-white text-[#2F4156] shadow-md transition hover:bg-[#CBD9E6] disabled:opacity-50"
  >
    {uploadingPhoto ? (
      <LoaderCircle size={17} className="animate-spin" />
    ) : (
      <Camera size={17} />
    )}
  </button>

  <input
    ref={photoInputRef}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handlePhotoUpload}
    className="hidden"
  />
</div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-white">
              {fullName}
            </h2>
            <p className="mt-1 text-sm text-white/70">
              {profile.email}
            </p>
          </div>

          <span className="w-fit rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white">
            {role}
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Account email" value={profile.email} />
          <InfoItem label="Account role" value={role} />
          <InfoItem
            label="Account status"
            value={profile.is_active ? 'Active' : 'Inactive'}
          />

          {profile.student_number && (
            <InfoItem label="Student number" value={profile.student_number} />
          )}

          {profile.employee_number && (
            <InfoItem label="Employee number" value={profile.employee_number} />
          )}

          {profile.academic_title && (
            <InfoItem label="Academic title" value={profile.academic_title} />
          )}

          {profile.department_name && (
            <InfoItem label="Department" value={profile.department_name} />
          )}

          {profile.faculty_name && (
            <InfoItem label="Faculty" value={profile.faculty_name} />
          )}

          {profile.enrollment_year && (
            <InfoItem label="Enrollment year" value={profile.enrollment_year} />
          )}

          {profile.year_level && (
            <InfoItem label="Study year" value={profile.year_level} />
          )}

          {profile.status && profile.student_number && (
            <InfoItem label="Student status" value={profile.status} />
          )}
        </div>
      </section>

      {/* Personal information */}
      <section className="rounded-2xl border border-[#CBD9E6] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
            <UserRound size={21} />
          </div>
          <div>
            <h2 className="font-semibold text-[#2F4156]">
              Personal Information
            </h2>
            <p className="text-sm text-slate-500">
              Update the personal details associated with your account.
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="First name"
              value={form.first_name}
              onChange={(e) =>
                setForm({ ...form, first_name: e.target.value })
              }
              placeholder="Enter first name"
            />

            <Field
              label="Last name"
              value={form.last_name}
              onChange={(e) =>
                setForm({ ...form, last_name: e.target.value })
              }
              placeholder="Enter last name"
            />

            <Field
              label="Email address"
              value={profile.email}
              disabled
            />

            <Field
              label="Phone number"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex justify-end border-t border-[#CBD9E6]/70 pt-5">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-xl bg-[#567CBD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#456BA9] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-[#CBD9E6] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-[#CBD9E6]/40 p-3 text-[#567CBD]">
            <ShieldCheck size={21} />
          </div>
          <div>
            <h2 className="font-semibold text-[#2F4156]">
              Account Security
            </h2>
            <p className="text-sm text-slate-500">
              Change your password to keep your account secure.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Current password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              placeholder="Enter current password"
            />

            <div />

            <Field
              label="New password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              placeholder="At least 8 characters"
            />

            <Field
              label="Confirm new password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="Repeat new password"
            />
          </div>

          <p className="text-xs text-slate-500">
            Your new password must contain at least 8 characters.
          </p>

          <div className="flex justify-end border-t border-[#CBD9E6]/70 pt-5">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2F4156] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#243548] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPassword ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : (
                <LockKeyhole size={17} />
              )}
              Change Password
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
