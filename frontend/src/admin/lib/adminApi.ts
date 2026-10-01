import { ApiError, apiClient, type RequestOptions } from "../../lib/apiClient"
import { isAdminUser, type AdminUser } from "./adminSession"

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  unauthorizedHandler = handler
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.isUnauthorized
}

async function withUnauthorizedHandling<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isUnauthorized(error)) {
      unauthorizedHandler?.()
    }
    throw error
  }
}

export function adminGet<T>(
  path: string,
  token: string,
  options?: Pick<RequestOptions, "query" | "signal">,
): Promise<T> {
  return withUnauthorizedHandling(() =>
    apiClient.get<T>(path, { token, ...options }),
  );
}

export function adminPost<T>(
  path: string,
  body: unknown,
  token: string,
): Promise<T> {
  return withUnauthorizedHandling(() =>
    apiClient.post<T>(path, body, { token }),
  );
}

export function adminPatch<T>(
  path: string,
  body: unknown,
  token: string,
): Promise<T> {
  return withUnauthorizedHandling(() =>
    apiClient.patch<T>(path, body, { token }),
  );
}

export function adminDelete<T>(path: string, token: string): Promise<T> {
  return withUnauthorizedHandling(() => apiClient.delete<T>(path, { token }));
}

/* ------------------------------------------------------------------ *
 * Admin profile (Phase 7)
 *
 * GET /api/auth/me is the only admin profile route the backend
 * exposes (auth.routes.js). There is no update route, so this module
 * deliberately offers no way to change a profile: the settings page
 * presents the real values instead of inventing a write endpoint.
 * ------------------------------------------------------------------ */

type AdminProfileResponse = {
  success?: boolean
  data?: { admin?: unknown }
}

/** GET /api/auth/me — the signed-in admin, validated by `isAdminUser`. */
export async function fetchAdminProfile(token: string): Promise<AdminUser> {
  const response = await adminGet<AdminProfileResponse>(
    "/api/auth/me",
    token,
  );
  const admin = response?.data?.admin;
  if (!isAdminUser(admin)) {
    throw new Error("Unexpected admin profile response from the server");
  }
  return admin;
}

/**
 * Counts returned by GET /api/dashboard/stats.
 * Field names mirror LEAD_STATUSES in the backend Lead model, so the status
 * keys are upper snake case.
 */
export type DashboardStatistics = {
  total: number
  createdToday: number
  createdThisWeek: number
  createdThisMonth: number
  NEW: number
  CONTACTED: number
  QUOTE_SENT: number
  BOOKED: number
  COMPLETED: number
}

type DashboardStatsResponse = {
  success?: boolean
  data?: {
    statistics?: Partial<Record<keyof DashboardStatistics, unknown>>
  }
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

/**
 * Fetches the real dashboard statistics. Reuses `adminGet`, so the existing
 * 401 handling from Phase 2 applies unchanged.
 */
export async function fetchDashboardStatistics(
  token: string,
): Promise<DashboardStatistics> {
  const response = await adminGet<DashboardStatsResponse>(
    "/api/dashboard/stats",
    token,
  )
  const statistics = response?.data?.statistics
  if (typeof statistics !== "object" || statistics === null) {
    throw new Error("Unexpected dashboard statistics response")
  }

  return {
    total: toCount(statistics.total),
    createdToday: toCount(statistics.createdToday),
    createdThisWeek: toCount(statistics.createdThisWeek),
    createdThisMonth: toCount(statistics.createdThisMonth),
    NEW: toCount(statistics.NEW),
    CONTACTED: toCount(statistics.CONTACTED),
    QUOTE_SENT: toCount(statistics.QUOTE_SENT),
    BOOKED: toCount(statistics.BOOKED),
    COMPLETED: toCount(statistics.COMPLETED),
  };
}

/* ------------------------------------------------------------------ *
 * Leads (Phase 4)
 *
 * Every constant and field below mirrors the backend Lead model
 * (backend/src/models/Lead.js), the lead controller
 * (backend/src/controllers/lead.controller.js) and the lead/notes/
 * follow-up routes, which are all mounted on /api/leads.
 * ------------------------------------------------------------------ */

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTE_SENT",
  "BOOKED",
  "COMPLETED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const MOVE_TYPES = [
  "LOCAL",
  "LONG_DISTANCE",
  "INTER_PROVINCIAL",
] as const;

export const PROPERTY_TYPES = [
  "HOUSE",
  "APARTMENT",
  "CONDO",
  "TOWNHOUSE",
  "OFFICE",
  "COMMERCIAL",
  "STORAGE_UNIT",
] as const;

export const BEDROOM_TYPES = [
  "STUDIO",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE_PLUS",
] as const;

export const ORIGIN_FLOORS = [
  "GROUND_MAIN",
  "SECOND",
  "THIRD",
  "FOURTH",
  "FIFTH",
  "SIX_PLUS",
] as const;

export const ELEVATOR_OPTIONS = [
  "YES",
  "NO",
  "BOTH_LOCATIONS",
  "ORIGIN_ONLY",
  "DESTINATION_ONLY",
] as const;

export const STAIR_OPTIONS = [
  "NO_STAIRS",
  "A_FEW_STEPS",
  "ONE_FULL_FLIGHT",
  "MULTIPLE_FLIGHTS",
] as const;

export const LEAD_SERVICES = [
  "MOVING",
  "PACKING",
  "UNPACKING",
  "FURNITURE_ASSEMBLY",
  "HEAVY_ITEM_MOVING",
  "LOADING_ONLY",
  "UNLOADING_ONLY",
] as const;

/** Tailwind classes for the status pill, keyed by the backend status value. */
const LEAD_STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  NEW: "bg-orange-100 text-orange-600",
  CONTACTED: "bg-sky-100 text-sky-700",
  QUOTE_SENT: "bg-indigo-100 text-indigo-700",
  BOOKED: "bg-navy-100 text-navy",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

const FALLBACK_BADGE_CLASS = "bg-slate-100 text-slate-600";

/** Enum values whose generic label would read poorly. */
const LEAD_ENUM_LABEL_OVERRIDES: Record<string, string> = {
  INTER_PROVINCIAL: "Inter-provincial",
  GROUND_MAIN: "Ground floor",
  SIX_PLUS: "Sixth floor or higher",
  FIVE_PLUS: "Five or more",
};

/**
 * Turns a backend enum value such as `QUOTE_SENT` into `Quote sent`, and
 * returns `null` for values the backend left empty so the UI can hide the
 * field instead of inventing a value.
 */
export function leadEnumLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const override = LEAD_ENUM_LABEL_OVERRIDES[trimmed];
  if (override) return override;
  const words = trimmed.replace(/_/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function leadStatusBadgeClass(status: unknown): string {
  if (typeof status !== "string") return FALLBACK_BADGE_CLASS;
  return LEAD_STATUS_BADGE_CLASSES[status as LeadStatus] ?? FALLBACK_BADGE_CLASS;
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    (LEAD_STATUSES as readonly string[]).includes(value)
  );
}

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `2026-11-20T00:00:00.000Z` → `Nov 20, 2026`. `null` when absent/invalid. */
export function formatLeadDate(value: unknown): string | null {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** `2026-11-20T00:00:00.000Z` → `Nov 20, 2026, 3:45 PM`. */
export function formatLeadDateTime(value: unknown): string | null {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  return parsed.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type Lead = {
  id: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  moveDetails: {
    movingFrom: string;
    movingTo: string;
    movingDate: string;
    moveType?: string;
    propertyType?: string;
    bedrooms?: string;
    originFloor?: string;
    elevator?: string;
    stairs?: string;
  };
  services?: string[];
  additionalInformation?: string;
  status: string;
  quote?: {
    amount?: number;
    currency?: string;
    notes?: string;
    sentAt?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

/** `pagination` object returned verbatim by GET /api/leads. */
export type LeadPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type LeadListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

export type LeadListResult = {
  leads: Lead[];
  pagination: LeadPagination;
};

/**
 * `createdBy` is a raw id in POST/PATCH responses but a populated
 * `{ id, name, email }` object in GET responses, so both shapes are accepted.
 */
export type LeadActor = string | { id: string; name?: string; email?: string };

export type LeadNote = {
  id: string;
  lead: string;
  text: string;
  createdBy: LeadActor;
  createdAt?: string;
  updatedAt?: string;
};

export type LeadFollowUp = {
  id: string;
  lead: string;
  note?: string;
  dueAt: string;
  completed: boolean;
  completedAt?: string | null;
  createdBy: LeadActor;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Phase 6.5 calendar row for `GET /api/follow-ups`.
 *
 * The global route populates `lead` with `customer.*` and `status`, so the
 * calendar never needs a second request to render a lead name. Fields are
 * flattened here so the page stays independent of that populate shape, and
 * every value stays optional because Mongoose returns `null` for a lead that
 * was deleted while the follow-up survived.
 */
export type ScheduledFollowUp = {
  id: string;
  /** Empty when the referenced lead no longer exists; such rows are not linkable. */
  leadId: string;
  leadStatus: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  note: string | null;
  /** ISO timestamp straight from the backend. Never re-serialised for display. */
  dueAt: string;
  completed: boolean;
  completedAt: string | null;
  createdBy: LeadActor;
  createdAt: string | null;
  updatedAt: string | null;
};

type RawRecord = Record<string, unknown>;

function readRecord(value: unknown): RawRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function readDataRecord(response: unknown): RawRecord | null {
  const root = readRecord(response);
  return root ? readRecord(root.data) : null;
}

function readArray(source: RawRecord | null, key: string): unknown[] {
  const value = source?.[key];
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readPagination(source: RawRecord | null): LeadPagination {
  const raw = readRecord(source?.pagination);
  return {
    page: toCount(raw?.page),
    limit: toCount(raw?.limit),
    total: toCount(raw?.total),
    totalPages: toCount(raw?.totalPages),
    hasNextPage: raw?.hasNextPage === true,
    hasPrevPage: raw?.hasPrevPage === true,
  };
}

function toLead(value: unknown): Lead | null {
  const raw = readRecord(value);
  if (!raw) return null;
  const id = readString(raw.id);
  if (!id) return null;

  const customer = readRecord(raw.customer);
  const move = readRecord(raw.moveDetails);
  const quote = readRecord(raw.quote);

  return {
    id,
    customer: {
      fullName: readString(customer?.fullName),
      phone: readString(customer?.phone),
      email: readString(customer?.email),
    },
    moveDetails: {
      movingFrom: readString(move?.movingFrom),
      movingTo: readString(move?.movingTo),
      movingDate: readString(move?.movingDate),
      moveType: readString(move?.moveType) || undefined,
      propertyType: readString(move?.propertyType) || undefined,
      bedrooms: readString(move?.bedrooms) || undefined,
      originFloor: readString(move?.originFloor) || undefined,
      elevator: readString(move?.elevator) || undefined,
      stairs: readString(move?.stairs) || undefined,
    },
    services: Array.isArray(raw.services)
      ? raw.services.filter((item): item is string => typeof item === "string")
      : undefined,
    additionalInformation:
      readString(raw.additionalInformation) || undefined,
    status: readString(raw.status),
    quote: quote
      ? {
          amount: typeof quote.amount === "number" ? quote.amount : undefined,
          currency: readString(quote.currency) || undefined,
          notes: readString(quote.notes) || undefined,
          sentAt: readString(quote.sentAt) || undefined,
        }
      : undefined,
    createdAt: readString(raw.createdAt) || undefined,
    updatedAt: readString(raw.updatedAt) || undefined,
  };
}

function requireLead(response: unknown): Lead {
  const lead = toLead(readDataRecord(response)?.lead);
  if (!lead) throw new Error("Unexpected lead response from the server");
  return lead;
}

/** Display name for a note or follow-up author, tolerating both shapes. */
export function leadActorName(actor: LeadActor | undefined): string {
  if (typeof actor === "string") return "Admin";
  const name = typeof actor?.name === "string" ? actor.name.trim() : "";
  if (name) return name;
  const email = typeof actor?.email === "string" ? actor.email.trim() : "";
  return email || "Admin";
}

/** GET /api/leads?page=&limit=&status=&search= — all server-side. */
export async function fetchLeads(
  query: LeadListQuery,
  token: string,
): Promise<LeadListResult> {
  const response = await adminGet<unknown>("/api/leads", token, {
    query: {
      page: query.page,
      limit: query.limit,
      status: query.status || undefined,
      search: query.search ? query.search : undefined,
    },
  });

  const data = readDataRecord(response);
  return {
    leads: readArray(data, "leads")
      .map(toLead)
      .filter((lead): lead is Lead => lead !== null),
    pagination: readPagination(data),
  };
}

/** GET /api/leads/:id */
export async function fetchLead(leadId: string, token: string): Promise<Lead> {
  return requireLead(
    await adminGet<unknown>(
      `/api/leads/${encodeURIComponent(leadId)}`,
      token,
    ),
  );
}

/** PATCH /api/leads/:id — Phase 4 only changes `status`. */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  token: string,
): Promise<Lead> {
  return requireLead(
    await adminPatch<unknown>(
      `/api/leads/${encodeURIComponent(leadId)}`,
      { status },
      token,
    ),
  );
}

/** GET /api/leads/:leadId/notes */
export async function fetchLeadNotes(
  leadId: string,
  token: string,
): Promise<LeadNote[]> {
  const response = await adminGet<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/notes`,
    token,
  );
  return readArray(readDataRecord(response), "notes").filter(
    (note): note is LeadNote => readRecord(note) !== null,
  ) as LeadNote[];
}

/** POST /api/leads/:leadId/notes — `text` is required, max 5000 characters. */
export async function createLeadNote(
  leadId: string,
  text: string,
  token: string,
): Promise<void> {
  await adminPost<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/notes`,
    { text },
    token,
  );
}

/** GET /api/leads/:leadId/follow-ups */
export async function fetchLeadFollowUps(
  leadId: string,
  token: string,
): Promise<LeadFollowUp[]> {
  const response = await adminGet<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/follow-ups`,
    token,
  );
  return readArray(readDataRecord(response), "followUps").filter(
    (followUp): followUp is LeadFollowUp => readRecord(followUp) !== null,
  ) as LeadFollowUp[];
}

/** GET /api/follow-ups — every lead, with `lead` populated for the calendar. */
export async function fetchAllFollowUps(
  token: string,
): Promise<ScheduledFollowUp[]> {
  const response = await adminGet<unknown>("/api/follow-ups", token);
  return readArray(readDataRecord(response), "followUps")
    .map(toScheduledFollowUp)
    .filter(
      (followUp): followUp is ScheduledFollowUp => followUp !== null,
    );
}

function toScheduledFollowUp(value: unknown): ScheduledFollowUp | null {
  const raw = readRecord(value);
  if (!raw) return null;

  const id = readString(raw.id);
  if (!id) return null;

  // Populated on the global route; a bare id on the lead-scoped route.
  const lead = readRecord(raw.lead);
  const customer = readRecord(lead?.customer);
  const createdBy = readRecord(raw.createdBy);

  return {
    id,
    leadId: readString(lead?.id) || (typeof raw.lead === "string" ? raw.lead : ""),
    leadStatus: readString(lead?.status) || null,
    customerName: readString(customer?.fullName),
    customerPhone: readString(customer?.phone),
    customerEmail: readString(customer?.email),
    note: readString(raw.note) || null,
    dueAt: readString(raw.dueAt),
    completed: raw.completed === true,
    completedAt: readString(raw.completedAt) || null,
    createdBy: createdBy
      ? {
          id: readString(createdBy.id),
          name: readString(createdBy.name) || undefined,
          email: readString(createdBy.email) || undefined,
        }
      : "Admin",
    createdAt: readString(raw.createdAt) || null,
    updatedAt: readString(raw.updatedAt) || null,
  };
}

/** POST /api/leads/:leadId/follow-ups — `dueAt` is required. */
export async function createLeadFollowUp(
  leadId: string,
  body: { dueAt: string; note?: string },
  token: string,
): Promise<void> {
  await adminPost<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/follow-ups`,
    body,
    token,
  );
}

/** PATCH /api/leads/:leadId/follow-ups/:followUpId */
export async function updateLeadFollowUp(
  leadId: string,
  followUpId: string,
  body: { note?: string; dueAt?: string; completed?: boolean },
  token: string,
): Promise<void> {
  await adminPatch<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/follow-ups/${encodeURIComponent(
      followUpId,
    )}`,
    body,
    token,
  );
}

/** DELETE /api/leads/:leadId/follow-ups/:followUpId */
export async function deleteLeadFollowUp(
  leadId: string,
  followUpId: string,
  token: string,
): Promise<void> {
  await adminDelete<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/follow-ups/${encodeURIComponent(
      followUpId,
    )}`,
    token,
  );
}

/* ------------------------------------------------------------------ *
 * Lead documents (Phase 5)
 *
 * Everything below mirrors backend/src/models/LeadDocument.js,
 * backend/src/models/DocumentTemplate.js,
 * backend/src/controllers/leadDocument.controller.js,
 * backend/src/services/leadDocument.service.js and
 * backend/src/services/documentGeneration.service.js.
 * The routes are mounted on /api/leads, i.e. under the lead resource.
 * ------------------------------------------------------------------ */

/** `LEAD_DOCUMENT_STATUSES` in the backend LeadDocument model. */
export const LEAD_DOCUMENT_STATUSES = ["PENDING", "COMPLETED"] as const;

export type LeadDocumentStatus = (typeof LEAD_DOCUMENT_STATUSES)[number];

const LEAD_DOCUMENT_BADGE_CLASSES: Record<LeadDocumentStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
};

export function leadDocumentStatusBadgeClass(status: unknown): string {
  if (typeof status !== "string") return FALLBACK_BADGE_CLASS;
  return (
    LEAD_DOCUMENT_BADGE_CLASSES[status as LeadDocumentStatus] ??
    FALLBACK_BADGE_CLASS
  );
}

/** The populated `template` sub-document the backend sends with each document. */
export type LeadDocumentTemplate = {
  id?: string;
  key: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type LeadDocumentStorage = {
  provider?: string;
  publicId?: string;
  secureUrl?: string;
  resourceType?: string;
  format?: string;
  bytes?: number;
};

export type LeadDocumentSignature = {
  signedAt?: string;
  signedBy?: string;
};

export type LeadDocument = {
  id: string;
  lead?: string;
  template: LeadDocumentTemplate;
  status: string;
  completedAt?: string | null;
  generatedFileName?: string | null;
  generatedAt?: string | null;
  storage?: LeadDocumentStorage | null;
  signature?: LeadDocumentSignature | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Response of GET /api/leads/:leadId/documents/:documentId/preview. */
export type LeadDocumentPreview = {
  documentId: string;
  template: { key: string; name: string };
  content: string;
};

/** Response of GET /api/leads/:leadId/documents/:documentId/file. */
export type LeadDocumentFile = {
  documentId: string;
  fileName: string | null;
  generatedAt: string | null;
  secureUrl: string;
  provider?: string;
};

/** Response of POST /api/leads/:leadId/documents/initialize. */
export type LeadDocumentInitResult = {
  created: number;
  skipped: number;
  documents: LeadDocument[];
};

function toLeadDocumentTemplate(value: unknown): LeadDocumentTemplate {
  const raw = readRecord(value);
  if (!raw) {
    // The backend always populates `template`, but an unpopulated ObjectId
    // would arrive as a plain id string.
    return typeof value === "string" && value
      ? { key: value, name: "" }
      : { key: "", name: "" };
  }
  return {
    id: readString(raw.id) || undefined,
    key: readString(raw.key),
    name: readString(raw.name),
    description: readString(raw.description) || undefined,
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : undefined,
  };
}

function toLeadDocument(value: unknown): LeadDocument | null {
  const raw = readRecord(value);
  if (!raw) return null;
  const id = readString(raw.id);
  if (!id) return null;

  const storage = readRecord(raw.storage);
  const signature = readRecord(raw.signature);

  return {
    id,
    lead: readString(raw.lead) || undefined,
    template: toLeadDocumentTemplate(raw.template),
    status: readString(raw.status),
    completedAt: readString(raw.completedAt) || null,
    generatedFileName: readString(raw.generatedFileName) || null,
    generatedAt: readString(raw.generatedAt) || null,
    storage: storage
      ? {
          provider: readString(storage.provider) || undefined,
          publicId: readString(storage.publicId) || undefined,
          secureUrl: readString(storage.secureUrl) || undefined,
          resourceType: readString(storage.resourceType) || undefined,
          format: readString(storage.format) || undefined,
          bytes:
            typeof storage.bytes === "number" && Number.isFinite(storage.bytes)
              ? storage.bytes
              : undefined,
        }
      : null,
    signature: signature
      ? {
          signedAt: readString(signature.signedAt) || undefined,
          signedBy: readString(signature.signedBy) || undefined,
        }
      : null,
    createdAt: readString(raw.createdAt) || undefined,
    updatedAt: readString(raw.updatedAt) || undefined,
  };
}

/** GET /api/leads/:leadId/documents */
export async function fetchLeadDocuments(
  leadId: string,
  token: string,
): Promise<LeadDocument[]> {
  const response = await adminGet<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/documents`,
    token,
  );
  return readArray(readDataRecord(response), "documents")
    .map(toLeadDocument)
    .filter((document): document is LeadDocument => document !== null);
}

/**
 * POST /api/leads/:leadId/documents/initialize
 *
 * The backend upserts one document per active template, so this is safe to call
 * again: existing rows are skipped rather than duplicated.
 */
export async function initializeLeadDocuments(
  leadId: string,
  token: string,
): Promise<LeadDocumentInitResult> {
  const response = await adminPost<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/documents/initialize`,
    {},
    token,
  );
  const data = readDataRecord(response);
  return {
    created: toCount(data?.created),
    skipped: toCount(data?.skipped),
    documents: readArray(data, "documents")
      .map(toLeadDocument)
      .filter((document): document is LeadDocument => document !== null),
  };
}

/** GET /api/leads/:leadId/documents/:documentId/preview */
export async function fetchLeadDocumentPreview(
  leadId: string,
  documentId: string,
  token: string,
): Promise<LeadDocumentPreview> {
  const response = await adminGet<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/documents/${encodeURIComponent(
      documentId,
    )}/preview`,
    token,
  );
  const data = readDataRecord(response);
  const template = readRecord(data?.template);
  return {
    documentId: readString(data?.documentId) || documentId,
    template: {
      key: readString(template?.key),
      name: readString(template?.name),
    },
    content: readString(data?.content),
  };
}

/** GET /api/leads/:leadId/documents/:documentId/file — 404 when not generated. */
export async function fetchLeadDocumentFile(
  leadId: string,
  documentId: string,
  token: string,
): Promise<LeadDocumentFile> {
  const response = await adminGet<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/documents/${encodeURIComponent(
      documentId,
    )}/file`,
    token,
  );
  const data = readDataRecord(response);
  const storage = readRecord(data?.storage);
  return {
    documentId: readString(data?.documentId) || documentId,
    fileName: readString(data?.fileName) || null,
    generatedAt: readString(data?.generatedAt) || null,
    secureUrl: readString(storage?.secureUrl),
    provider: readString(storage?.provider) || undefined,
  };
}

/**
 * POST /api/leads/:leadId/documents/:documentId/generate
 *
 * Renders the template into a PDF and stores it. The backend rejects this with
 * 409 once the document is COMPLETED, and with 500 when Cloudinary is not
 * configured. Returns nothing so the caller re-reads the list.
 */
export async function generateLeadDocument(
  leadId: string,
  documentId: string,
  token: string,
): Promise<void> {
  await adminPost<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/documents/${encodeURIComponent(
      documentId,
    )}/generate`,
    {},
    token,
  );
}

/**
 * PATCH /api/leads/:leadId/documents/:documentId/status
 *
 * The backend only accepts the two model values; `completedAt` is optional and
 * is set/cleared server-side, so Phase 5 sends `status` only.
 */
export async function updateLeadDocumentStatus(
  leadId: string,
  documentId: string,
  status: LeadDocumentStatus,
  token: string,
): Promise<LeadDocument> {
  const response = await adminPatch<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/documents/${encodeURIComponent(
      documentId,
    )}/status`,
    { status },
    token,
  );
  const document = toLeadDocument(readDataRecord(response)?.document);
  if (!document) throw new Error("Unexpected lead document response");
  return document;
}

/**
 * Response of POST /api/leads/:leadId/documents/:documentId/sign.
 *
 * The backend sets the status itself rather than echoing the saved document,
 * so the caller applies these fields and then re-reads the list.
 */
export type LeadDocumentSignResult = {
  documentId: string;
  status: string;
  completedAt: string | null;
  signature: LeadDocumentSignature | null;
  storage: { provider?: string; secureUrl?: string } | null;
};

/**
 * POST /api/leads/:leadId/documents/:documentId/sign — Phase 6.
 *
 * `signature` must be a `data:image/png;base64,` URL with content after the
 * prefix: the backend answers 400 for any other string and 400 again if the
 * decoded bytes are not a real PNG. It answers 409 when the document is
 * already COMPLETED, and 500 when Cloudinary is not configured.
 */
export async function signLeadDocument(
  leadId: string,
  documentId: string,
  signatureDataUrl: string,
  token: string,
): Promise<LeadDocumentSignResult> {
  const response = await adminPost<unknown>(
    `/api/leads/${encodeURIComponent(leadId)}/documents/${encodeURIComponent(
      documentId,
    )}/sign`,
    { signature: signatureDataUrl },
    token,
  );

  const data = readDataRecord(response);
  const signature = readRecord(data?.signature);
  const storage = readRecord(data?.storage);

  return {
    documentId: readString(data?.documentId) || documentId,
    status: readString(data?.status),
    completedAt: readString(data?.completedAt) || null,
    signature: signature
      ? {
          signedAt: readString(signature.signedAt) || undefined,
          signedBy: readString(signature.signedBy) || undefined,
        }
      : null,
    storage: storage
      ? {
          provider: readString(storage.provider) || undefined,
          secureUrl: readString(storage.secureUrl) || undefined,
        }
      : null,
  };
}
