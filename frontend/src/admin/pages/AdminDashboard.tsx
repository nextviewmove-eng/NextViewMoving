import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import AdminIcon, { type AdminIconName } from "../components/AdminIcon"
import {
  fetchDashboardStatistics,
  type DashboardStatistics,
} from "../lib/adminApi"
import { readAdminSession } from "../lib/adminSession"

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; statistics: DashboardStatistics }
  | { status: "error" }
  | { status: "signing-out" }

const PIPELINE_STAGES: Array<{
  key: keyof Pick<
    DashboardStatistics,
    "NEW" | "CONTACTED" | "QUOTE_SENT" | "BOOKED" | "COMPLETED"
  >
  label: string
  icon: AdminIconName
  accent: string
}> = [
  { key: "NEW", label: "New", icon: "sparkle", accent: "text-orange" },
  { key: "CONTACTED", label: "Contacted", icon: "phone", accent: "text-sky-600" },
  {
    key: "QUOTE_SENT",
    label: "Quote Sent",
    icon: "mail",
    accent: "text-indigo-600",
  },
  { key: "BOOKED", label: "Booked", icon: "calendarCheck", accent: "text-navy" },
  {
    key: "COMPLETED",
    label: "Completed",
    icon: "checkCircle",
    accent: "text-emerald-600",
  },
]

function formatCount(value: number): string {
  return value.toLocaleString("en-CA")
}

function percentage(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function SkeletonCard({ featured }: { featured?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        featured ? "border-navy bg-navy" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`h-3 w-24 animate-pulse rounded ${
            featured ? "bg-white/25" : "bg-slate-200"
          }`}
        />
        <div
          className={`h-9 w-9 animate-pulse rounded-xl ${
            featured ? "bg-white/20" : "bg-slate-100"
          }`}
        />
      </div>
      <div
        className={`mt-4 h-8 w-16 animate-pulse rounded ${
          featured ? "bg-white/30" : "bg-slate-200"
        }`}
      />
      <div
        className={`mt-2 h-3 w-28 animate-pulse rounded ${
          featured ? "bg-white/15" : "bg-slate-100"
        }`}
      />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard statistics</span>

      <section aria-labelledby="dashboard-loading-heading">
        <h2
          id="dashboard-loading-heading"
          className="font-display text-sm font-bold uppercase tracking-wider text-slate-500"
        >
          Overview
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard featured />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>

      <section aria-labelledby="dashboard-loading-pipeline" className="mt-8">
        <h2
          id="dashboard-loading-pipeline"
          className="font-display text-sm font-bold uppercase tracking-wider text-slate-500"
        >
          Pipeline
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </div>
  )
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
        <AdminIcon name="trending" className="h-6 w-6 text-red-600" />
      </div>
      <h2 className="font-display mt-5 text-xl font-bold text-navy">
        We couldn&apos;t load your dashboard
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
        The statistics request did not complete. Your account is still signed in
        and nothing has been changed. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
        <AdminIcon name="leads" className="h-6 w-6 text-slate-400" />
      </div>
      <h2 className="font-display mt-4 text-lg font-bold text-navy">
        No quote requests yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        Once a visitor submits the quote form on your website, new requests will
        appear here and your totals will start filling in.
      </p>
    </div>
  )
}

export default function AdminDashboard() {
  const [state, setState] = useState<DashboardState>({ status: "loading" })
  const requestedRef = useRef(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      const statistics = await fetchDashboardStatistics(token)
      setState({ status: "ready", statistics })
    } catch (error) {
      // A 401 is already handled by the Phase 2 unauthorized handler, which
      // clears the session and redirects to the login page. Avoid flashing an
      // error state on the way out.
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setState({ status: "error" })
    }
  }, [])

  useEffect(() => {
    // One request per dashboard visit. The ref keeps React's development
    // double-effect invocation from firing the same request twice, and a fresh
    // mount (new page visit) always requests again.
    if (requestedRef.current) return
    requestedRef.current = true
    void load()
  }, [load])

  if (state.status === "loading") {
    return <DashboardSkeleton />
  }

  if (state.status === "signing-out") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        <p className="text-sm text-slate-600">
          Your session ended. Taking you to the sign-in page…
        </p>
      </div>
    )
  }

  if (state.status === "error") {
    return <DashboardError onRetry={load} />
  }

  const { statistics } = state
  const hasLeads = statistics.total > 0

  return (
    <div className="space-y-8">
      {!hasLeads ? <EmptyState /> : null}

      <section aria-labelledby="dashboard-overview-heading">
        <h2
          id="dashboard-overview-heading"
          className="font-display text-sm font-bold uppercase tracking-wider text-slate-500"
        >
          Overview
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-navy bg-navy p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white/70">Total Leads</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <AdminIcon name="leads" className="h-5 w-5 text-orange" />
              </span>
            </div>
            <p className="font-display mt-4 text-3xl font-bold text-white">
              {formatCount(statistics.total)}
            </p>
            <p className="mt-1 text-xs text-white/60">
              All time quote requests
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">New Today</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange/10">
                <AdminIcon name="sparkle" className="h-5 w-5 text-orange" />
              </span>
            </div>
            <p className="font-display mt-4 text-3xl font-bold text-navy">
              {formatCount(statistics.createdToday)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Received since midnight</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">This Week</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                <AdminIcon name="clock" className="h-5 w-5 text-sky-600" />
              </span>
            </div>
            <p className="font-display mt-4 text-3xl font-bold text-navy">
              {formatCount(statistics.createdThisWeek)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Since Monday</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-500">This Month</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                <AdminIcon name="calendar" className="h-5 w-5 text-indigo-600" />
              </span>
            </div>
            <p className="font-display mt-4 text-3xl font-bold text-navy">
              {formatCount(statistics.createdThisMonth)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Since the 1st</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-pipeline-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="dashboard-pipeline-heading"
            className="font-display text-sm font-bold uppercase tracking-wider text-slate-500"
          >
            Pipeline
          </h2>
          <p className="text-xs text-slate-500">
            Share of all {formatCount(statistics.total)} leads
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {PIPELINE_STAGES.map((stage) => {
            const count = statistics[stage.key]
            const share = percentage(count, statistics.total)

            return (
              <div
                key={stage.key}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-500">
                    {stage.label}
                  </p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50">
                    <AdminIcon name={stage.icon} className={`h-5 w-5 ${stage.accent}`} />
                  </span>
                </div>

                <p className="font-display mt-4 text-2xl font-bold text-navy">
                  {formatCount(count)}
                </p>

                <div
                  className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={`${stage.label}: ${formatCount(count)} of ${formatCount(
                    statistics.total,
                  )} leads`}
                  aria-valuenow={share}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={`${share} percent`}
                >
                  <div
                    className="h-full rounded-full bg-orange transition-[width] duration-500"
                    style={{ width: `${share}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">{share}% of leads</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
