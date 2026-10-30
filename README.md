# Kasturii Roadways

Complete source of the Kasturii Roadways website, organized as an independently deployable web app and CMS workspace.

## Technology stack

### Frontend

- Next.js 16 App Router
- React 19 and React DOM
- TypeScript with strict type checking
- Tailwind CSS/PostCSS and custom CSS design tokens
- Lucide React icons
- Zod for validation support

### Backend and data

- Cloudflare Worker runtime
- Cloudflare D1 database using SQLite
- Drizzle ORM and Drizzle Kit migrations
- Wrangler for local development and deployment
- Web Crypto API for password hashing, token hashing, and secure session tokens

### Tooling

- Node.js 24 LTS
- pnpm workspaces
- ESLint with Next.js rules
- TypeScript compiler

The current backend is a Cloudflare Worker + D1 API. Strapi is not currently installed; the CMS folders are reserved for the planned CMS evolution.

## Folder architecture

```text
kasturii-roadways/
├── apps/
│   ├── web/                          # Independently deployable Next.js frontend
│   │   ├── public/                   # Favicon and static image assets
│   │   ├── src/
│   │   │   ├── app/                  # Next.js routes and page UI
│   │   │   ├── components/           # Shared UI components
│   │   │   ├── features/             # Feature-slice placeholders
│   │   │   ├── domain/               # Pure domain placeholders
│   │   │   ├── application/          # Use-case placeholders
│   │   │   ├── infrastructure/       # Adapter/repository placeholders
│   │   │   ├── config.ts             # Fallback website content
│   │   │   └── lib/api.ts            # Backend API client
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── .env.example
│   │
│   └── cms/                          # Independently deployable backend/CMS boundary
│       ├── src/
│       │   ├── index.ts               # Small Worker composition and dispatcher
│       │   ├── http.ts                # CORS, JSON, origin, and OPTIONS helpers
│       │   ├── auth.ts                # Admin sessions, owner checks, and passwords
│       │   ├── db/                    # D1 schema and runtime database access
│       │   ├── routes/                 # Config, contact, and admin endpoints
│       │   ├── api/                   # Reserved CMS content-type folders
│       │   ├── admin/                 # Reserved admin customization
│       │   ├── lib/                   # Reserved external integrations
│       │   └── middlewares/           # Reserved backend middleware
│       ├── database/migrations/       # Versioned D1 migrations
│       ├── config/                    # Reserved CMS configuration
│       ├── scripts/seed/              # Reserved seed data
│       ├── public/uploads/            # Ignored runtime uploads
│       ├── wrangler.toml
│       └── .env.example
│
├── tests/
│   └── unit/                          # Authentication regression test
├── docs/                              # Detailed project and operations guide
├── package.json                       # Root workspace commands
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
└── .gitignore
```

The intended dependency direction for future frontend work is:

```text
domain → application → infrastructure → features/app UI
```

Domain code must remain framework-independent. UI routes should use application use cases, and infrastructure code should be the only layer that knows backend/CMS implementation details.

## Install and run

Use Node.js 24 LTS and pnpm compatible with the lockfile.

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
```

The frontend and backend can also be installed and deployed independently:

```sh
pnpm --dir apps/web install --frozen-lockfile
pnpm --dir apps/web build
pnpm --dir apps/cms typecheck
wrangler deploy --config apps/cms/wrangler.toml
```

Set `NEXT_PUBLIC_API_URL` for the frontend to the deployed backend URL. Set the backend `FRONTEND_ORIGIN` variable to the deployed frontend origin and configure the `DB` D1 binding.
The owner setup endpoint still requires the deployment platform to forward its trusted `oai-authenticated-user-email` identity header to the backend; never replace this with a client-controlled header.

For local D1 development, apply the migrations in `apps/cms/database/migrations/`:

```sh
pnpm exec wrangler d1 migrations apply DB --local --config apps/cms/wrangler.toml
pnpm exec wrangler dev --config apps/cms/wrangler.toml
pnpm --dir apps/web dev
```

Local preview uses its own database. Production data is not included in this repository.

## Administration

- `/admin`: shared-password login and content management.
- `/admin/setup`: owner-only password creation/reset.
- Owner identity is verified using Sites' server-supplied ChatGPT identity headers and the server-side `ADMIN_EMAILS` allowlist.
- Configure `ADMIN_EMAILS` as a runtime secret containing authorized owner email addresses, separated by commas. Never expose it through a client-prefixed environment variable.
- Choose a password/passphrase of at least 16 characters on the setup page. Passwords are hashed with salted PBKDF2; raw passwords are not stored.
- Sessions last 8 hours, use secure HTTP-only cookies, and are revoked when the password is reset. Login attempts are rate-limited.
- HTTPS is needed for the secure admin session cookie. Local plain-HTTP preview is suitable for public page work; use the included tests for authentication logic.

## Checks

```sh
pnpm run typecheck
node tests/unit/admin-auth.mjs
pnpm run build
```

The authentication test uses an in-memory SQLite database and mocked request identity. It checks password hashing, owner-only setup, CSRF rejection, login, session expiry, logout, reset revocation, and rate limiting.

## Content and data

`apps/web/src/config.ts` defines the frontend fallback content. The CMS owns the persisted configuration and customer enquiries in D1. Customer enquiries, configured content, admin password hashes, and sessions are runtime data and are intentionally not committed. The hero is generated concept imagery, not a verified fleet photograph.

Confirmed routes, fares, fleet photos, contact details, booking-platform links, and client-approved legal policies must be supplied before passenger launch. The website currently supports enquiries and links to external booking services, not seat inventory, payment processing, or ticket issuance. Enquiries are stored in admin; email notifications are not implemented.

## Client-owned deployment

This repository is a source-code handover, not a hosting ownership transfer or an automatic GitHub deployment integration.

For a separate Cloudflare deployment, provision client-owned Workers/D1 resources, configure the build output and bindings, apply migrations, replace current Site URLs in metadata/sitemap/structured data, and connect the client's domain. The owner setup flow currently depends on Sites' trusted authentication headers: replace it with a trusted owner identity mechanism before deploying outside Sites. Do not trust client-supplied identity headers on an independently hosted Worker.

For a new Sites deployment, create a new Site in the client's account and use its returned project ID and resources. Transfer any operational content or enquiries separately through an authorized data migration.

## Repository contents

- `apps/web/`: Next.js public/admin UI, source architecture placeholders, assets, and backend API client.
- `apps/cms/`: CMS/backend boundary, D1 schema, migrations, and deployment configuration.
- `tests/`: repository-level checks.

Keep `.env*`, `.dev.vars*`, `.wrangler/`, `.sites-runtime/`, dependencies, generated build output, and credentials out of Git. Third-party notices remain with their respective source files.
