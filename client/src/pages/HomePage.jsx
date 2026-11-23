
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: 'Academic Management',
    description:
      'Access courses, grades, learning materials, and academic information in one place.',
  },
  {
    icon: CalendarDays,
    title: 'Schedules & Attendance',
    description:
      'Keep track of class schedules, attendance records, and important academic dates.',
  },
  {
    icon: Users,
    title: 'University Community',
    description:
      'Connect students, professors, and university administration through one platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Access',
    description:
      'Role-based access keeps academic information organized and protected.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#2F4156]">
      {/* Navigation */}
      <header className="border-b border-[#CBD9E6]/70 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2F4156] text-white">
              <GraduationCap size={25} />
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight text-[#2F4156]">
                UnivAdmin Pro
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#567CBD]">
                University Management System
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2F4156] transition hover:bg-[#F5EFEB]"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-[#2F4156] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#243447]"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#F5EFEB]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#CBD9E6]/60 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-white/80 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 md:grid-cols-2 md:py-28">
          {/* Hero Content */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#CBD9E6] bg-white/80 px-3.5 py-2 text-xs font-semibold text-[#567CBD]">
              <span className="h-2 w-2 rounded-full bg-[#567CBD]" />
              Your University, Connected
            </div>

            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-[#2F4156] sm:text-5xl lg:text-6xl">
              Manage your
              <span className="block text-[#567CBD]">
                academic journey
              </span>
              with ease.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-gray-600 sm:text-lg">
              A central platform for students, professors, and university
              staff to manage academic activities, access information, and
              stay connected.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F4156] px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#2F4156]/15 transition hover:-translate-y-0.5 hover:bg-[#243447]"
              >
                Access Your Account
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl border border-[#CBD9E6] bg-white px-6 py-3.5 text-sm font-semibold text-[#2F4156] transition hover:border-[#567CBD] hover:bg-[#F5F8FC]"
              >
                Create an Account
              </Link>
            </div>

            <p className="mt-5 text-xs text-gray-500">
              One platform. Multiple roles. A more connected campus.
            </p>
          </div>

          {/* Platform Preview */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2rem] bg-[#CBD9E6]/60" />

            <div className="relative overflow-hidden rounded-3xl border border-[#CBD9E6] bg-white p-6 shadow-xl shadow-[#2F4156]/10 sm:p-8">
              {/* Preview Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                <div>
                  <p className="text-sm font-bold text-[#2F4156]">
                    University Portal
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Your Academic Workspace
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CBD9E6]/50 text-[#567CBD]">
                  <GraduationCap size={24} />
                </div>
              </div>

              {/* Feature Tiles */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F5F8FC] p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#567CBD] shadow-sm">
                    <BookOpen size={18} />
                  </div>
                  <p className="text-sm font-semibold text-[#2F4156]">
                    Courses
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Academic Resources
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F5EFEB] p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#567CBD] shadow-sm">
                    <CalendarDays size={18} />
                  </div>
                  <p className="text-sm font-semibold text-[#2F4156]">
                    Schedule
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Classes and Events
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F5F8FC] p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#567CBD] shadow-sm">
                    <Users size={18} />
                  </div>
                  <p className="text-sm font-semibold text-[#2F4156]">
                    Community
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Students and Staff
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F5EFEB] p-4">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#567CBD] shadow-sm">
                    <ShieldCheck size={18} />
                  </div>
                  <p className="text-sm font-semibold text-[#2F4156]">
                    Secure Portal
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Protected Access
                  </p>
                </div>
              </div>

              {/* Bottom Banner */}
              <div className="mt-5 rounded-2xl bg-[#2F4156] p-5 text-white">
                <p className="text-xs font-medium text-white/70">
                  Everything in One Place
                </p>
                <p className="mt-1 text-lg font-bold">
                  Focus on What Matters.
                </p>
                <p className="mt-1 text-xs leading-5 text-white/70">
                  Your academic tools and information, accessible through
                  one university platform.
                </p>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-[#CBD9E6] bg-white px-4 py-3 shadow-lg sm:block">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F8FC] text-[#567CBD]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <p className="text-xs font-bold text-[#2F4156]">
                    Secure Platform
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Role-Based Access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[#CBD9E6]/50 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#567CBD]">
              One Connected Platform
            </p>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#2F4156] sm:text-3xl">
              Everything You Need for University Life
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Access the tools and information you need throughout your
              academic experience.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[#CBD9E6]/70 bg-white p-6 transition hover:-translate-y-1 hover:border-[#567CBD]/40 hover:shadow-lg hover:shadow-[#2F4156]/5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F5F8FC] text-[#567CBD]">
                    <Icon size={21} />
                  </div>

                  <h3 className="mt-5 font-bold text-[#2F4156]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-[#2F4156] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to access your university portal?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/70">
            Sign in to access your academic information and university
            services.
          </p>

          <Link
            to="/login"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#2F4156] transition hover:bg-[#CBD9E6]"
          >
            Get Started
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#CBD9E6]/60 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
          <p className="text-sm font-bold text-[#2F4156]">
            UnivAdmin Pro
          </p>

          <p className="text-xs text-gray-500">
            University Management Platform
          </p>

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} UnivAdmin Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
