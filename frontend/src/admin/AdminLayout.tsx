import { useState, type ReactNode } from "react"
import AdminHeader from "./components/AdminHeader"
import AdminSidebar from "./components/AdminSidebar"
import { useAdminPath } from "./lib/adminRouter"

type AdminLayoutProps = {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}

export default function AdminLayout({
  title,
  subtitle,
  children,
}: AdminLayoutProps) {
  const pathname = useAdminPath()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <AdminSidebar
        pathname={pathname}
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <main id="admin-content" className="px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
