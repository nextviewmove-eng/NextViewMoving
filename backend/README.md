# Moving Company Management System — Backend

> **Phases 1–11 — Backend Foundation · Admin Auth · Leads · Email · Dashboard · Notes · Follow-ups · Document Templates · Lead Documents · Document Generation**

The backend API for the moving company management system. It will eventually power public quote submissions, admin frontend, and legal document workflows. Completed so far: backend foundation, secure admin authentication, the lead data model and protected lead CRUD APIs, a failure-safe email service, dashboard statistics, lead notes, lead follow-ups, reusable document templates, per-lead lead documents, and PDF document generation from those templates.

## Tech Stack

| Layer           | Technology                     |
| --------------- | ------------------------------ |
| Runtime         | Node.js                        |
| Framework       | Express.js                     |
| Database        | MongoDB                        |
| ODM             | Mongoose                       |
| Environment     | dotenv                         |
| Security        | helmet                         |
| CORS            | cors                           |
| Logging         | morgan                         |
| Auth            | jsonwebtoken, bcryptjs, express-validator |
| Dev tooling     | nodemon (dev dependency)       |
| Language        | JavaScript (ES Modules)        |

## Folder Structure

```
backend/
├── scripts/
│   └── seedAdmin.js              # Development-only admin creation script
├── src/
│   ├── config/
│   │   └── db.js                  # MongoDB connection (connectDB)
│   ├── controllers/
│   │   ├── health.controller.js   # GET /api/health
│   │   ├── auth.controller.js     # login, get me, logout, test
│   │   ├── lead.controller.js     # lead create/list/get/update/delete
│   │   ├── email.controller.js    # /api/email/test (dev only)
│   │   ├── dashboard.controller.js # GET /api/dashboard/stats
│   │   ├── note.controller.js     # lead note create/list/update/delete
│   │   └── followUp.controller.js # follow-up create/list/update/delete + global list
│   ├── middleware/
│   │   ├── error.middleware.js    # 404 + centralized error handler
│   │   ├── auth.middleware.js     # protect (JWT verification)
│   │   ├── validation.middleware.js # express-validator result handler
│   │   ├── leadValidation.middleware.js # lead create/update/id rules
│   │   ├── noteValidation.middleware.js # note create/update/id rules
│   │   └── followUpValidation.middleware.js # follow-up create/update/status rules
│   ├── models/
│   │   ├── Admin.js               # Admin schema (hashed passwords, never serialized)
│   │   ├── Lead.js                # Lead schema (customer, move details, status, quote)
│   │   ├── Note.js                # Lead note (lead ref, text, createdBy admin)
│   │   └── FollowUp.js            # Follow-up (lead ref, dueAt, completed, createdBy)
│   ├── routes/
│   │   ├── index.js               # API router mounting all modules
│   │   ├── health.routes.js
│   │   ├── auth.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── lead.routes.js
│   │   ├── note.routes.js
│   │   ├── followUp.routes.js
│   │   ├── followUpGlobal.routes.js
│   │   └── email.routes.js
│   ├── services/                  # Email service + HTML templates (Phase 5)
│   ├── utils/
│   │   ├── asyncHandler.js        # async route error handling helper
│   │   └── token.js               # JWT sign/verify helpers
│   └── app.js                     # Express application setup
├── server.js                      # Entry point: env → DB → HTTP server
├── .env.example                   # Template for environment variables
├── .gitignore
├── package.json
└── README.md
```

## Installation

```bash
cd backend
npm install
```

## Environment Variables

Copy the template and adjust as needed:

```bash
cp .env.example .env
```

| Variable         | Description                     | Default                                |
| ---------------- | ------------------------------- | -------------------------------------- |
| `PORT`           | HTTP server port                | `5000`                                 |
| `NODE_ENV`       | Runtime environment             | `development`                          |
| `MONGO_URI`      | MongoDB connection string       | `mongodb://127.0.0.1:27017/moving_company` |
| `CLIENT_URL`     | Public frontend origin (CORS)   | `http://localhost:5173`                |
| `ADMIN_URL`      | Admin frontend origin (CORS)    | `http://localhost:5173`                |
| `JWT_SECRET`     | JWT signing secret              | `development_change_this_secret`       |
| `JWT_EXPIRES_IN` | JWT expiry                      | `1d`                                   |
| `SMTP_HOST`      | SMTP server host                | *(empty)*                              |
| `SMTP_PORT`      | SMTP server port                | `587`                                  |
| `SMTP_USER`      | SMTP auth user                  | *(empty)*                              |
| `SMTP_PASSWORD`  | SMTP auth password              | *(empty)*                              |
| `EMAIL_FROM`     | From address for outgoing mail  | `Let's Get Moving <quotes@example.com>` |
| `ADMIN_NOTIFICATION_EMAIL` | Where admin new-lead emails go | *(empty)*              |

> `.env` is never committed. It is listed in `.gitignore`.
> **Change `JWT_SECRET` before any production deployment.**
> Leave SMTP vars empty to run the API without sending emails — lead creation still works and email failures are logged, never fatal.

## MongoDB Setup

1. Install and start MongoDB locally, or use MongoDB Atlas.
2. Ensure MongoDB is listening on `127.0.0.1:27017`.
3. The server connects to the database defined in `MONGO_URI`.
4. The database `moving_company` will be created automatically on first write.

## Development Admin Seed

Creates a local development admin (idempotent — never duplicates):

```bash
npm run seed:admin
```

Credentials (development only):

- Email: `admin@test.com`
- Password: `Admin@123`

The seed connects to MongoDB, skips creation if the admin already exists, hashes the password, and exits cleanly. It refuses to run when `NODE_ENV=production` and is never triggered automatically on server start. Change these credentials (and `JWT_SECRET`) for any real environment.

## Development

```bash
npm run dev
```

Runs the server with nodemon (auto-restarts on file changes).

## Production

```bash
npm start
```

Runs the server with plain Node.js. Set `NODE_ENV=production` in `.env`.

## API Endpoints

### Health

```http
GET /api/health
```

```json
{
  "success": true,
  "message": "API is running",
  "environment": "development",
  "database": "connected"
}
```

### Authentication

```http
POST /api/auth/login
```

Body: `{ "email": "admin@test.com", "password": "Admin@123" }`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": { "id": "...", "name": "...", "email": "...", "role": "admin" },
    "token": "..."
  }
}
```

```http
GET /api/auth/me        # Protected (Bearer token)
```

```json
{
  "success": true,
  "data": { "admin": { "id": "...", "name": "...", "email": "...", "role": "admin" } }
}
```

```http
POST /api/auth/logout   # Client-side session cleanup (see below)
```

```http
GET /api/auth/test      # Protected, development/test only
```

```json
{
  "success": true,
  "message": "Authentication middleware is working",
  "data": { "adminId": "...", "role": "admin" }
}
```

### Leads (all protected with admin auth)

```http
GET    /api/leads       # Paginated; ?page=&limit=&status=&search=
POST   /api/leads       # Create lead (status forced to NEW)
GET    /api/leads/:id   # Get single lead
PATCH  /api/leads/:id   # Partial update of customer/move/services/quote/status
DELETE /api/leads/:id   # Delete lead
```

List response includes pagination metadata:

```json
{
  "success": true,
  "data": {
    "leads": [ /* lead objects */ ],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0, "hasNextPage": false, "hasPrevPage": false }
  }
}
```

`search` matches customer name, email, or phone (case-insensitive). Results are sorted newest first (`createdAt` desc).

Lead create body example:

```json
{
  "customer": { "fullName": "Jane Doe", "phone": "555-1234", "email": "jane@test.com" },
  "moveDetails": {
    "movingFrom": "Toronto, ON",
    "movingTo": "Vancouver, BC",
    "movingDate": "2026-10-01",
    "moveType": "LONG_DISTANCE",
    "propertyType": "APARTMENT",
    "bedrooms": "TWO",
    "originFloor": "FOURTH",
    "elevator": "ORIGIN_ONLY",
    "stairs": "A_FEW_STEPS"
  },
  "services": ["MOVING", "PACKING"],
  "additionalInformation": "Two large sofas"
}
```

### Dashboard Statistics (protected)

```http
GET /api/dashboard/stats
```

Single MongoDB aggregation returns total leads, per-status counts (`NEW`, `CONTACTED`, `QUOTE_SENT`, `BOOKED`, `COMPLETED`), lead counts created today / this week (Monday start) / this month, and the 5 most recent leads:

```json
{
  "success": true,
  "data": {
    "statistics": {
      "total": 10,
      "NEW": 5,
      "CONTACTED": 2,
      "QUOTE_SENT": 1,
      "BOOKED": 1,
      "COMPLETED": 1,
      "createdToday": 2,
      "createdThisWeek": 4,
      "createdThisMonth": 9
    },
    "recentLeads": [
      { "id": "...", "customer": { "fullName": "...", "phone": "...", "email": "..." },
        "moveDetails": { "movingFrom": "...", "movingTo": "...", "movingDate": "..." },
        "status": "NEW", "createdAt": "..." }
    ]
  }
}
```

### Lead Notes (protected)

Notes live in a separate collection (`Note`) keyed by a `lead` reference — the Lead schema is untouched. `createdBy` records the logged-in admin.

```http
POST   /api/leads/:leadId/notes          # body: { "text": "..." }
GET    /api/leads/:leadId/notes          # newest first, createdBy populated
PATCH  /api/leads/:leadId/notes/:noteId  # body: { "text": "..." }
DELETE /api/leads/:leadId/notes/:noteId
```

- 400 for invalid ids / empty `text`; 404 if the lead doesn't exist or the note doesn't belong to that lead.

### Lead Follow-ups (protected)

Follow-ups live in a separate collection (`FollowUp`) keyed by a `lead` reference.

```http
POST   /api/leads/:leadId/follow-ups          # body: { "dueAt": "...", "note": "..." }
GET    /api/leads/:leadId/follow-ups          # newest first, createdBy populated
PATCH  /api/leads/:leadId/follow-ups/:followUpId  # body: dueAt / note / completed
DELETE /api/leads/:leadId/follow-ups/:followUpId
```

Cross-lead dashboard listing (all leads), with an optional `status` filter:

```http
GET /api/follow-ups            # all follow-ups, lead + createdBy populated
GET /api/follow-ups?status=pending     # incomplete, sorted by soonest dueAt
GET /api/follow-ups?status=completed   # completed, sorted by latest completedAt
```

PATCH behavior: `completed: true` stamps `completedAt` once and keeps the original stamp on re-completion; `completed: false` clears `completedAt`. Invalid status values return 400. Follow-ups carry useful indexes on `lead`, `dueAt`, and `completed`.

### Document Templates (Phase 9)

Document templates are the reusable building blocks for generated lead documents. Models live in a separate `DocumentTemplate` collection (`key` is unique/required, uppercase, pattern-constrained `[A-Z0-9_]+`; `name`, `description`, `content`, `isActive`). Development seed provides 5 placeholder templates (`DOCUMENT_1`…`DOCUMENT_5`) — run `npm run seed:documents` (idempotent via `updateOne` + `$setOnInsert`, never overwrites existing content).

```http
GET    /api/document-templates          # Public — list templates (sorted by key)
GET    /api/document-templates/:id      # Public — get a template
POST   /api/document-templates          # Protected — create (key unique, key pattern)
PATCH  /api/document-templates/:id      # Protected — partial update (no delete; set isActive:false to deactivate)
```

Validation failures, duplicate keys, and invalid ids produce 400; missing templates produce 404. `isActive:false` is the "removal" mechanism — there is intentionally no DELETE endpoint.

### Lead Documents (Phase 10)

Each lead gets one `LeadDocument` row per active template (junction collection with `lead` + `template` refs). Initialization is idempotent — calling it multiple times creates nothing new. Status is `PENDING` | `COMPLETED` (default `PENDING`); `completedAt` is null until marked `COMPLETED`. Indexes: `{lead,status}`, `{template}`, unique `{lead,template}`.

```http
POST  /api/leads/:leadId/documents/initialize                        # Protected — create PENDING docs for all active templates
POST  /api/leads/:leadId/documents/:documentId/initialize            # Protected — create/reuse a single lead doc from a template
GET   /api/leads/:leadId/documents                                   # Protected — list lead documents
GET   /api/leads/:leadId/documents/:documentId                       # Protected — get one (template + lead populated)
PATCH /api/leads/:leadId/documents/:documentId/status                # Protected — { "status": "COMPLETED" } stamps completedAt
POST  /api/leads/:leadId/documents/:documentId/preview               # Protected — rendered content with lead values filled in
POST  /api/leads/:leadId/documents/:documentId/generate              # Protected — build PDF into uploads/documents
GET   /api/leads/:leadId/documents/:documentId/file                  # Protected — download the generated PDF
```

Missing leads or documents return 404. Status update body: `{ "status": "PENDING" | "COMPLETED", "completedAt": "<ISO date optional>" }`. Only a generated document can be downloaded (400 if not generated yet). PDFs are produced locally with `pdfkit` and stored under `backend/uploads/documents/` (git-ignored); only the protected file endpoint serves them — the uploads directory is never exposed statically.

### Logout behavior

JWTs are stateless. `/api/auth/logout` returns a success response and the client must delete its stored token. A token-revocation strategy (e.g. a denylist) is intentionally not implemented yet, but the auth code is structured so one can be added later.

## Security

- Passwords are hashed with bcryptjs (10 salt rounds) before saving; never stored as plaintext.
- Password hashes are `select: false` on the schema and stripped from every serialized admin response.
- Login failures always return `"Invalid email or password"` — no email-existence disclosure.
- `require` a `Bearer <token>` on protected routes; tokens are verified against `JWT_SECRET`.
- Inactive admins cannot log in or access protected routes.
- Malformed, missing, invalid, and expired tokens all return 401 (403 for deactivated accounts).
- `JWT_SECRET` lives in `.env` only — never hardcoded, never logged.

### Email test endpoint (development only)

```http
POST /api/email/test   # Protected; sends both emails with a sample lead
```

Returns per-email success/failure (see service logs for details). Not for production use.

## Email Service

Located in `src/services/email.service.js` (Nodemailer + SMTP). Two reusable functions and one orchestration helper:

- `sendCustomerConfirmationEmail(lead)` — "Quote Request Received" to `lead.customer.email`. No pricing mentioned; confirms receipt and the 24-hour contact window.
- `sendAdminNewLeadEmail(lead)` — new-lead notification to `ADMIN_NOTIFICATION_EMAIL` with full customer and move details.
- `notifyNewLead(lead)` — sends both, catching and logging any failure. Called automatically after a lead is created via `POST /api/leads`; it never throws, so email problems never block or roll back lead creation.

Templates live separately in `src/services/emailTemplates/` (HTML + plain-text versions, user data HTML-escaped). SMTP credentials come only from environment variables — nothing is hardcoded. Email success/failure is logged with clear `[email]` prefixes.

## Current Scope (Phases 1–8)

Implemented so far:

- Express foundation: `helmet`, `cors`, `morgan`, JSON body parsing, centralized error handling
- MongoDB connection via `connectDB()`
- `GET /api/health` with database status
- Admin model with bcrypt-hashed passwords and a `pre-save` hash hook
- JWT sign/verify helpers and `protect` authentication middleware
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/test`
- `express-validator` login validation
- Idempotent development admin seed (`npm run seed:admin`)
- Lead model (customer, move details enums, services, status, quote) with indexes on email, status, createdAt
- Protected lead APIs: create, paginated list with `status`/`search` filters, get, partial update, delete
- Reusable Nodemailer SMTP email service with customer confirmation + admin new-lead templates
- Failure-safe automatic emails on lead creation + protected `/api/email/test` dev endpoint
- Dashboard statistics: `/api/dashboard/stats` (single aggregation: totals, per-status counts, today/week/month buckets, 5 recent leads)
- Lead notes: separate `Note` collection (lead + admin refs) with create/list/update/delete, newest-first listing, scoping, and validation
- Lead follow-ups: separate `FollowUp` collection with create/list/update/delete, completion stamps, and global pending/completed listings across all leads
- Indexes added for notes (`lead`, `lead + createdAt`) and follow-ups (`lead`, `lead + createdAt`, `dueAt`, `completed + dueAt`)

Not yet implemented (later phases): public quote form API, documents, signatures, admin frontend.