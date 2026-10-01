import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import { fetchAdminProfile, leadEnumLabel } from "../lib/adminApi"
import { readAdminSession, type AdminUser } from "../lib/adminSession"
import { useAdminAuth } from "../lib/AdminAuthContext"
import AdminIcon from "../components/AdminIcon"

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; admin: AdminUser }
  | { status: "error" }
  | { status: "signing-out" }

type DetailRowProps = {
  label: string
  value: string
  icon: "user" | "mail" | "settings" | "checkCircle"
  /** Marks the value as maintained outside the admin UI. */
  readOnly?: boolean
}

function DetailRow({ label, value, icon, readOnly }: DetailRowProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 py-4 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <AdminIcon name={icon} className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-right">
        <span className="break-words text-sm font-semibold text-navy">
          {value}
        </span>
        {readOnly ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            Read-only
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const { signOut } = useAdminAuth()
  const [state, setState] = useState<ProfileState>({ status: "loading" })
  const [signingOut, setSigningOut] = useState(false)
  const requestedRef = useRef(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      setState({ status: "ready", admin: await fetchAdminProfile(token) })
    } catch (error) {
      // A 401 is already handled globally by the unauthorized handler, which
      // clears the session and redirects to sign-in.
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setState({ status: "error" })
    }
  }, [])

  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    void load()
  }, [load])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-5">
      <section
        aria-labelledby="settings-profile-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2
          id="settings-profile-heading"
          className="font-display flex items-center gap-2 text-base font-bold text-navy"
        >
          <AdminIcon name="user" className="h-5 w-5 text-orange" />
          Admin profile
        </h2>

        {state.status === "loading" ? (
          <div role="status" aria-live="polite" className="mt-4 space-y-3">
            <span className="sr-only">Loading your profile</span>
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : null}

        {state.status === "signing-out" ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 text-sm text-slate-600"
          >
            Your session ended. Taking you to the sign-in page…
          </p>
        ) : null}

        {state.status === "error" ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm font-semibold text-red-800">
              We couldn&apos;t load your profile
            </p>
            <p className="mt-1 text-sm text-red-700">
              Nothing has been changed. Please try again.
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        ) : null}

        {state.status === "ready" ? (
          <>
            <p className="mt-1 text-sm text-slate-600">
              These are the account details your admin session is signed in
              with.
            </p>
            <div className="mt-4">
              <DetailRow
                label="Full name"
                icon="user"
                value={state.admin.name}
              />
              <DetailRow
                label="Email"
                icon="mail"
                value={state.admin.email}
              />
              <DetailRow
                label="Role"
                icon="settings"
                value={leadEnumLabel(state.admin.role) ?? state.admin.role}
                readOnly
              />
              <DetailRow
                label="Account status"
                icon="checkCircle"
                value={state.admin.isActive === false ? "Inactive" : "Active"}
              />
            </div>
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
              Name, email, and role are managed on the server. This admin area
              has no profile update endpoint, so there is nothing to save here.
            </p>
          </>
        ) : null}
      </section>

      <section
        aria-labelledby="settings-account-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2
          id="settings-account-heading"
          className="font-display flex items-center gap-2 text-base font-bold text-navy"
        >
          <AdminIcon name="settings" className="h-5 w-5 text-orange" />
          Account
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Sign out of this admin session on the current device.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </section>
    </div>
  )
}
