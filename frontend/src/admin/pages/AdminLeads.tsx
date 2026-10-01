import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import {
  LEAD_STATUSES,
  fetchLeads,
  formatLeadDate,
  formatLeadDateTime,
  isLeadStatus,
  leadEnumLabel,
  leadStatusBadgeClass,
  type Lead,
  type LeadPagination,
} from "../lib/adminApi"
import { readAdminSession } from "../lib/adminSession"
import AdminIcon from "../components/AdminIcon"
import AdminLink from "../components/AdminLink"

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

const DEFAULT_PAGE_SIZE = 20

type ListState =
  | { status: "loading" }
  | { status: "ready"; leads: Lead[]; pagination: LeadPagination }
  | { status: "error" }
  | { status: "signing-out" }

/** Reads the initial filters from the URL so views stay shareable. */
function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const status = params.get("status") ?? ""
  const rawLimit = Number(params.get("limit"))
  const rawPage = Number(params.get("page"))

  return {
    search: params.get("search") ?? "",
    status: isLeadStatus(status) ? status : "",
    limit: (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawLimit)
      ? rawLimit
      : DEFAULT_PAGE_SIZE,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  }
}

function writeFiltersToUrl(
  search: string,
  status: string,
  limit: number,
  page: number,
) {
  const params = new URLSearchParams()
  if (search.trim()) params.set("search", search.trim())
  if (status) params.set("status", status)
  if (limit !== DEFAULT_PAGE_SIZE) params.set("limit", String(limit))
  if (page > 1) params.set("page", String(page))
  const query = params.toString()
  window.history.replaceState(
    null,
    "",
    query ? `/admin/leads?${query}` : "/admin/leads",
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${leadStatusBadgeClass(
        status,
      )}`}
    >
      {leadEnumLabel(status) ?? "Unknown"}
    </span>
  )
}

export default function AdminLeads() {
  const initial = useRef(readFiltersFromUrl()).current

  const [searchInput, setSearchInput] = useState(initial.search)
  const [search, setSearch] = useState(initial.search)
  const [status, setStatus] = useState(initial.status)
  const [page, setPage] = useState(initial.page)
  const [limit, setLimit] = useState(initial.limit)
  const [state, setState] = useState<ListState>({ status: "loading" })

  // Guards against a slow earlier response overwriting a newer one.
  const requestIdRef = useRef(0)
  const requestedRef = useRef(false)

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    if (searchInput === search) return
    const timer = window.setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [searchInput, search])

  useEffect(() => {
    writeFiltersToUrl(search, status, limit, page)
  }, [search, status, limit, page])

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      const result = await fetchLeads(
        { page, limit, status, search },
        token,
      )
      if (requestId !== requestIdRef.current) return
      setState({
        status: "ready",
        leads: result.leads,
        pagination: result.pagination,
      })
    } catch (error) {
      if (requestId !== requestIdRef.current) return
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setState({ status: "error" })
    }
  }, [page, limit, status, search])

  useEffect(() => {
    if (!requestedRef.current) {
      requestedRef.current = true
    }
    void load()
  }, [load])

  const isFiltered = Boolean(search.trim() || status)
  const pagination = state.status === "ready" ? state.pagination : null

  // The backend can leave the page past the end (e.g. after deleting the last
  // row of a page), so step back rather than showing an empty table.
  useEffect(() => {
    if (!pagination || state.status !== "ready") return
    if (pagination.total === 0) return
    if (state.leads.length > 0) return
    if (page > 1) setPage(pagination.totalPages > 0 ? pagination.totalPages : 1)
  }, [pagination, state, page])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label
            htmlFor="leads-search"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Search
          </label>
          <div className="relative mt-2">
            <AdminIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="leads-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name, email or phone"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-navy outline-none transition-colors placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20 sm:w-72"
            />
            {searchInput ? (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy"
              >
                <AdminIcon name="close" className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="leads-status-filter"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Status
            </label>
            <select
              id="leads-status-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              className="mt-2 block rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/20"
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {leadEnumLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="leads-page-size"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Per page
            </label>
            <select
              id="leads-page-size"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value))
                setPage(1)
              }}
              className="mt-2 block rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/20"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {state.status === "loading" ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Loading leads</span>
          <p className="text-sm text-slate-500">Loading leads…</p>
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : null}

      {state.status === "signing-out" ? (
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
          Your session ended. Taking you to the sign-in page…
        </p>
      ) : null}

      {state.status === "error" ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <AdminIcon name="trending" className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="font-display mt-5 text-xl font-bold text-navy">
            We couldn&apos;t load your leads
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            The leads request did not complete. Your account is still signed in
            and nothing has been changed. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-6 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Try again
          </button>
        </div>
      ) : null}

      {state.status === "ready" && state.leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <AdminIcon
              name={isFiltered ? "search" : "leads"}
              className="h-6 w-6 text-slate-400"
            />
          </div>
          <h2 className="font-display mt-4 text-lg font-bold text-navy">
            {isFiltered ? "No leads match your filters" : "No leads yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            {isFiltered
              ? "Try a different search term or clear the status filter to see every quote request."
              : "Once a visitor submits the quote form on your website, their request will appear here."}
          </p>
          {isFiltered ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("")
                setSearch("")
                setStatus("")
                setPage(1)
              }}
              className="mt-6 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      {state.status === "ready" && state.leads.length > 0 ? (
        <>
          <p className="text-sm text-slate-500" role="status" aria-live="polite">
            {pagination ? (
              <>
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {(pagination.page - 1) * pagination.limit + state.leads.length} of{" "}
                {pagination.total} {pagination.total === 1 ? "lead" : "leads"}
              </>
            ) : null}
          </p>

          <ul className="space-y-3">
            {state.leads.map((lead) => {
              const moveDate = formatLeadDate(lead.moveDetails.movingDate)
              return (
                <li key={lead.id}>
                  <AdminLink
                    to={`/admin/leads/${lead.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-navy/30 hover:bg-slate-50 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display flex items-center gap-2 text-base font-bold text-navy">
                          <AdminIcon name="user" className="h-4 w-4 shrink-0 text-orange" />
                          <span className="truncate">{lead.customer.fullName}</span>
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <AdminIcon name="mail" className="h-3.5 w-3.5 text-slate-400" />
                            {lead.customer.email}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <AdminIcon name="phone" className="h-3.5 w-3.5 text-slate-400" />
                            {lead.customer.phone}
                          </span>
                        </p>
                      </div>
                      <StatusPill status={lead.status} />
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                      <p className="flex items-start gap-1.5 text-sm text-slate-600">
                        <AdminIcon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block truncate">
                            {lead.moveDetails.movingFrom}
                          </span>
                          <span className="block truncate text-slate-400">
                            to {lead.moveDetails.movingTo}
                          </span>
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-slate-600 sm:justify-end">
                        <AdminIcon name="calendar" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {moveDate ? (
                          <>Moving {moveDate}</>
                        ) : (
                          "No moving date"
                        )}
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      Received {formatLeadDateTime(lead.createdAt) ?? "—"}
                      {lead.moveDetails.moveType
                        ? ` · ${leadEnumLabel(lead.moveDetails.moveType)}`
                        : null}
                    </p>
                  </AdminLink>
                </li>
              )
            })}
          </ul>

          {pagination && pagination.totalPages > 1 ? (
            <nav
              aria-label="Leads pagination"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"
            >
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <AdminIcon name="chevronLeft" className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination.hasNextPage}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <AdminIcon name="chevronRight" className="h-4 w-4" />
                </button>
              </div>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
