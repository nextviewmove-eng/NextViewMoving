import type { ReactNode } from "react"
import AdminIcon, { type AdminIconName } from "./AdminIcon"

type AdminPlaceholderProps = {
  icon: AdminIconName
  title: string
  description: string
  phase: string
  children?: ReactNode
}

export default function AdminPlaceholder({
  icon,
  title,
  description,
  phase,
  children,
}: AdminPlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy">
          <AdminIcon name={icon} className="h-6 w-6 text-orange" />
        </div>

        <h2 className="font-display mt-5 text-xl font-bold text-navy">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {phase}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Structure only. No data is requested and nothing is saved yet.
          </p>
        </div>

        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  )
}
