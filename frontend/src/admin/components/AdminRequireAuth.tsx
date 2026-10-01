import { useEffect, type ReactNode } from "react"
import { ADMIN_LOGIN_PATH, useAdminAuth } from "../lib/AdminAuthContext"
import { navigate, useAdminPath } from "../lib/adminRouter"

function AdminAuthPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div
        className="flex flex-col items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-orange" />
        <p className="text-sm text-slate-500">Checking your session…</p>
      </div>
    </div>
  )
}

type AdminRequireAuthProps = {
  children: ReactNode
}

export default function AdminRequireAuth({ children }: AdminRequireAuthProps) {
  const { status, isAuthenticated } = useAdminAuth()
  const pathname = useAdminPath()

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate(ADMIN_LOGIN_PATH, { replace: true })
    }
  }, [status, pathname])

  if (status === "checking" || !isAuthenticated) {
    return <AdminAuthPending />
  }

  return <>{children}</>
}
