# Kasturii Roadways

Complete source of the Kasturii Roadways website, including the public travel website, shared-password administration, enquiry storage, database migrations, tests, and project assets.

## Technology

React 19, TypeScript, Vinext (Next.js-compatible routing on Cloudflare Workers), Cloudflare D1 (SQLite), Drizzle migrations, and custom CSS. This is not a static HTML-only project and is not a drop-in Vercel deployment.

## Install and run

Use Node.js 24 LTS and pnpm compatible with the lockfile.

```sh
pnpm install --frozen-lockfile
pnpm run build
```

The repository retains the Sites starter's scripts and hosting manifest. The current project ID identifies the existing live Site; do not use that ID to deploy an unrelated client-owned Site.

For local D1 development, after building, apply each SQL migration in the `drizzle/` directory once, in filename order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_kind_pride.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_perfect_black_panther.sql
pnpm dev
```

Local preview uses its own database. Production data is not included in this repository. See `SETUP-REFERENCE.md` for the original starter's environment and build details.

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
pnpm exec tsc --noEmit
node tests/admin-auth.mjs
pnpm run build
```

The authentication test uses an in-memory SQLite database and mocked request identity. It checks password hashing, owner-only setup, CSRF rejection, login, session expiry, logout, reset revocation, and rate limiting.

## Content and data

`app/config.ts` defines the default content. The admin saves configured content in D1. Customer enquiries, configured content, admin password hashes, and sessions are runtime data and are intentionally not committed. The hero is generated concept imagery, not a verified fleet photograph.

Confirmed routes, fares, fleet photos, contact details, booking-platform links, and client-approved legal policies must be supplied before passenger launch. The website currently supports enquiries and links to external booking services, not seat inventory, payment processing, or ticket issuance. Enquiries are stored in admin; email notifications are not implemented.

## Client-owned deployment

This repository is a source-code handover, not a hosting ownership transfer or an automatic GitHub deployment integration.

For a separate Cloudflare deployment, provision client-owned Workers/D1 resources, configure the build output and bindings, apply migrations, replace current Site URLs in metadata/sitemap/structured data, and connect the client's domain. The owner setup flow currently depends on Sites' trusted authentication headers: replace it with a trusted owner identity mechanism before deploying outside Sites. Do not trust client-supplied identity headers on an independently hosted Worker.

For a new Sites deployment, create a new Site in the client's account and use its returned project ID and resources. Transfer any operational content or enquiries separately through an authorized data migration.

## Repository contents

- `app/`: public UI, admin UI, authentication, API routes, metadata.
- `db/`, `drizzle/`: schema and versioned migrations.
- `public/`: web assets, including the illustrative coach image.
- `worker/`, `scripts/`, `vendor/`: runtime and build integration.
- `tests/`: authentication checks.

Keep `.env*`, `.dev.vars*`, `.wrangler/`, `.sites-runtime/`, dependencies, generated build output, and credentials out of Git. Third-party notices remain with their respective source files.
