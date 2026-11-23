
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(form)
      navigate('/dashboard')
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to sign in. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5EFEB] flex items-center justify-center p-5 font-sans">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 bg-white rounded-[2rem] overflow-hidden border border-[#CBD9E6]/70 shadow-xl">

        {/* Branding panel */}
        <section className="hidden lg:flex bg-[#2F4156] text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute w-80 h-80 rounded-full border border-white/10 -top-24 -right-24" />
          <div className="absolute w-96 h-96 rounded-full border border-white/10 -bottom-40 -left-20" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F5EFEB] text-[#2F4156] flex items-center justify-center">
                <GraduationCap size={28} />
              </div>
              <div>
                <h1 className="font-bold text-xl">UnivAdmin Pro</h1>
                <p className="text-xs text-[#CBD9E6]">
                  Academic Management Platform
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#CBD9E6] bg-white/10 px-4 py-2 rounded-full">
              <ShieldCheck size={15} />
              Secure university access
            </span>

            <h2 className="text-4xl font-bold leading-tight mt-7">
              Your academic journey, all in one place.
            </h2>

            <p className="text-[#CBD9E6] leading-7 mt-5">
              Access your courses, academic records, registration
              requests and university services through one platform.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-3">
              <div className="bg-white/10 border border-white/10 p-4 rounded-2xl">
                <GraduationCap className="text-[#CBD9E6] mb-3" />
                <p className="font-semibold text-sm">Academic records</p>
                <p className="text-xs text-[#CBD9E6] mt-1">
                  Your information in one place
                </p>
              </div>

              <div className="bg-white/10 border border-white/10 p-4 rounded-2xl">
                <ShieldCheck className="text-[#CBD9E6] mb-3" />
                <p className="font-semibold text-sm">Secure access</p>
                <p className="text-xs text-[#CBD9E6] mt-1">
                  Role-based permissions
                </p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-[#CBD9E6]/70">
            © 2026 UnivAdmin Pro. All rights reserved.
          </p>
        </section>

        {/* Login form */}
        <section className="p-7 sm:p-12 lg:p-16 flex items-center">
          <div className="w-full max-w-md mx-auto">

            <div className="lg:hidden flex items-center gap-3 mb-10">
              <div className="w-11 h-11 rounded-xl bg-[#2F4156] text-white flex items-center justify-center">
                <GraduationCap size={25} />
              </div>
              <div>
                <h1 className="font-bold text-lg text-[#2F4156]">
                  UnivAdmin Pro
                </h1>
                <p className="text-xs text-[#567CBD]">
                  Academic Management Platform
                </p>
              </div>
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-[#567CBD]">
              Welcome back
            </span>

            <h2 className="text-3xl font-bold text-[#2F4156] mt-3">
              Sign in to your account
            </h2>

            <p className="text-sm text-[#567CBD] mt-3 mb-8">
              Enter your university credentials to continue.
            </p>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#2F4156] mb-2">
                  University email
                </label>

                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#567CBD]" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@university.edu"
                    autoComplete="email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-[#F5EFEB]/70 border border-[#CBD9E6] rounded-xl text-sm text-[#2F4156] outline-none focus:ring-2 focus:ring-[#567CBD]/30 focus:border-[#567CBD] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-semibold text-[#2F4156]">
                    Password
                  </label>
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#567CBD]" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-[#F5EFEB]/70 border border-[#CBD9E6] rounded-xl text-sm text-[#2F4156] outline-none focus:ring-2 focus:ring-[#567CBD]/30 focus:border-[#567CBD] transition"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#567CBD]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#2F4156] hover:bg-[#567CBD] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#2F4156]/15 transition"
              >
                {submitting ? 'Signing in...' : 'Sign in'}
                {!submitting && <ArrowRight size={17} />}
              </button>
            </form>

            <p className="text-sm text-center text-[#567CBD] mt-8">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#2F4156] hover:text-[#567CBD]">
                Create account
              </Link>
            </p>

            <div className="mt-8 pt-6 border-t border-[#CBD9E6] flex justify-center items-center gap-2 text-xs text-[#567CBD]">
              <ShieldCheck size={15} />
              Protected university account
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
