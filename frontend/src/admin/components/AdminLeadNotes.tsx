import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import {
  createLeadNote,
  fetchLeadNotes,
  formatLeadDateTime,
  leadActorName,
  type LeadNote,
} from "../lib/adminApi"
import { readAdminSession } from "../lib/adminSession"
import AdminIcon from "./AdminIcon"

/** Mirrors the backend `maxlength: 5000` rule on `Note.text`. */
const NOTE_MAX_LENGTH = 5000

type NotesState =
  | { status: "loading" }
  | { status: "ready"; notes: LeadNote[] }
  | { status: "error" }
  | { status: "signing-out" }

type AdminLeadNotesProps = {
  leadId: string
}

export default function AdminLeadNotes({ leadId }: AdminLeadNotesProps) {
  const [state, setState] = useState<NotesState>({ status: "loading" })
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const requestedRef = useRef(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      setState({ status: "ready", notes: await fetchLeadNotes(leadId, token) })
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const text = draft.trim()
    if (!text) {
      setFormError("Enter a note before saving.")
      return
    }
    if (text.length > NOTE_MAX_LENGTH) {
      setFormError(`Notes are limited to ${NOTE_MAX_LENGTH} characters.`)
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
      await createLeadNote(leadId, text, token)
      setDraft("")
      setSuccessMessage("Note added")
      // The backend returns the new note, but re-reading the list keeps the
      // populated `createdBy` object consistent with the existing notes.
      await load()
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setFormError("We couldn't save that note. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="lead-notes-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="lead-notes-heading"
          className="font-display flex items-center gap-2 text-base font-bold text-navy"
        >
          <AdminIcon name="note" className="h-5 w-5 text-orange" />
          Notes
        </h2>
        {state.status === "ready" ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {state.notes.length}
          </span>
        ) : null}
      </div>

      {state.status === "loading" ? (
        <div role="status" aria-live="polite" className="mt-4 space-y-3">
          <span className="sr-only">Loading notes</span>
          {[0, 1].map((row) => (
            <div
              key={row}
              className="h-16 animate-pulse rounded-xl bg-slate-100"
            />
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
            We couldn&apos;t load the notes
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

      {state.status === "ready" ? (
        <>
          <div aria-live="polite" className="sr-only">
            {successMessage ?? ""}
          </div>

          {state.notes.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No notes on this lead yet. Anything you add is visible to your team
              only.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {state.notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy">
                    {note.text}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {leadActorName(note.createdBy)}
                    {formatLeadDateTime(note.createdAt)
                      ? ` · ${formatLeadDateTime(note.createdAt)}`
                      : null}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit} className="mt-5">
            <label
              htmlFor="lead-note-text"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Add a note
            </label>
            <textarea
              id="lead-note-text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="Called the customer and left a voicemail."
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-navy outline-none transition-colors placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-400">
                {draft.length}/{NOTE_MAX_LENGTH}
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save note"}
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
