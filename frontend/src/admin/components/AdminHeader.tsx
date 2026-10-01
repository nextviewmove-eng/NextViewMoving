import { useState, type ReactNode } from "react"
import { useAdminAuth } from "../lib/AdminAuthContext"
import AdminLink from "./AdminLink"

type AdminHeaderProps = {
  title: string
  subtitle?: ReactNode
  onOpenSidebar: () => void
}

function initialsFor(name: string | undefined): string {
  if (!name) return "A"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part.charAt(0)).join("")
  return (letters || "A").toUpperCase()
}

export default function AdminHeader({
  title,
  subtitle,
  onOpenSidebar,
}: AdminHeaderProps) {
  const { admin, isAuthenticated, signOut } = useAdminAuth()
  const [signingOut, setSigningOut] = useState(false)

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
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Open admin navigation"
        aria-controls="admin-sidebar"
        className="-ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy lg:hidden"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="font-display text-lg font-bold leading-tight text-navy sm:text-xl">
          {title}
        </h1>
        {subtitle ? (
          <div className="truncate text-xs text-slate-500">{subtitle}</div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isAuthenticated && admin ? (
          <>
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                {initialsFor(admin.name)}
              </span>
              <span className="leading-tight">
                <span className="block text-xs font-semibold text-navy">
                  {admin.name}
                </span>
                <span className="block text-[11px] capitalize text-slate-500">
                  {admin.role}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <>
            <span className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Not signed in
            </span>
            <AdminLink
              to="/admin/login"
              className="rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-700 sm:text-sm"
            >
              Sign in
            </AdminLink>
          </>
        )}
      </div>
    </header>
  )
}
