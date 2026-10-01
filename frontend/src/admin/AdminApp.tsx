import { useEffect, type ReactNode } from "react"
import AdminLayout from "./AdminLayout"
import AdminLink from "./components/AdminLink"
import AdminRequireAuth from "./components/AdminRequireAuth"
import { ADMIN_BASE, matchAdminRoute, type AdminRouteId } from "./adminRoutes"
import {
  ADMIN_DASHBOARD_PATH,
  AdminAuthProvider,
  useAdminAuth,
} from "./lib/AdminAuthContext"
import { navigate, useAdminPath } from "./lib/adminRouter"
import AdminLogin from "./pages/AdminLogin"
import AdminDashboard from "./pages/AdminDashboard"
import AdminLeads from "./pages/AdminLeads"
import AdminLeadDetail from "./pages/AdminLeadDetail"
import AdminFollowUps from "./pages/AdminFollowUps"
import AdminSettings from "./pages/AdminSettings"

const ROUTE_META: Record<Exclude<AdminRouteId, "login" | "notFound">, {
  title: string
  subtitle: string
}> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Overview of current moving activity",
  },
  leads: { title: "Leads", subtitle: "Quote requests from the public website" },
  leadDetail: { title: "Lead details", subtitle: "A single lead in full" },
  followUps: {
    title: "Follow-Ups",
    subtitle: "Outstanding outreach and next actions",
  },
  settings: {
    title: "Settings",
    subtitle: "Admin accounts and workspace preferences",
  },
}

function AdminNotFound({ pathname }: { pathname: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange">
          404
        </p>
        <h2 className="font-display mt-2 text-xl font-bold text-navy">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          There is no admin page at{" "}
          <span className="font-mono text-navy">{pathname}</span>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <AdminLink
            to="/admin/dashboard"
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Go to dashboard
          </AdminLink>
          <AdminLink
            to="/admin/login"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy"
          >
            Sign in
          </AdminLink>
        </div>
      </div>
    </div>
  )
}

function withLayout(
  routeId: Exclude<AdminRouteId, "login" | "notFound">,
  children: ReactNode,
) {
  const meta = ROUTE_META[routeId]
  return (
    <AdminLayout title={meta.title} subtitle={meta.subtitle}>
      {children}
    </AdminLayout>
  )
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminRoutes />
    </AdminAuthProvider>
  )
}

function AdminRoutes() {
  const pathname = useAdminPath()
  const route = matchAdminRoute(pathname)

  useEffect(() => {
    if (pathname === ADMIN_BASE) {
      navigate(ADMIN_DASHBOARD_PATH, { replace: true })
    }
  }, [pathname])

  if (route.id === "login") {
    return <AdminLogin />
  }

  return <AdminRequireAuth>{renderProtectedRoute(route)}</AdminRequireAuth>
}

function renderProtectedRoute(
  route: ReturnType<typeof matchAdminRoute>,
): ReactNode {
  if (route.id === "notFound") {
    return (
      <AdminLayout title="Not found" subtitle="This admin page does not exist">
        <AdminNotFound pathname={route.pathname} />
      </AdminLayout>
    )
  }

  if (route.id === "leadDetail") {
    return withLayout("leadDetail", <AdminLeadDetail leadId={route.leadId} />)
  }

  switch (route.id) {
    case "dashboard":
      return withLayout("dashboard", <AdminDashboard />)
    case "leads":
      return withLayout("leads", <AdminLeads />)
    case "followUps":
      return withLayout("followUps", <AdminFollowUps />)
    case "settings":
      return withLayout("settings", <AdminSettings />)
    default:
      return null
  }
}
