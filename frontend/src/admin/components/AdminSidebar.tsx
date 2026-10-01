import { ADMIN_NAV_ITEMS, isActiveAdminPath } from "../adminRoutes"
import { useAdminAuth } from "../lib/AdminAuthContext"
import AdminIcon from "./AdminIcon"
import AdminLink from "./AdminLink"

function initialsFor(name: string | undefined): string {
  if (!name) return "A"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part.charAt(0)).join("")
  return (letters || "A").toUpperCase()
}

type AdminSidebarProps = {
  pathname: string
  open: boolean
  onNavigate: () => void
}

export default function AdminSidebar({
  pathname,
  open,
  onNavigate,
}: AdminSidebarProps) {
  const { admin } = useAdminAuth()
  const initials = initialsFor(admin?.name)
  return (
    <>
      <div
        onClick={onNavigate}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/60 transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-5">
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
          <div className="min-w-0">
            <p className="font-display text-sm font-bold leading-tight text-navy">
              NextViewMove
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Admin
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          <ul className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = isActiveAdminPath(pathname, item.to)
              return (
                <li key={item.id}>
                  <AdminLink
                    to={item.to}
                    onNavigate={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-navy text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-navy"
                    }`}
                  >
                    <AdminIcon
                      name={
                        item.icon as "grid" | "leads" | "followups" | "settings"
                      }
                      className={`h-5 w-5 shrink-0 ${
                        active ? "text-orange" : "text-slate-400"
                      }`}
                    />
                    {item.label}
                  </AdminLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-3">
          {admin ? (
            <div className="mb-2 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                {initials}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-xs font-semibold text-navy">
                  {admin.name}
                </span>
                <span className="block truncate text-[11px] capitalize text-slate-500">
                  {admin.role}
                </span>
              </span>
            </div>
          ) : null}
          <AdminLink
            to="/"
            onNavigate={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy"
          >
            <AdminIcon
              name="external"
              className="h-5 w-5 shrink-0 text-slate-400"
            />
            View public website
          </AdminLink>
        </div>
      </aside>
    </>
  )
}
