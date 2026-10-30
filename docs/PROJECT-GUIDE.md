# Kasturii Roadways Project Guide

This repository contains two independently deployable applications:

- `apps/web`: the Next.js website and administration UI.
- `apps/cms`: the backend API Worker, D1 database integration, migrations, and CMS architecture placeholders.

The `apps/cms` package is currently a Cloudflare Worker + D1 backend. The Strapi-specific folders are reserved for the planned CMS migration; Strapi itself is not installed or implemented in the current codebase.

## Repository structure

```text
kasturii-roadways/
├── apps/
│   ├── web/
│   │   ├── public/                 # favicon and static website assets
│   │   ├── src/app/               # Next.js routes and page UI
│   │   ├── src/components/        # shared UI components
│   │   ├── src/features/          # reserved feature-slice folders
│   │   ├── src/domain/             # reserved pure-domain folders
│   │   ├── src/application/        # reserved use-case folders
│   │   ├── src/infrastructure/     # reserved adapter folders
│   │   ├── src/config.ts           # fallback website content
│   │   ├── src/lib/api.ts          # frontend-to-backend API client
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── cms/
│       ├── src/index.ts            # Worker composition and route dispatcher
│       ├── src/http.ts             # CORS, JSON, origin, and OPTIONS helpers
│       ├── src/auth.ts             # Admin sessions, owner checks, and passwords
│       ├── src/db/                 # D1 schema and runtime database access
│       ├── src/routes/             # Config, contact, and admin endpoints
│       ├── src/crypto.ts           # password/session cryptography
│       ├── src/api/                # reserved CMS content-type folders
│       ├── database/migrations/    # D1 migration files
│       ├── public/uploads/         # ignored runtime uploads
│       ├── wrangler.toml           # Worker and D1 configuration
│       ├── package.json
│       └── .env.example
│
├── tests/unit/                     # backend authentication checks
├── package.json                    # workspace commands
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
└── .gitignore
```

## Requirements

- Node.js 24 LTS
- pnpm 11
- A Cloudflare account for deployed Worker/D1 environments

Install dependencies from the repository root:

```sh
pnpm install --frozen-lockfile
```

## Run the frontend locally

1. Copy the example environment file:

   ```sh
   copy apps\web\.env.example apps\web\.env.local
   ```

2. Set the backend URL in `apps/web/.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8787
   ```

3. Start the frontend:

   ```sh
   pnpm --dir apps/web dev
   ```

The website runs at `http://localhost:3000`.

The frontend does not store CMS data itself. It calls the backend API configured by `NEXT_PUBLIC_API_URL`.

## Run the backend locally

1. Copy the CMS environment example:

   ```sh
   copy apps\cms\.env.example apps\cms\.dev.vars
   ```

2. Set the owner email and frontend origin:

   ```env
   ADMIN_EMAILS=owner@example.com
   FRONTEND_ORIGIN=http://localhost:3000
   ```

   `ADMIN_EMAILS` may contain multiple comma-separated email addresses.

3. Apply D1 migrations:

   ```sh
   pnpm exec wrangler d1 migrations apply DB --local --config apps/cms/wrangler.toml
   ```

4. Start the Worker:

   ```sh
   pnpm exec wrangler dev --config apps/cms/wrangler.toml
   ```

The backend runs at `http://localhost:8787` unless Wrangler selects another port.

Run the frontend and backend in separate terminals.

## Database

The current database is Cloudflare D1, which uses SQLite.

The schema is in `apps/cms/src/db/schema.ts`:

- `settings`: site configuration and the hashed admin password.
- `enquiries`: public contact submissions.
- `admin_sessions`: hashed admin session tokens and expiry times.
- `admin_attempts`: login rate-limit records.

Migration files are stored in `apps/cms/database/migrations/`.

Apply local migrations:

```sh
pnpm exec wrangler d1 migrations apply DB --local --config apps/cms/wrangler.toml
```

Apply migrations to a configured remote database:

```sh
pnpm exec wrangler d1 migrations apply DB --remote --config apps/cms/wrangler.toml
```

Do not delete or edit an already-applied migration. Add a new migration for schema changes.

The placeholder `database_id` in `apps/cms/wrangler.toml` must be replaced with the real client-owned D1 database ID before production deployment.

## Website details and contact information

Default/fallback values are defined in `apps/web/src/config.ts`. The live values are stored in the D1 `settings` table and are edited through `/admin`.

The administration UI supports these details:

- `phone`: customer support phone number.
- `email`: public support email.
- `businessEmail`: business or official email.
- `WHATSAPP_NUMBER`: WhatsApp number with country code and digits only.
- `registeredOffice`: registered office address.
- `operationalOffice`: operating office address.
- `officeHours`: support/office hours.
- `mapUrl`: HTTPS map URL.
- `facebook`, `instagram`, `youtube`: HTTPS social links.
- `REDBUS_BOOKING_URL`: HTTPS redBus booking URL.
- `MAKEMYTRIP_BOOKING_URL`: HTTPS MakeMyTrip booking URL.
- `banner`: homepage banner text.
- routes, coaches, gallery, safety features, reviews, FAQs, and legal text.

Only publish verified company information. The current website does not issue tickets, process payments, send email notifications, or provide seat inventory.

## Admin requirements and workflow

### Owner setup

1. Configure `ADMIN_EMAILS` in the backend environment.
2. The owner must access `/admin/setup` through a deployment that provides the trusted `oai-authenticated-user-email` header.
3. The owner creates a password of 16–256 characters.
4. The password is salted and hashed with PBKDF2; the raw password is never stored.

The trusted identity header must come from the hosting/platform authentication layer. Never accept an owner email from a browser form or client-controlled environment variable.

### Staff login

- Staff use `/admin`.
- Staff sign in with the shared password created by the owner.
- Sessions last eight hours.
- Sessions use secure HTTP-only cookies.
- Resetting the password revokes existing sessions.
- Login attempts are rate-limited.

Production admin access requires HTTPS because the session cookie is marked `Secure`.

## Production deployment

### Deploy the CMS backend

1. Create a client-owned Cloudflare D1 database.
2. Update `apps/cms/wrangler.toml` with the real database ID.
3. Configure the backend secret `ADMIN_EMAILS`.
4. Set `FRONTEND_ORIGIN` to the deployed web origin.
5. Apply migrations:

   ```sh
   pnpm exec wrangler d1 migrations apply DB --remote --config apps/cms/wrangler.toml
   ```

6. Deploy the Worker:

   ```sh
   pnpm exec wrangler deploy --config apps/cms/wrangler.toml
   ```

### Deploy the web frontend

Set the frontend environment variable to the deployed Worker URL:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

Then build and start/deploy the Next.js application using the hosting provider:

```sh
pnpm --dir apps/web build
pnpm --dir apps/web start
```

The backend CORS origin and frontend API URL must point to each other correctly.

## Validation commands

Run both package type checks:

```sh
pnpm run typecheck
```

Build the frontend:

```sh
pnpm run build
```

Run the authentication test:

```sh
node tests/unit/admin-auth.mjs
```

Validate the Worker bundle without deploying:

```sh
pnpm exec wrangler deploy --dry-run --config apps/cms/wrangler.toml
```

## Git and secrets

Commit source code, migrations, package manifests, example environment files, and documentation.

Do not commit:

- `.env.local`, `.dev.vars`, or real secret values.
- Cloudflare API tokens or private keys.
- `node_modules/`.
- `.next/`, build output, or TypeScript build metadata.
- `.wrangler/` and local D1 state.
- Runtime files under `apps/cms/public/uploads/`.
- Production database exports or customer enquiries.
