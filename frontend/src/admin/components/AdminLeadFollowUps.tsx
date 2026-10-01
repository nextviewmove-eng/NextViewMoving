import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import {
  createLeadFollowUp,
  deleteLeadFollowUp,
  fetchLeadFollowUps,
  formatLeadDate,
  formatLeadDateTime,
  leadActorName,
  updateLeadFollowUp,
  type LeadFollowUp,
} from "../lib/adminApi"
import { readAdminSession } from "../lib/adminSession"
import AdminIcon from "./AdminIcon"

/** Mirrors the backend `maxlength: 5000` rule on `FollowUp.note`. */
const FOLLOW_UP_NOTE_MAX_LENGTH = 5000

type FollowUpsState =
  | { status: "loading" }
  | { status: "ready"; followUps: LeadFollowUp[] }
  | { status: "error" }
  | { status: "signing-out" }

type AdminLeadFollowUpsProps = {
  leadId: string
}

function todayInputValue(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

export default function AdminLeadFollowUps({ leadId }: AdminLeadFollowUpsProps) {
  const [state, setState] = useState<FollowUpsState>({ status: "loading" })
  const [dueAt, setDueAt] = useState(todayInputValue())
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const requestedRef = useRef(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      const followUps = await fetchLeadFollowUps(leadId, token)
      setState({ status: "ready", followUps })
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setState({ status: "error" })
    }
  }, [leadId])

  useEffect(() => {
    if (requestedRef.current) return
    requestedRef.current = true
    void load()
  }, [load])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const trimmedNote = note.trim()
    if (!dueAt) {
      setFormError("Choose a due date for the follow-up.")
      return
    }
    if (trimmedNote.length > FOLLOW_UP_NOTE_MAX_LENGTH) {
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
      // The backend validates `dueAt` with isISO8601.
      await createLeadFollowUp(
        leadId,
        { dueAt: new Date(`${dueAt}T00:00:00`).toISOString(), note: trimmedNote },
        token,
      )
      setNote("")
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

  const runAction = async (
    followUpId: string,
    action: () => Promise<void>,
    successMessageText: string,
  ) => {
    if (busyId) return

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setBusyId(followUpId)
    setActionError(null)
    try {
      await action()
      setSuccessMessage(successMessageText)
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

  const isReady = state.status === "ready"
  const pending = isReady ? state.followUps.filter((item) => !item.completed) : []
  const done = isReady ? state.followUps.filter((item) => item.completed) : []

  return (
    <section
      aria-labelledby="lead-follow-ups-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="lead-follow-ups-heading"
          className="font-display flex items-center gap-2 text-base font-bold text-navy"
        >
          <AdminIcon name="followups" className="h-5 w-5 text-orange" />
          Follow-ups
        </h2>
        {state.status === "ready" ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {state.followUps.length}
          </span>
        ) : null}
      </div>

      {state.status === "loading" ? (
        <div role="status" aria-live="polite" className="mt-4 space-y-3">
          <span className="sr-only">Loading follow-ups</span>
          {[0, 1].map((row) => (
            <div key={row} className="h-16 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : null}

      {state.status === "signing-out" ? (
        <p role="status" aria-live="polite" className="mt-4 text-sm text-slate-600">
          Your session ended. Taking you to the sign-in page…
        </p>
      ) : null}

      {state.status === "error" ? (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            We couldn&apos;t load the follow-ups
          </p>
          <p className="mt-1 text-sm text-red-700">
            Nothing has been changed. Please try again.
          </p>
          <button
            type="button"
            onClick={() => {
              requestedRef.current = false
              void load()
            }}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      ) : null}

      {isReady ? (
        <>
          <div aria-live="polite" className="sr-only">
            {successMessage ?? ""}
          </div>

          {actionError ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {actionError}
            </p>
          ) : null}

          {isReady && state.followUps.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No follow-ups scheduled for this lead yet.
            </p>
          ) : null}

          {pending.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {pending.map((followUp) => (
                <FollowUpRow
                  key={followUp.id}
                  followUp={followUp}
                  busy={busyId === followUp.id}
                  disabled={busyId !== null}
                  onToggle={() =>
                    runAction(
                      followUp.id,
                      () =>
                        updateLeadFollowUp(
                          leadId,
                          followUp.id,
                          { completed: true },
                          requireToken(),
                        ),
                      "Follow-up completed",
                    )
                  }
                  onDelete={() =>
                    runAction(
                      followUp.id,
                      () => deleteLeadFollowUp(leadId, followUp.id, requireToken()),
                      "Follow-up deleted",
                    )
                  }
                />
              ))}
            </ul>
          ) : null}

          {done.length > 0 ? (
            <details className="mt-5">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-500">
                Completed ({done.length})
              </summary>
              <ul className="mt-3 space-y-3">
                {done.map((followUp) => (
                  <FollowUpRow
                    key={followUp.id}
                    followUp={followUp}
                    busy={busyId === followUp.id}
                    disabled={busyId !== null}
                    onToggle={() =>
                      runAction(
                        followUp.id,
                        () =>
                          updateLeadFollowUp(
                            leadId,
                            followUp.id,
                            { completed: false },
                            requireToken(),
                          ),
                        "Follow-up reopened",
                      )
                    }
                    onDelete={() =>
                      runAction(
                        followUp.id,
                        () => deleteLeadFollowUp(leadId, followUp.id, requireToken()),
                        "Follow-up deleted",
                      )
                    }
                  />
                ))}
              </ul>
            </details>
          ) : null}

          <form onSubmit={handleCreate} className="mt-5 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Schedule a follow-up
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
              <div>
                <label
                  htmlFor="lead-follow-up-due"
                  className="block text-xs font-medium text-slate-600"
                >
                  Due date
                </label>
                <input
                  id="lead-follow-up-due"
                  type="date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-navy outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy/20"
                />
              </div>
              <div>
                <label
                  htmlFor="lead-follow-up-note"
                  className="block text-xs font-medium text-slate-600"
                >
                  Note <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="lead-follow-up-note"
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
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
              <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                {formError}
              </p>
            ) : null}
          </form>
        </>
      ) : null}
    </section>
  )
}

/** Reads the current token at the moment an action runs. */
function requireToken(): string {
  const token = readAdminSession()?.token
  if (!token) throw new Error("No admin session")
  return token
}

type FollowUpRowProps = {
  followUp: LeadFollowUp
  busy: boolean
  disabled: boolean
  onToggle: () => void
  onDelete: () => void
}

function FollowUpRow({
  followUp,
  busy,
  disabled,
  onToggle,
  onDelete,
}: FollowUpRowProps) {
  const dueLabel = formatLeadDate(followUp.dueAt)
  const completed = followUp.completed === true

  return (
    <li
      className={`rounded-xl border p-4 ${
        completed
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
            {dueLabel ? (
              <AdminIcon name="calendar" className="h-4 w-4 text-slate-400" />
            ) : null}
            {dueLabel ?? "No due date"}
            {completed ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
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
            {completed && formatLeadDateTime(followUp.completedAt)
              ? ` · completed ${formatLeadDateTime(followUp.completedAt)}`
              : null}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
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
            onClick={onDelete}
            disabled={disabled}
            aria-label={`Delete follow-up due ${dueLabel ?? "without a date"}`}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AdminIcon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  )
}
