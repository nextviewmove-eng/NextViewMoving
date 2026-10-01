import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import {
  createLeadFollowUp,
  deleteLeadFollowUp,
  fetchAllFollowUps,
  fetchLeads,
  formatLeadDateTime,
  leadActorName,
  leadEnumLabel,
  leadStatusBadgeClass,
  updateLeadFollowUp,
  type Lead,
  type ScheduledFollowUp,
} from "../lib/adminApi"
import { readAdminSession } from "../lib/adminSession"
import AdminIcon from "../components/AdminIcon"
import AdminLink from "../components/AdminLink"

/** Mirrors the backend `maxlength: 5000` rule on `FollowUp.note`. */
const FOLLOW_UP_NOTE_MAX_LENGTH = 5000

/** `getDay()` is 0-based from Sunday, so the grid starts on Sunday. */
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** A fixed 6-row grid keeps the calendar height stable between months. */
const WEEKS_IN_GRID = 6

const MAX_VISIBLE_DOTS = 3

type CalendarState =
  | { status: "loading" }
  | { status: "ready"; followUps: ScheduledFollowUp[] }
  | { status: "error" }
  | { status: "signing-out" }

/** The lead picker is optional, so it tracks its own failure separately. */
type LeadsState =
  | { status: "loading" }
  | { status: "ready"; leads: Lead[] }
  | { status: "unavailable" }

type FollowUpFilter = "all" | "pending" | "completed"

type CalendarDay = {
  key: string
  dayNumber: number
  inMonth: boolean
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

/**
 * Local `YYYY-MM-DD`.
 *
 * `dueAt` is a real instant, but the lead form schedules it from a
 * date-only input (`new Date("2026-12-26T00:00:00").toISOString()`). Bucketing
 * on the UTC date would therefore drift a day in every timezone east of UTC,
 * so the calendar groups on the same local day the admin picked — which is
 * also what `formatLeadDate` displays on the lead page.
 */
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function todayKey(): string {
  return localDateKey(new Date())
}

/** `null` when the backend returned an unusable timestamp. */
function followUpDayKey(followUp: ScheduledFollowUp): string | null {
  if (!followUp.dueAt) return null
  const due = new Date(followUp.dueAt)
  if (Number.isNaN(due.getTime())) return null
  return localDateKey(due)
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  })
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate()
}

function matchesFilter(
  followUp: ScheduledFollowUp,
  filter: FollowUpFilter,
): boolean {
  if (filter === "all") return true
  if (filter === "pending") return !followUp.completed
  return followUp.completed
}

/** The backend caps `limit` at 100, so the picker is filled page by page. */
const LEADS_PAGE_SIZE = 100

/**
 * Loads every lead for the scheduling picker using the existing, paginated
 * `GET /api/leads` contract. Deriving the picker from the loaded follow-ups
 * instead would hide a lead as soon as its last follow-up was deleted, so the
 * real lead list is the only correct source here.
 */
async function loadAllLeads(token: string): Promise<Lead[]> {
  const collected: Lead[] = []
  for (let page = 1; ; page += 1) {
    const result = await fetchLeads(
      { page, limit: LEADS_PAGE_SIZE, status: "", search: "" },
      token,
    )
    collected.push(...result.leads)
    // An empty page ends the walk even if `total` disagrees.
    if (result.leads.length === 0) break
    if (collected.length >= result.pagination.total) break
  }
  return collected
}

/** Reads the current token at the moment an action runs. */
function requireToken(): string {
  const token = readAdminSession()?.token
  if (!token) throw new Error("No admin session")
  return token
}

export default function AdminFollowUps() {
  const [state, setState] = useState<CalendarState>({ status: "loading" })
  const [filter, setFilter] = useState<FollowUpFilter>("all")

  const today = todayKey()
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())

  const [busyId, setBusyId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [moveDate, setMoveDate] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [newLeadId, setNewLeadId] = useState("")
  const [newNote, setNewNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [leadsState, setLeadsState] = useState<LeadsState>({ status: "loading" })

  const requestedRef = useRef(false)
  const leadsRequestedRef = useRef(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      setState({ status: "ready", followUps: await fetchAllFollowUps(token) })
    } catch (error) {
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

  // The lead list only backs the optional picker, so a failure here must not
  // take down the calendar itself. The ref guard alone prevents the duplicate
  // StrictMode request; an "is still mounted" flag would suppress the result of
  // the first run and strand the picker on "Loading leads…" forever.
  useEffect(() => {
    if (leadsRequestedRef.current) return
    leadsRequestedRef.current = true

    const token = readAdminSession()?.token
    if (!token) {
      setLeadsState({ status: "unavailable" })
      return
    }

    void loadAllLeads(token)
      .then((leads) => setLeadsState({ status: "ready", leads }))
      .catch(() => setLeadsState({ status: "unavailable" }))
  }, [])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const allFollowUps = state.status === "ready" ? state.followUps : []

  const pickerLeads = useMemo(
    () =>
      leadsState.status === "ready"
        ? [...leadsState.leads].sort((a, b) =>
            a.customer.fullName.localeCompare(b.customer.fullName),
          )
        : [],
    [leadsState],
  )

  const visibleFollowUps = useMemo(
    () => allFollowUps.filter((followUp) => matchesFilter(followUp, filter)),
    [allFollowUps, filter],
  )

  const byDay = useMemo(() => {
    const grouped = new Map<string, ScheduledFollowUp[]>()
    for (const followUp of visibleFollowUps) {
      const key = followUpDayKey(followUp)
      if (!key) continue
      const existing = grouped.get(key)
      if (existing) {
        existing.push(followUp)
      } else {
        grouped.set(key, [followUp])
      }
    }
    // ISO 8601 strings sort chronologically as plain text.
    for (const items of grouped.values()) {
      items.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    }
    return grouped
  }, [visibleFollowUps])

  const weeks = useMemo<CalendarDay[][]>(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    // Rewind to the Sunday on or before the 1st.
    const gridStart = new Date(
      viewYear,
      viewMonth,
      1 - firstOfMonth.getDay(),
    )
    const rows: CalendarDay[][] = []
    for (let week = 0; week < WEEKS_IN_GRID; week += 1) {
      const row: CalendarDay[] = []
      for (let day = 0; day < 7; day += 1) {
        const date = new Date(
          gridStart.getFullYear(),
          gridStart.getMonth(),
          gridStart.getDate() + week * 7 + day,
        )
        row.push({
          key: localDateKey(date),
          dayNumber: date.getDate(),
          inMonth: date.getMonth() === viewMonth,
        })
      }
      rows.push(row)
    }
    return rows
  }, [viewYear, viewMonth])

  const selectedFollowUps = byDay.get(selectedDate) ?? []

  const pendingTotal = allFollowUps.filter((item) => !item.completed).length

  /** Moves the visible month and keeps the selected day in sync with it. */
  const shiftMonth = (delta: number) => {
    const target = new Date(viewYear, viewMonth + delta, 1)
    const year = target.getFullYear()
    const month = target.getMonth()
    const day = Math.min(
      Number(selectedDate.slice(8, 10)),
      daysInMonth(year, month),
    )
    setViewYear(year)
    setViewMonth(month)
    setSelectedDate(localDateKey(new Date(year, month, day)))
  }

  const goToToday = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setSelectedDate(todayKey())
  }

  const runAction = async (
    followUp: ScheduledFollowUp,
    action: () => Promise<void>,
    successMessageText: string,
  ) => {
    if (busyId || !followUp.leadId) return

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setBusyId(followUp.id)
    setActionError(null)
    try {
      await action()
      setSuccessMessage(successMessageText)
      setMovingId(null)
      await load()
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setActionError("We couldn't update that follow-up. Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    if (!newLeadId) {
      setFormError("Choose a lead for this follow-up.")
      return
    }
    if (newNote.trim().length > FOLLOW_UP_NOTE_MAX_LENGTH) {
      setFormError(
        `Follow-up notes are limited to ${FOLLOW_UP_NOTE_MAX_LENGTH} characters.`,
      )
      return
    }

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      // Same payload the lead-level form sends: a local-midnight instant.
      await createLeadFollowUp(
        newLeadId,
        {
          dueAt: new Date(`${selectedDate}T00:00:00`).toISOString(),
          note: newNote.trim(),
        },
        token,
      )
      setNewNote("")
      setSuccessMessage("Follow-up scheduled")
      await load()
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setFormError("We couldn't save that follow-up. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const isReady = state.status === "ready"

  return (
    <div className="space-y-5">
      {state.status === "loading" ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Loading follow-ups</span>
          <p className="text-sm text-slate-500">Loading follow-ups…</p>
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : null}

      {state.status === "signing-out" ? (
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
          Your session ended. Taking you to the sign-in page…
        </p>
      ) : null}

      {state.status === "error" ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <AdminIcon name="trending" className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="font-display mt-5 text-xl font-bold text-navy">
            We couldn&apos;t load your follow-ups
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            The follow-ups request did not complete. Your account is still
            signed in and nothing has been changed. Please try again.
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

      {isReady && allFollowUps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <AdminIcon name="calendar" className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="font-display mt-4 text-lg font-bold text-navy">
            No follow-ups scheduled yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Open a lead and schedule a follow-up from its Follow-ups section, and
            it will appear on this calendar.
          </p>
          <AdminLink
            to="/admin/leads"
            className="mt-6 inline-block rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy"
          >
            Go to leads
          </AdminLink>
        </div>
      ) : null}

      {isReady && allFollowUps.length > 0 ? (
        <>
          <div aria-live="polite" className="sr-only">
            {successMessage ?? ""}
          </div>

          {actionError ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy"
              >
                <AdminIcon name="chevronLeft" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy"
              >
                <AdminIcon name="chevronRight" className="h-4 w-4" />
              </button>
              <p
                aria-live="polite"
                className="font-display ml-1 text-base font-bold text-navy sm:text-lg"
              >
                {formatMonthLabel(viewYear, viewMonth)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goToToday}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy"
              >
                Today
              </button>
              <div>
                <label htmlFor="follow-up-filter" className="sr-only">
                  Filter follow-ups by status
                </label>
                <select
                  id="follow-up-filter"
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as FollowUpFilter)
                  }
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/20"
                >
                  <option value="all">All follow-ups</option>
                  <option value="pending">Pending only</option>
                  <option value="completed">Completed only</option>
                </select>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            {visibleFollowUps.length} of {allFollowUps.length} shown
            {pendingTotal > 0 ? ` · ${pendingTotal} pending` : null}
          </p>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section
              aria-label="Month calendar"
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
            >
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label) => (
                  <p
                    key={label}
                    className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {label.charAt(0)}
                    <span className="hidden sm:inline">{label.slice(1)}</span>
                  </p>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((day) => {
                  const items = byDay.get(day.key) ?? []
                  const isSelected = day.key === selectedDate
                  const isToday = day.key === today

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedDate(day.key)}
                      aria-current={isSelected ? "date" : undefined}
                      aria-label={`${formatLongDate(dateFromKey(day.key))}, ${
                        items.length
                      } follow-up${items.length === 1 ? "" : "s"}`}
                      className={`flex min-h-[3.25rem] flex-col items-start gap-1 rounded-lg border p-1 text-left transition-colors sm:min-h-[5.5rem] sm:p-1.5 ${
                        isSelected
                          ? "border-navy bg-navy text-white"
                          : isToday
                            ? "border-orange bg-orange-100/50 text-navy"
                            : "border-transparent text-navy hover:bg-slate-50"
                      } ${day.inMonth ? "" : "opacity-40"}`}
                    >
                      <span
                        className={`text-xs font-semibold sm:text-sm ${
                          isSelected
                            ? "text-white"
                            : isToday
                              ? "text-orange"
                              : "text-slate-600"
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {items.length > 0 ? (
                        <span className="flex flex-wrap items-center gap-1">
                          {items
                            .slice(0, MAX_VISIBLE_DOTS)
                            .map((item) => (
                              <span
                                key={item.id}
                                className={`h-1.5 w-1.5 rounded-full ${
                                  item.completed ? "bg-emerald-500" : "bg-orange"
                                }`}
                              />
                            ))}
                          {items.length > MAX_VISIBLE_DOTS ? (
                            <span
                              className={`text-[10px] font-semibold ${
                                isSelected ? "text-white/80" : "text-slate-500"
                              }`}
                            >
                              +{items.length - MAX_VISIBLE_DOTS}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>

            <section
              aria-label="Selected day"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <h2 className="font-display text-base font-bold text-navy">
                {formatLongDate(dateFromKey(selectedDate))}
              </h2>

              {selectedFollowUps.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No follow-ups scheduled for this day.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {selectedFollowUps.map((followUp) => (
                    <FollowUpRow
                      key={followUp.id}
                      followUp={followUp}
                      busy={busyId === followUp.id}
                      disabled={busyId !== null || !followUp.leadId}
                      moving={movingId === followUp.id}
                      moveDate={moveDate}
                      onMoveDateChange={setMoveDate}
                      onStartMove={() => {
                        setMovingId(followUp.id)
                        setMoveDate(followUpDayKey(followUp) ?? selectedDate)
                      }}
                      onCancelMove={() => setMovingId(null)}
                      onSaveMove={() =>
                        void runAction(
                          followUp,
                          () =>
                            updateLeadFollowUp(
                              followUp.leadId,
                              followUp.id,
                              {
                                dueAt: new Date(
                                  `${moveDate}T00:00:00`,
                                ).toISOString(),
                              },
                              requireToken(),
                            ),
                          "Follow-up rescheduled",
                        )
                      }
                      onToggle={() =>
                        void runAction(
                          followUp,
                          () =>
                            updateLeadFollowUp(
                              followUp.leadId,
                              followUp.id,
                              { completed: !followUp.completed },
                              requireToken(),
                            ),
                          followUp.completed
                            ? "Follow-up reopened"
                            : "Follow-up completed",
                        )
                      }
                      onDelete={() =>
                        void runAction(
                          followUp,
                          () =>
                            deleteLeadFollowUp(
                              followUp.leadId,
                              followUp.id,
                              requireToken(),
                            ),
                          "Follow-up deleted",
                        )
                      }
                    />
                  ))}
                </ul>
              )}

              <form
                onSubmit={handleCreate}
                className="mt-5 border-t border-slate-200 pt-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Schedule a follow-up
                </p>

                {leadsState.status === "loading" ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Loading leads…
                  </p>
                ) : null}

                {leadsState.status === "unavailable" ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Open a lead to schedule a follow-up for it.
                  </p>
                ) : null}

                {leadsState.status === "ready" && pickerLeads.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Open a lead to schedule a follow-up for it.
                  </p>
                ) : null}

                {leadsState.status === "ready" && pickerLeads.length > 0 ? (
                  <>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatLongDate(dateFromKey(selectedDate))}
                    </p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label
                          htmlFor="follow-up-lead"
                          className="block text-xs font-medium text-slate-600"
                        >
                          Lead
                        </label>
                        <select
                          id="follow-up-lead"
                          value={newLeadId}
                          onChange={(event) => setNewLeadId(event.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/20"
                        >
                          <option value="">Choose a lead…</option>
                          {pickerLeads.map((lead) => (
                            <option key={lead.id} value={lead.id}>
                              {lead.customer.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="follow-up-note"
                          className="block text-xs font-medium text-slate-600"
                        >
                          Note <span className="text-slate-400">(optional)</span>
                        </label>
                        <input
                          id="follow-up-note"
                          type="text"
                          value={newNote}
                          onChange={(event) => setNewNote(event.target.value)}
                          maxLength={FOLLOW_UP_NOTE_MAX_LENGTH}
                          placeholder="Send the quote and confirm the moving date"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-navy outline-none transition-colors placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? "Scheduling…" : "Schedule follow-up"}
                      </button>
                    </div>
                    {formError ? (
                      <p
                        role="alert"
                        className="mt-2 text-sm font-medium text-red-700"
                      >
                        {formError}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </form>
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}

type FollowUpRowProps = {
  followUp: ScheduledFollowUp
  busy: boolean
  disabled: boolean
  moving: boolean
  moveDate: string
  onMoveDateChange: (value: string) => void
  onStartMove: () => void
  onCancelMove: () => void
  onSaveMove: () => void
  onToggle: () => void
  onDelete: () => void
}

function FollowUpRow({
  followUp,
  busy,
  disabled,
  moving,
  moveDate,
  onMoveDateChange,
  onStartMove,
  onCancelMove,
  onSaveMove,
  onToggle,
  onDelete,
}: FollowUpRowProps) {
  const dueLabel = formatLeadDateTime(followUp.dueAt)
  const completed = followUp.completed
  const name = followUp.customerName || "Unnamed lead"

  return (
    <li
      className={`rounded-xl border p-3 ${
        completed
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-navy">
            {followUp.leadId ? (
              <AdminLink
                to={`/admin/leads/${followUp.leadId}`}
                className="truncate underline-offset-2 hover:underline"
              >
                {name}
              </AdminLink>
            ) : (
              <span className="truncate text-slate-500">{name}</span>
            )}
            {followUp.leadStatus ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${leadStatusBadgeClass(
                  followUp.leadStatus,
                )}`}
              >
                {leadEnumLabel(followUp.leadStatus) ?? "Unknown"}
              </span>
            ) : null}
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <AdminIcon name="clock" className="h-3.5 w-3.5 shrink-0" />
            {dueLabel ?? "No due date"}
            {completed ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                Completed
              </span>
            ) : null}
          </p>

          {followUp.note ? (
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {followUp.note}
            </p>
          ) : null}

          <p className="mt-1.5 text-xs text-slate-500">
            {leadActorName(followUp.createdBy)}
          </p>
        </div>
      </div>

      {moving ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <label
            htmlFor={`move-follow-up-${followUp.id}`}
            className="block text-xs font-medium text-slate-600"
          >
            New due date
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              id={`move-follow-up-${followUp.id}`}
              type="date"
              value={moveDate}
              onChange={(event) => onMoveDateChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/20"
            />
            <button
              type="button"
              onClick={onSaveMove}
              disabled={disabled || !moveDate}
              className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancelMove}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Working…" : completed ? "Reopen" : "Mark done"}
          </button>
          <button
            type="button"
            onClick={onStartMove}
            disabled={disabled}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Delete follow-up for ${name}`}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AdminIcon name="trash" className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  )
}
