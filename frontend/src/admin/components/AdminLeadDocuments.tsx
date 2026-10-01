import { useCallback, useEffect, useRef, useState } from "react"
import { ApiError } from "../../lib/apiClient"
import {
  fetchLeadDocumentFile,
  fetchLeadDocumentPreview,
  fetchLeadDocuments,
  formatLeadDateTime,
  generateLeadDocument,
  initializeLeadDocuments,
  leadDocumentStatusBadgeClass,
  leadEnumLabel,
  signLeadDocument,
  updateLeadDocumentStatus,
  type LeadDocument,
  type LeadDocumentStatus,
} from "../lib/adminApi"
import { readAdminSession } from "../lib/adminSession"
import AdminIcon from "./AdminIcon"
import AdminSignaturePad, {
  type AdminSignaturePadHandle,
} from "./AdminSignaturePad"

/**
 * Phase 5 documents panel, extended with the Phase 6 signature flow.
 *
 * Reads `GET /api/leads/:leadId/documents` and uses only endpoints that already
 * exist in backend/src/routes/leadDocument.routes.js:
 *   POST   .../documents/initialize        (create the documents for a lead)
 *   GET    .../documents/:id/preview        (template rendered with lead data)
 *   POST   .../documents/:id/generate       (render + store the PDF)
 *   GET    .../documents/:id/file           (signed download URL)
 *   PATCH  .../documents/:id/status         { status }
 *   POST   .../documents/:id/sign           { signature }
 *
 * The signing request is only sent once the backend has confirmed it, and a
 * document the backend reports as COMPLETED never shows an active pad.
 */

type DocumentsState =
  | { status: "loading" }
  | { status: "ready"; documents: LeadDocument[] }
  | { status: "error" }
  | { status: "signing-out" }

type PanelState =
  | { status: "loading" }
  | { status: "ready"; value: string; fileName: string | null }
  | { status: "error" }

type PanelStateWithId = { id: string; panel: PanelState }

type AdminLeadDocumentsProps = {
  leadId: string
}

const ACTION_BUTTON_CLASS =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"

const PRIMARY_BUTTON_CLASS =
  "rounded-lg bg-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"

/** `storage.bytes` is a byte count; render it in the largest sensible unit. */
function formatBytes(bytes: number | undefined): string | null {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function MetaRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm text-navy">{value}</dd>
    </div>
  )
}

export default function AdminLeadDocuments({ leadId }: AdminLeadDocumentsProps) {
  const [state, setState] = useState<DocumentsState>({ status: "loading" })
  const [initializing, setInitializing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [preview, setPreview] = useState<PanelStateWithId | null>(null)
  const [file, setFile] = useState<PanelStateWithId | null>(null)
  const [signingId, setSigningId] = useState<string | null>(null)
  const [padFor, setPadFor] = useState<string | null>(null)
  const [padEmpty, setPadEmpty] = useState(true)
  const [signError, setSignError] = useState<string | null>(null)
  const requestedRef = useRef(false)
  const padRef = useRef<AdminSignaturePadHandle | null>(null)

  const load = useCallback(async () => {
    setState({ status: "loading" })

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "error" })
      return
    }

    try {
      setState({
        status: "ready",
        documents: await fetchLeadDocuments(leadId, token),
      })
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
    if (!statusMessage) return
    const timer = window.setTimeout(() => setStatusMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  const handleInitialize = async () => {
    if (initializing) return

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setInitializing(true)
    setActionError(null)
    try {
      // The response already carries the full document list, so no extra read.
      const result = await initializeLeadDocuments(leadId, token)
      setState({ status: "ready", documents: result.documents })
      setStatusMessage(
        result.created > 0
          ? `Added ${result.created} document${result.created === 1 ? "" : "s"} from the active templates`
          : "Every active template already has a document for this lead",
      )
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setActionError("We couldn't create the documents. Please try again.")
    } finally {
      setInitializing(false)
    }
  }

  const handleToggleStatus = async (document: LeadDocument) => {
    if (busyId) return

    const next: LeadDocumentStatus =
      document.status === "COMPLETED" ? "PENDING" : "COMPLETED"
    const name = document.template.name || "Document"

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setBusyId(document.id)
    setActionError(null)
    try {
      // The PATCH response is the saved document, so the row updates in place.
      const updated = await updateLeadDocumentStatus(
        leadId,
        document.id,
        next,
        token,
      )
      setState((previous) =>
        previous.status === "ready"
          ? {
              status: "ready",
              documents: previous.documents.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : previous,
      )
      setStatusMessage(
        `${name} marked as ${(leadEnumLabel(next) ?? next).toLowerCase()}`,
      )
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setActionError(`We couldn't update ${name}. Please try again.`)
    } finally {
      setBusyId(null)
    }
  }

  const handleGenerate = async (document: LeadDocument) => {
    if (busyId) return

    const name = document.template.name || "This document"

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setBusyId(document.id)
    setActionError(null)
    setFile(null)
    try {
      await generateLeadDocument(leadId, document.id, token)
      // Generation changes `generatedAt`/`storage` server-side.
      await load()
      setStatusMessage(`Generated the PDF for ${name}`)
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setActionError(
        `We couldn't generate the PDF for ${name}. It may not be available yet.`,
      )
    } finally {
      setBusyId(null)
    }
  }

  const handleTogglePreview = async (document: LeadDocument) => {
    if (preview?.id === document.id) {
      setPreview(null)
      return
    }

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setPreview({ id: document.id, panel: { status: "loading" } })
    setActionError(null)
    try {
      const result = await fetchLeadDocumentPreview(
        leadId,
        document.id,
        token,
      )
      setPreview({
        id: document.id,
        panel: { status: "ready", value: result.content, fileName: null },
      })
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setPreview({ id: document.id, panel: { status: "error" } })
    }
  }

  const handleViewFile = async (document: LeadDocument) => {
    if (file?.id === document.id) {
      setFile(null)
      return
    }

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setFile({ id: document.id, panel: { status: "loading" } })
    setActionError(null)
    try {
      const result = await fetchLeadDocumentFile(leadId, document.id, token)
      setFile({
        id: document.id,
        panel: {
          status: "ready",
          value: result.secureUrl,
          fileName: result.fileName,
        },
      })
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      setFile({ id: document.id, panel: { status: "error" } })
    }
  }

  const documents = state.status === "ready" ? state.documents : []
  const completedCount = documents.filter(
    (document) => document.status === "COMPLETED",
  ).length

  const handleTogglePad = (document: LeadDocument) => {
    if (signingId) return
    // The backend answers 409 for a completed document, so never offer a pad.
    if (document.status === "COMPLETED") {
      setSignError(
        `${document.template.name || "This document"} is already completed. Reopen it before signing again.`,
      )
      return
    }
    if (padFor === document.id) {
      setPadFor(null)
      setSignError(null)
      setPadEmpty(true)
      return
    }
    setPadFor(document.id)
    setSignError(null)
    setPadEmpty(true)
  }

  const handleSign = async (document: LeadDocument) => {
    // A second click while the request is in flight is ignored.
    if (signingId) return

    const name = document.template.name || "This document"

    // Never send a signing request for a document that is already completed.
    if (document.status === "COMPLETED") {
      setSignError(
        `${name} is already completed. Reopen it before signing again.`,
      )
      await load()
      return
    }
    const pad = padRef.current
    if (!pad || pad.isEmpty()) {
      setSignError("Capture the customer signature before completing this document.")
      return
    }

    const signature = pad.toPngDataUrl()
    if (!signature.startsWith("data:image/png;base64,")) {
      setSignError("We couldn't read that signature. Please draw it again.")
      return
    }

    const token = readAdminSession()?.token
    if (!token) {
      setState({ status: "signing-out" })
      return
    }

    setSigningId(document.id)
    setSignError(null)
    try {
      const result = await signLeadDocument(
        leadId,
        document.id,
        signature,
        token,
      )

      // Apply what the backend confirmed, then re-read so the stored file and
      // storage metadata match the saved record.
      setState((previous) =>
        previous.status === "ready"
          ? {
              status: "ready",
              documents: previous.documents.map((item) =>
                item.id === document.id
                  ? {
                      ...item,
                      status: result.status,
                      completedAt: result.completedAt,
                      signature: result.signature,
                    }
                  : item,
              ),
            }
          : previous,
      )
      setPadFor(null)
      setPadEmpty(true)
      setFile(null)
      setStatusMessage(`${name} signed and completed`)
      await load()
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setState({ status: "signing-out" })
        return
      }
      if (error instanceof ApiError && error.status === 409) {
        // The backend says this document is already completed, so show the
        // real state instead of an error.
        setPadFor(null)
        setPadEmpty(true)
        setStatusMessage(`${name} was already completed`)
        await load()
        return
      }
      // The pad and its signature stay put so the request can be retried.
      setSignError(
        error instanceof ApiError && error.isNetworkError
          ? "We couldn't reach the server. Please check your connection and try again."
          : "We couldn't complete this document. Nothing has changed, please try again.",
      )
    } finally {
      setSigningId(null)
    }
  }

  return (
    <section
      aria-labelledby="lead-documents-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="lead-documents-heading"
          className="font-display flex items-center gap-2 text-base font-bold text-navy"
        >
          <AdminIcon name="note" className="h-5 w-5 text-orange" />
          Documents
        </h2>

        {state.status === "ready" ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {completedCount}/{documents.length} completed
            </span>
            <button
              type="button"
              onClick={() => void handleInitialize()}
              disabled={initializing}
              className={ACTION_BUTTON_CLASS}
            >
              {initializing ? "Syncing…" : "Sync templates"}
            </button>
          </div>
        ) : null}
      </div>

      <div aria-live="polite" className="sr-only">
        {statusMessage ?? ""}
      </div>

      {state.status === "loading" ? (
        <div role="status" aria-live="polite" className="mt-4 space-y-3">
          <span className="sr-only">Loading documents</span>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="h-20 animate-pulse rounded-xl bg-slate-100"
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
            We couldn&apos;t load the documents
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
          {actionError ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            >
              {actionError}
            </p>
          ) : null}

          {documents.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white">
                <AdminIcon name="note" className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-navy">
                No documents on this lead yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Creating documents adds one for each active document template.
                Running it again will not create duplicates.
              </p>
              <button
                type="button"
                onClick={() => void handleInitialize()}
                disabled={initializing}
                className={`${PRIMARY_BUTTON_CLASS} mt-4`}
              >
                {initializing ? "Creating documents…" : "Create documents"}
              </button>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {documents.map((document) => {
                const isCompleted = document.status === "COMPLETED"
                const name = document.template.name || document.template.key
                const isBusy = busyId === document.id
                const size = formatBytes(document.storage?.bytes)

                return (
                  <li
                    key={document.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-navy">
                          {name}
                        </p>
                        {document.template.key ? (
                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {document.template.key}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${leadDocumentStatusBadgeClass(
                          document.status,
                        )}`}
                      >
                        {leadEnumLabel(document.status) ?? "Unknown"}
                      </span>
                    </div>

                    {document.template.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {document.template.description}
                      </p>
                    ) : null}

                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <MetaRow label="Document ID" value={document.id} />
                      <MetaRow
                        label="Template"
                        value={document.template.name || null}
                      />
                      <MetaRow
                        label="Completed"
                        value={formatLeadDateTime(document.completedAt)}
                      />
                      <MetaRow
                        label="Created"
                        value={formatLeadDateTime(document.createdAt)}
                      />
                      <MetaRow
                        label="Last updated"
                        value={formatLeadDateTime(document.updatedAt)}
                      />
                      <MetaRow
                        label="Generated"
                        value={formatLeadDateTime(document.generatedAt)}
                      />
                      <MetaRow
                        label="File"
                        value={document.generatedFileName}
                      />
                      <MetaRow
                        label="Storage"
                        value={
                          size
                            ? [document.storage?.provider, size]
                                .filter(Boolean)
                                .join(" · ")
                            : (document.storage?.provider ?? null)
                        }
                      />
                      {document.signature?.signedAt ? (
                        <MetaRow
                          label="Signed"
                          value={`${document.signature.signedBy ?? "Signed"} · ${formatLeadDateTime(
                            document.signature.signedAt,
                          )}`}
                        />
                      ) : null}
                    </dl>

                    {preview?.id === document.id ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        {preview.panel.status === "loading" ? (
                          <p
                            role="status"
                            aria-live="polite"
                            className="text-xs text-slate-500"
                          >
                            Loading content…
                          </p>
                        ) : null}
                        {preview.panel.status === "error" ? (
                          <p role="alert" className="text-xs text-red-700">
                            We couldn&apos;t load the content for this document.
                          </p>
                        ) : null}
                        {preview.panel.status === "ready" ? (
                          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-navy">
                            {preview.panel.value}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}

                    {file?.id === document.id ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        {file.panel.status === "loading" ? (
                          <p
                            role="status"
                            aria-live="polite"
                            className="text-xs text-slate-500"
                          >
                            Preparing the download link…
                          </p>
                        ) : null}
                        {file.panel.status === "error" ? (
                          <p role="alert" className="text-xs text-red-700">
                            No generated file is available for this document yet.
                          </p>
                        ) : null}
                        {file.panel.status === "ready" ? (
                          <a
                            href={file.panel.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy underline underline-offset-2 hover:text-orange"
                          >
                            <AdminIcon name="external" className="h-3.5 w-3.5" />
                            Open{" "}
                            {file.panel.fileName ?? "generated document"} (PDF)
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleTogglePreview(document)}
                        className={ACTION_BUTTON_CLASS}
                      >
                        {preview?.id === document.id
                          ? "Hide content"
                          : "View content"}
                      </button>

                      {/* The backend answers 409 for a COMPLETED document, so
                          generation is only offered while it is PENDING. */}
                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => void handleGenerate(document)}
                          disabled={isBusy}
                          className={ACTION_BUTTON_CLASS}
                        >
                          {isBusy ? "Working…" : "Generate PDF"}
                        </button>
                      ) : null}

                      {document.generatedAt ? (
                        <button
                          type="button"
                          onClick={() => void handleViewFile(document)}
                          className={ACTION_BUTTON_CLASS}
                        >
                          {file?.id === document.id ? "Hide file" : "View file"}
                        </button>
                      ) : null}

                      {/* Only a PENDING document can be signed: the backend
                          answers 409 once a document is COMPLETED. */}
                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => void handleTogglePad(document)}
                          disabled={isBusy || signingId !== null}
                          className={ACTION_BUTTON_CLASS}
                        >
                          {padFor === document.id ? "Cancel signing" : "Sign document"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(document)}
                        disabled={isBusy}
                        className={ACTION_BUTTON_CLASS}
                      >
                        {isBusy
                          ? "Saving…"
                          : isCompleted
                            ? "Reopen"
                            : "Mark completed"}
                      </button>
                    </div>

                    {isCompleted ? (
                      <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        <AdminIcon
                          name="checkCircle"
                          className="mt-0.5 h-4 w-4 shrink-0"
                        />
                        <span>
                          Completed
                          {document.signature?.signedAt ? (
                            <>
                              {" "}
                              and signed
                              {document.signature.signedBy
                                ? ` by ${document.signature.signedBy.toLowerCase()}`
                                : null}{" "}
                              on {formatLeadDateTime(document.signature.signedAt)}.
                            </>
                          ) : (
                            ". This document cannot be signed again."
                          )}
                        </span>
                      </p>
                    ) : null}

                    {padFor === document.id ? (
                      <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Customer signature
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          Have the customer sign below using a finger, stylus or
                          mouse. Completing the document signs it on their behalf
                          and cannot be undone from this screen.
                        </p>

                        <div className="mt-3">
                          <AdminSignaturePad
                            padRef={padRef}
                            onChange={setPadEmpty}
                            disabled={signingId !== null}
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => padRef.current?.clear()}
                            disabled={padEmpty || signingId !== null}
                            className={ACTION_BUTTON_CLASS}
                          >
                            Clear signature
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSign(document)}
                            disabled={padEmpty || signingId !== null}
                            className={PRIMARY_BUTTON_CLASS}
                          >
                            {signingId === document.id
                              ? "Completing…"
                              : "Complete document"}
                          </button>
                          {padEmpty ? (
                            <span className="text-xs text-slate-400">
                              A signature is required.
                            </span>
                          ) : null}
                        </div>

                        {signError ? (
                          <p
                            role="alert"
                            className="mt-2 text-xs font-medium text-red-700"
                          >
                            {signError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}
    </section>
  )
}
