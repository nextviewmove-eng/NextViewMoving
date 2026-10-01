import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import {
  LEAD_STATUSES,
  fetchLead,
  formatLeadDate,
  formatLeadDateTime,
  isLeadStatus,
  leadEnumLabel,
  leadStatusBadgeClass,
  updateLeadStatus,
  type Lead,
  type LeadStatus,
} from "../lib/adminApi"
import { readAdminSession } from "../lib/adminSession"
import AdminIcon from "../components/AdminIcon"
import AdminLeadDocuments from "../components/AdminLeadDocuments"
import AdminLeadFollowUps from "../components/AdminLeadFollowUps"
import AdminLeadNotes from "../components/AdminLeadNotes"
import AdminLink from "../components/AdminLink"

type DetailState =
  | { status: "loading" }
  | { status: "ready"; lead: Lead }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "signing-out" }

type AdminLeadDetailProps = {
  leadId: string
}

type DetailRowProps = {
  label: string
  value: string | null | undefined
  mono?: boolean
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) return null
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 text-sm text-navy ${mono ? "font-mono" : ""}`}>
        {text}
      </dd>
    </div>
  )
}

function DetailCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: Parameters<typeof AdminIcon>[0]["name"]
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy">
        <AdminIcon name={icon} className="h-5 w-5 text-orange" />
        {title}
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

export default function AdminLeadDetail({ leadId }: AdminLeadDetailProps) {
  const [state, setState] = useState<DetailState>({ status: "loading" })
  const [savingStatus, setSavingStatus] = useState<LeadStatus | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const requestedRef = useRef(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      setState({ status: "ready", lead: await fetchLead(leadId, token) })
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      if (error instanceof ApiError && error.status === 404) {
        setState({ status: "not-found" })
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
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const handleStatusChange = async (next: LeadStatus) => {
    if (savingStatus) return
    if (state.status !== "ready" || state.lead.status === next) return

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setSavingStatus(next)
    setStatusError(null)
    try {
      // The PATCH response is the saved lead, so the UI updates in place.
      const updated = await updateLeadStatus(leadId, next, token)
      setState({ status: "ready", lead: updated })
      setStatusMessage(`Status updated to ${leadEnumLabel(next)}`)
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setStatusError("We couldn't update the status. Please try again.")
    } finally {
      setSavingStatus(null)
    }
  }

  const backLink = (
    <AdminLink
      to="/admin/leads"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-navy"
    >
      <AdminIcon name="arrowLeft" className="h-4 w-4" />
      Back to all leads
    </AdminLink>
  )

  if (state.status === "loading") {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">Loading lead</span>
        {backLink}
        <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  if (state.status === "signing-out") {
    return (
      <p role="status" aria-live="polite" className="text-sm text-slate-600">
        Your session ended. Taking you to the sign-in page…
      </p>
    )
  }

  if (state.status === "not-found") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <AdminIcon name="leads" className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="font-display mt-4 text-lg font-bold text-navy">
          Lead not found
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          This lead no longer exists, or the link is no longer valid.
        </p>
        <div className="mt-6 flex justify-center">{backLink}</div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
          <AdminIcon name="trending" className="h-6 w-6 text-red-600" />
        </div>
        <h2 className="font-display mt-5 text-xl font-bold text-navy">
          We couldn&apos;t load this lead
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          The request did not complete. Your account is still signed in and
          nothing has been changed. Please try again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Try again
          </button>
          {backLink}
        </div>
      </div>
    )
  }

  const { lead } = state
  const moveDate = formatLeadDate(lead.moveDetails.movingDate)
  const hasQuote =
    lead.quote?.amount !== undefined ||
    Boolean(lead.quote?.notes) ||
    Boolean(lead.quote?.sentAt)

  return (
    <div className="space-y-5">
      {backLink}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold text-navy">
              {lead.customer.fullName}
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <a
                href={`tel:${lead.customer.phone}`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-navy"
              >
                <AdminIcon name="phone" className="h-4 w-4 text-slate-400" />
                {lead.customer.phone}
              </a>
              <a
                href={`mailto:${lead.customer.email}`}
                className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-navy"
              >
                <AdminIcon name="mail" className="h-4 w-4 text-slate-400" />
                {lead.customer.email}
              </a>
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${leadStatusBadgeClass(
              lead.status,
            )}`}
          >
            {leadEnumLabel(lead.status) ?? "Unknown"}
          </span>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Lead reference <span className="font-mono">{lead.id}</span>
        </p>
      </div>

      <section
        aria-labelledby="lead-status-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2
          id="lead-status-heading"
          className="font-display flex items-center gap-2 text-base font-bold text-navy"
        >
          <AdminIcon name="checkCircle" className="h-5 w-5 text-orange" />
          Status
        </h2>

        <div aria-live="polite" className="sr-only">
          {statusMessage ?? ""}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {LEAD_STATUSES.map((option) => {
            const active = lead.status === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => void handleStatusChange(option)}
                disabled={savingStatus !== null || active}
                aria-pressed={active}
                className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-navy bg-navy text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-navy"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {savingStatus === option
                  ? "Saving…"
                  : (leadEnumLabel(option) ?? option)}
              </button>
            )
          })}
        </div>

        {statusError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            {statusError}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <DetailCard title="Move details" icon="pin">
          <DetailRow label="Moving from" value={lead.moveDetails.movingFrom} />
          <DetailRow label="Moving to" value={lead.moveDetails.movingTo} />
          <DetailRow label="Moving date" value={moveDate} />
          <DetailRow
            label="Move type"
            value={leadEnumLabel(lead.moveDetails.moveType)}
          />
          <DetailRow
            label="Property type"
            value={leadEnumLabel(lead.moveDetails.propertyType)}
          />
          <DetailRow
            label="Bedrooms"
            value={leadEnumLabel(lead.moveDetails.bedrooms)}
          />
        </DetailCard>

        <DetailCard title="Access details" icon="building">
          <DetailRow
            label="Origin floor"
            value={leadEnumLabel(lead.moveDetails.originFloor)}
          />
          <DetailRow
            label="Elevator"
            value={leadEnumLabel(lead.moveDetails.elevator)}
          />
          <DetailRow
            label="Stairs"
            value={leadEnumLabel(lead.moveDetails.stairs)}
          />
        </DetailCard>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy">
          <AdminIcon name="leads" className="h-5 w-5 text-orange" />
          Services requested
        </h2>
        {lead.services && lead.services.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {lead.services.map((service) => (
              <li
                key={service}
                className="rounded-full bg-navy-100 px-3 py-1.5 text-xs font-semibold text-navy"
              >
                {leadEnumLabel(service)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No services recorded.</p>
        )}

        {lead.additionalInformation ? (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Additional information
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {lead.additionalInformation}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy">
          <AdminIcon name="mail" className="h-5 w-5 text-orange" />
          Quote
        </h2>
        {hasQuote ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {lead.quote?.amount !== undefined ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </dt>
                <dd className="font-display mt-1 text-lg font-bold text-navy">
                  {lead.quote.currency ?? "CAD"}{" "}
                  {lead.quote.amount.toLocaleString("en-CA", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </dd>
              </div>
            ) : null}
            <DetailRow
              label="Sent"
              value={formatLeadDateTime(lead.quote?.sentAt)}
            />
            {lead.quote?.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quote notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {lead.quote.notes}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No quote has been recorded for this lead yet.
          </p>
        )}
      </section>

      <AdminLeadDocuments leadId={leadId} />

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminLeadNotes leadId={leadId} />
        <AdminLeadFollowUps leadId={leadId} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-base font-bold text-navy">
          Record information
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <DetailRow
            label="Created"
            value={formatLeadDateTime(lead.createdAt)}
          />
          <DetailRow
            label="Last updated"
            value={formatLeadDateTime(lead.updatedAt)}
          />
        </dl>
      </section>
    </div>
  )
}
