export const ADMIN_BASE = "/admin"

export type AdminRouteId = "dashboard" | "login" | "leads" | "leadDetail" | "followUps" | "settings" | "notFound"

export type AdminRouteMatch =
  | { id: "login"; pathname: string }
  | { id: "dashboard"; pathname: string }
  | { id: "leads"; pathname: string }
  | { id: "leadDetail"; pathname: string; leadId: string }
  | { id: "followUps"; pathname: string }
  | { id: "settings"; pathname: string }
  | { id: "notFound"; pathname: string }

export type AdminNavItem = {
  id: Exclude<AdminRouteId, "login" | "leadDetail" | "notFound">
  label: string
  to: string
  icon: string
  description: string
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/admin/dashboard",
    icon: "grid",
    description: "Overview of current moving activity",
  },
  {
    id: "leads",
    label: "Leads",
    to: "/admin/leads",
    icon: "leads",
    description: "Every quote request submitted from the website",
  },
  {
    id: "followUps",
    label: "Follow-Ups",
    to: "/admin/follow-ups",
    icon: "followups",
    description: "Track outreach and next actions for each lead",
  },
  {
    id: "settings",
    label: "Settings",
    to: "/admin/settings",
    icon: "settings",
    description: "Admin account and workspace preferences",
  },
]

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "")
  }
  return pathname
}

function readSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function matchAdminRoute(pathname: string): AdminRouteMatch {
  const path = normalize(pathname)

  if (path === ADMIN_BASE || path === `${ADMIN_BASE}/dashboard`) {
    return { id: "dashboard", pathname: path }
  }

  if (path === `${ADMIN_BASE}/login`) {
    return { id: "login", pathname: path }
  }

  if (path === `${ADMIN_BASE}/leads`) {
    return { id: "leads", pathname: path }
  }

  const leadDetailMatch = /^\/admin\/leads\/([^/]+)$/.exec(path)
  if (leadDetailMatch) {
    return {
      id: "leadDetail",
      pathname: path,
      leadId: readSegment(leadDetailMatch[1]),
    }
  }

  if (path === `${ADMIN_BASE}/follow-ups`) {
    return { id: "followUps", pathname: path }
  }

  if (path === `${ADMIN_BASE}/settings`) {
    return { id: "settings", pathname: path }
  }

  return { id: "notFound", pathname: path }
}

export function isAdminPath(pathname: string): boolean {
  const path = normalize(pathname)
  return path === ADMIN_BASE || path.startsWith(`${ADMIN_BASE}/`)
}

export function isActiveAdminPath(pathname: string, to: string): boolean {
  const path = normalize(pathname)
  if (path === to) return true
  return path.startsWith(`${to}/`)
}
