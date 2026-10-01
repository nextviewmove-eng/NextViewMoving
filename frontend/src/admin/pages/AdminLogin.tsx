import { useEffect, useRef, useState, type FormEvent } from "react"
import AdminLink from "../components/AdminLink"
import {
  ADMIN_DASHBOARD_PATH,
  useAdminAuth,
  type AdminSignInResult,
} from "../lib/AdminAuthContext"
import { navigate } from "../lib/adminRouter"

export default function AdminLogin() {
  const { signIn, isAuthenticated, sessionExpired, clearSessionExpiredNotice } =
    useAdminAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ADMIN_DASHBOARD_PATH, { replace: true })
    }
  }, [isAuthenticated])

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div
          className="flex flex-col items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-orange" />
          <p className="text-sm text-slate-500">
            Redirecting to your dashboard…
          </p>
          <AdminLink
            to={ADMIN_DASHBOARD_PATH}
            className="text-sm font-semibold text-navy underline underline-offset-4"
          >
            Go to dashboard
          </AdminLink>
        </div>
      </div>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // A ref guard blocks repeat submissions within the same tick, before React
    // has re-rendered the disabled button.
    if (submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const result: AdminSignInResult = await signIn(email.trim(), password)
      if (result.ok) return
      setError(result.message)
      setPassword("")
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-navy">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 9h18M9 4l6 5-6 5"
                stroke="#F05A1A"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="font-display text-sm font-bold leading-tight text-navy">
              NextViewMove
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Admin
            </p>
          </div>
        </div>
        <AdminLink
          to="/"
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy sm:text-sm"
        >
          Back to website
        </AdminLink>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="font-display text-2xl font-bold text-navy">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Admin access is limited to your team. Use your admin account to
              continue.
            </p>

            {sessionExpired ? (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                Your session has expired. Please sign in again.
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-sm font-semibold text-navy mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  disabled={submitting}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (sessionExpired) clearSessionExpiredNotice()
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-all focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/10 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-sm font-semibold text-navy mb-1.5"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  disabled={submitting}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 transition-all focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/10 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-navy py-3.5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-navy"
              >
                {submitting ? "SIGNING IN…" : "SIGN IN"}
              </button>
            </form>

            <p className="mt-6 text-xs leading-relaxed text-slate-500">
              Protected admin area. Only authorised team accounts can sign in.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
