# Kasturii Roadways Project Guide

This document is the operating guide for the Kasturii Roadways website and CMS. It describes the backend architecture, local development, content model, REST contract, contact workflow, deployment, backups, and editor procedures.

## 1. System overview

The project has two independently deployable applications:

- `apps/web`: Next.js 16 website, server-rendered pages, frontend API client, and cache revalidation route.
- `apps/cms`: Strapi 5 TypeScript CMS with PostgreSQL, media uploads, admin UI, REST API, custom contact endpoint, and content-change middleware.

The CMS is the source of truth for published website content. The frontend does not write CMS content and must never expose an administrator token or full-access API token. Booking is deliberately outside this CMS and is reserved for a future service.

### Request flow

```text
Browser
  ├─ GET published content ──> Next.js ──> Strapi REST + read-only API token
  ├─ POST contact form ──────> Strapi /api/contact
  └─ page request/cache ─────> Next.js

Strapi editor change
  └─ document middleware ────> Next.js /api/revalidate
                                  └─ revalidateTag(model)

Strapi
  └─ PostgreSQL
```

### Current boundaries

The CMS owns reference and editorial data:

- `city`, `stop`, `route`, `schedule`
- `coach-type`, `amenity`
- `gallery-item`, `promo-banner`, `safety-feature`
- `testimonial`, `faq`, `legal-page`
- `site-setting`
- private `contact-submission`

The following are reserved for Phase 2 and must not be added to Strapi now:

- `trip`, `seat-layout`, `seat`
- `booking`, `booking-passenger`, `payment`, `refund`
- `customer`, `coupon`, `loyalty-account`, `notification`
- `bus-location`
- `/api/v1/booking/*`

## 2. Repository layout

```text
kasturii-roadways/
├── apps/
│   ├── web/
│   │   ├── src/app/                         # Next.js routes
│   │   │   └── api/revalidate/route.ts      # Strapi webhook target
│   │   ├── src/lib/api.ts                   # CMS API client
│   │   ├── src/config.ts                    # frontend fallback content
│   │   └── .env.example
│   │
│   └── cms/
│       ├── config/
│       │   ├── server.ts                    # host, port, app keys
│       │   ├── database.ts                  # PostgreSQL connection
│       │   ├── admin.ts                     # Strapi admin secrets
│       │   ├── api.ts                       # REST limits
│       │   ├── middlewares.ts               # CORS and core middleware
│       │   └── plugins.ts                   # upload limits and breakpoints
│       ├── src/api/                         # central schemas and contact route
│       │   └── schemas/<type>/schema.json   # all content schemas
│       │   └── schemas/<type>/schema.json   # all content schemas
│       ├── src/components/shared/           # reusable components
│       ├── src/index.ts                    # schedule hook and revalidation
│       ├── scripts/seed.ts                  # idempotent demo seed
│       ├── public/uploads/                  # runtime media, not committed
│       ├── docker-compose.yml               # local PostgreSQL 16
│       ├── package.json
│       └── .env.example
│
├── docs/PROJECT-GUIDE.md
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## 3. Requirements and installation

Required:

- Node.js 20–24
- pnpm 11
- Docker Desktop or Docker Engine with Compose
- PostgreSQL 16 (provided locally by Compose)

Install from the repository root:

```powershell
pnpm install --frozen-lockfile
```

The CMS package uses Strapi 5, PostgreSQL (`pg`), `qs`, Zod, and TypeScript. The frontend remains a separate Next.js workspace package.

## 4. Local backend setup

### 4.1 Create CMS environment

```powershell
Copy-Item apps\cms\.env.example apps\cms\.env
```

For local development, the example values work except for secrets. Replace every `replace-with-*` value with a long random value. `APP_KEYS` must contain multiple comma-separated values.

Important local variables:

| Variable | Purpose | Local example |
|---|---|---|
| `HOST` | Strapi bind address | `0.0.0.0` |
| `PORT` | Strapi port | `1337` |
| `DATABASE_HOST` | PostgreSQL host | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_NAME` | Database name | `kasturii_roadways` |
| `DATABASE_USERNAME` | Database user | `postgres` |
| `DATABASE_PASSWORD` | Database password | `postgres` |
| `DATABASE_SSL` | PostgreSQL TLS switch | `false` |
| `SITE_URL` | Frontend URL used by revalidation | `http://localhost:3000` |
| `REVALIDATE_SECRET` | Shared Strapi/Next.js webhook secret | random secret |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server secret | local/test secret |
| `BUSINESS_EMAIL` | Contact notification recipient | business inbox |
| `RESEND_API_KEY` | Optional Resend API key | secret |
| `RESEND_FROM` | Optional verified sender | verified sender |
| `CONTACT_RATE_LIMIT` | Contact attempts per IP/hour | `5` |

`CORS_ORIGINS` is optional locally and defaults to `http://localhost:3000`. For multiple origins, use a comma-separated list:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 4.2 Start PostgreSQL

```powershell
docker compose -f apps\cms\docker-compose.yml up -d
```

Check the database container:

```powershell
docker compose -f apps\cms\docker-compose.yml ps
```

Stop it without deleting data:

```powershell
docker compose -f apps\cms\docker-compose.yml down
```

Delete the local database volume only when intentionally resetting local data:

```powershell
docker compose -f apps\cms\docker-compose.yml down -v
```

### 4.3 Start Strapi

```powershell
pnpm --dir apps\cms develop
```

Open:

- Admin: `http://localhost:1337/admin`
- REST base: `http://localhost:1337/api`
- Health check: use the Strapi admin or request a known REST resource

On first run, create a Strapi administrator. Create separate accounts for client staff instead of sharing one account.

### 4.4 Seed demo content

With PostgreSQL and Strapi available:

```powershell
pnpm --dir apps\cms seed
```

The seed is intended to be repeatable. It:

- creates or updates three cities;
- creates 13 amenities;
- creates four unpublished coach types;
- creates seven unpublished safety features;
- creates ten unpublished FAQ entries with `To be confirmed.`;
- creates an empty site setting with WhatsApp, redBus, and MMT fields blank.

Demo records that are not client-approved remain drafts. Never publish demo or placeholder content on a production site.

## 5. Strapi configuration

### Server

`apps/cms/config/server.ts` reads `HOST`, `PORT`, `APP_KEYS`, and `SITE_URL`. `SITE_URL` is used as the base for the Next.js revalidation request.

### Database

`apps/cms/config/database.ts` uses PostgreSQL and reads host, port, database, username, password, schema, SSL, and pool settings from environment variables. Production PostgreSQL must not be exposed publicly.

### REST limits

`apps/cms/config/api.ts` sets:

- default page size: 25;
- maximum page size: 100;
- response counts enabled.

Always use pagination from the frontend for collection endpoints.

### CORS

`apps/cms/config/middlewares.ts` allows only origins listed in `CORS_ORIGINS`. Never use `*` in production. Keep the public website origin and any explicitly approved staging origin in the list.

### Uploads

`apps/cms/config/plugins.ts` enables responsive image breakpoints:

- large: 1000px
- medium: 750px
- small: 500px

Allowed image types are JPEG, PNG, WebP, AVIF, and SVG. The default upload size limit is 10 MiB. Runtime files under `apps/cms/public/uploads/` are not committed and must be included in deployment backups.

## 6. Content model

All editorial content below uses Strapi Draft & Publish unless stated otherwise. The frontend reads only published content.

### `site-setting` singleton

Used by the header, footer, contact section, booking links, offices, social links, and default SEO.

Fields:

- `header`, `footer`: rich text;
- `contact`: address component;
- `WhatsApp`: WhatsApp contact value, initially empty;
- `redBus`: redBus URL, initially empty;
- `MMT`: MakeMyTrip URL, initially empty;
- `logo`: image;
- `registeredOffice`, `operationalOffice`: address components;
- `socialLinks`: repeatable social-link component;
- `defaultSeo`: SEO component;
- `businessEmail`, `phone`, `officeHours`.

Do not publish unverified phone numbers, addresses, booking links, or social accounts.

### `city`

Used by From/To dropdowns and route relationships.

- `name`: unique display name;
- `slug`: unique UID;
- `code`: optional transport/airport code;
- `isActive`: operational display flag;
- relations to `stop`, origin routes, and destination routes.

### `stop`

A boarding or dropping location:

- `name`;
- `address`;
- `city`;
- optional `latitude` and `longitude`.

### `route`

Used by popular routes, route pages, and quick booking search:

- `title`;
- `slug`;
- `origin` city;
- `destination` city;
- `description`;
- `popular`;
- `isSample`;
- `schedules`;
- `testimonials`;
- optional `seo`.

Only publish a route after its origin, destination, schedules, coach type, and stops are also approved and published.

### `schedule`

Reference timetable attached to a route:

- `name`;
- `route`;
- `coachType`;
- `departureTime`;
- `arrivalTime`;
- `arrivalDayOffset`;
- computed `durationMinutes`;
- repeatable boarding point references;
- repeatable dropping point references;
- `amenities`;
- `isSample`.

The document middleware computes duration in minutes. Same-day arrival must be after departure. Overnight schedules use a positive `arrivalDayOffset`; arrival before departure is rejected.

This is not a dated trip and does not contain seats, fares, PNRs, or booking availability.

### `coach-type`

Used by the coach section and schedules:

- `name`;
- `slug`;
- `description`;
- `image`;
- `amenities`;
- gallery items and schedules.

### `amenity`

Used by the amenities section and coach/schedule relationships:

- `name`;
- `slug`;
- `description`;
- `icon`;
- related coach types.

The seed creates 13 demo amenities. Verify each feature before publishing.

### `gallery-item`

- `title`;
- required `image`;
- optional `caption`;
- optional `coachType`.

Use approved fleet or facility images only. Do not describe concept artwork as a real bus.

### `safety-feature`

- `title`;
- `description`;
- `icon`;
- `sortOrder`.

The seed creates seven unpublished placeholders. Publish only verified safety statements.

### `promo-banner`

- `title`;
- optional `link`;
- required desktop image;
- optional mobile image;
- `sortOrder`;
- optional `startsAt` and `endsAt`.

The frontend should treat dates as display-window metadata; expired banners must not be presented as current promotions.

### `testimonial`

- `quote`;
- `author`;
- optional `role`;
- `rating` from 1 to 5;
- optional route relationship.

Publish only client-approved reviews and preserve the author’s approved wording.

### `faq`

- `question`;
- rich-text `answer`;
- `sortOrder`.

The seed creates ten unpublished FAQs. Placeholder answers must remain unpublished.

### `legal-page`

- `title`;
- `slug`;
- rich-text `body`;
- optional SEO component.

Legal content requires client approval before publication.

### `contact-submission`

Private, non-published operational records:

- `name`, `mobile`, `email`, `subject`, `message`;
- hashed `ipHash`;
- `status`: `new`, `read`, or `resolved`.

These fields must not be granted to the frontend token or public role.

## 7. REST API contract

The frontend uses Strapi REST responses:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 0
    }
  }
}
```

The singleton response is:

```json
{
  "data": {
    "id": 1,
    "documentId": "..."
  },
  "meta": {}
}
```

### Endpoint and population matrix

| Endpoint | Frontend use | Required population |
|---|---|---|
| `GET /api/site-setting` | Header, footer, contact, links, offices, social, default SEO | `logo`, `contact`, `registeredOffice`, `operationalOffice`, `socialLinks`, `defaultSeo.ogImage` |
| `GET /api/cities` | From/To dropdowns | none |
| `GET /api/routes` | Popular routes, route pages, quick-booking search | `origin`, `destination`, `schedules` |
| `GET /api/coach-types` | Coaches section | `image`, `amenities` |
| `GET /api/gallery-items` | Gallery | `image`, `coachType` |
| `GET /api/amenities` | Amenities section | none |
| `GET /api/safety-features` | Safety section | none |
| `GET /api/promo-banners` | Banner strip | `imageDesktop`, `imageMobile` |
| `GET /api/testimonials` | Reviews | `route` |
| `GET /api/faqs` | FAQ page and FAQPage schema | none |
| `GET /api/legal-pages` | Legal pages | `seo` |
| `POST /api/contact` | Contact form | custom route; no population |

For routes, the frontend must also populate nested schedule relationships:

- `schedules.coachType`;
- `schedules.amenities`;
- `schedules.boardingPoints.stop`;
- `schedules.droppingPoints.stop`.

### Building queries with `qs`

Do not hand-concatenate nested query strings. Use the `qs` package:

```ts
import qs from "qs";

const query = qs.stringify(
  {
    status: "published",
    pagination: { page: 1, pageSize: 25 },
    sort: ["sortOrder:asc", "createdAt:desc"],
    populate: {
      schedules: {
        populate: {
          coachType: { populate: ["image", "amenities"] },
          amenities: true,
          boardingPoints: { populate: ["stop"] },
          droppingPoints: { populate: ["stop"] },
        },
      },
      origin: true,
      destination: true,
    },
  },
  { encodeValuesOnly: true },
);

const response = await fetch(`${CMS_URL}/routes?${query}`, {
  headers: { Authorization: `Bearer ${READ_ONLY_API_TOKEN}` },
});
```

Strapi Draft & Publish defaults to published REST results. Do not send `status=draft` from the frontend. The frontend always reads published content.

### Read-only API token

In Strapi:

1. Open Settings → API Tokens.
2. Create a token with read-only type.
3. Grant `find` and `findOne` only for the published content types used by the site.
4. Do not grant contact-submission access.
5. Store the token only in a server-side environment variable.

If browser-side requests require the token, use a server-side Next.js proxy instead of exposing it as `NEXT_PUBLIC_*`.

The public role should remain empty. The contact route is explicitly configured as public because it performs its own validation and Turnstile verification.

## 8. Contact form workflow

### Request

```json
{
  "name": "Customer Name",
  "mobile": "+91 9876543210",
  "email": "customer@example.com",
  "subject": "Route enquiry",
  "message": "Please share the expected service details.",
  "turnstileToken": "token-from-cloudflare",
  "website": ""
}
```

`website` is a honeypot and must be empty.

### Validation

- `name`: trimmed, 2–80 characters;
- `mobile`: Indian 10-digit number beginning with 6–9;
- accepted mobile prefixes: spaces, `+91`, `91`, or leading `0`;
- `email`: optional, but valid when supplied;
- `subject`: 3–120 characters;
- `message`: 10–2000 characters;
- `turnstileToken`: required;
- `website`: must be empty.

### Responses

| Status | Response |
|---:|---|
| `201` | `{ "ok": true }` |
| `400` | `{ "ok": false, "errors": { "field": "message" } }` |
| `429` | `{ "ok": false, "error": "rate_limited" }` |
| `500` | `{ "ok": false, "error": "server_error" }` |

The controller:

1. parses and validates the body;
2. rejects the honeypot;
3. applies the configured per-IP hourly limit;
4. verifies the token with Cloudflare Turnstile;
5. hashes the IP with a server secret;
6. stores a private `contact-submission`;
7. optionally sends a Resend notification to `BUSINESS_EMAIL`.

The in-memory application limit is process-local. Production should also apply an Nginx or load-balancer rate limit to `POST /api/contact`, because multiple Strapi instances do not share process memory.

## 9. Schedule validation and cache revalidation

### Schedule middleware

`apps/cms/src/index.ts` registers Strapi document middleware. On schedule create/update it:

- validates `HH:mm:ss` or `HH:mm:ss.SSS` values;
- calculates `durationMinutes`;
- adds `arrivalDayOffset * 1440` for overnight schedules;
- rejects a non-positive duration.

On create, update, delete, publish, and unpublish of supported editorial models, it sends:

```http
POST {SITE_URL}/api/revalidate
x-revalidate-secret: {REVALIDATE_SECRET}
content-type: application/json

{ "tag": "route" }
```

### Next.js revalidation endpoint

`apps/web/src/app/api/revalidate/route.ts`:

- rejects requests without the shared secret;
- validates the tag against the supported model allowlist;
- calls `revalidateTag(tag, "max")`;
- returns `200 { "ok": true }` only after accepting the tag.

Never log or expose `REVALIDATE_SECRET`.

## 10. Editor workflow

1. Sign in at `/admin`.
2. Create or edit reference data first: cities, stops, amenities, coach types.
3. Create routes and connect origin/destination cities.
4. Add schedules, coach types, amenities, boarding points, and dropping points.
5. Upload approved images and add gallery or banner content.
6. Add approved FAQs, testimonials, legal pages, and site settings.
7. Review all relation fields and media.
8. Save as draft.
9. Preview or inspect the REST response with the read-only token.
10. Publish in dependency order.
11. Confirm the frontend reflects the update after revalidation.

Unpublish dependent content before unpublishing a reference entry. For example, unpublish a route’s schedules before unpublishing a coach type or stop used by those schedules.

## 11. Production deployment

### Infrastructure

Recommended production layout:

```text
Internet
  └─ Nginx :443
       ├─ cms.example.com  ──> Strapi container :1337
       └─ www.example.com   ──> Next.js container

PostgreSQL :5432
  └─ private Docker network; never published to the internet
```

Use a VPS in an India region if required by the project. Expose only ports 80, 443, and SSH. Use SSH keys, a non-root deploy user, TLS certificates, and a firewall.

### Production environment

Set all values from `apps/cms/.env.example` through the deployment secret manager or protected environment file. Do not commit the real `.env`.

Use separate secrets and databases for staging and production. Set:

- `CORS_ORIGINS` to the exact staging or production website origin;
- `SITE_URL` to the website origin, not the CMS origin;
- `DATABASE_SSL=true` when required by the managed PostgreSQL provider;
- `REVALIDATE_SECRET` identically in Strapi and Next.js;
- Turnstile production secret;
- Resend production key, sender, and business recipient.

### Deployment checklist

- build the CMS with `pnpm --dir apps/cms build`;
- build the website with `pnpm --dir apps/web build`;
- run Strapi with `pnpm --dir apps/cms start`;
- run Next.js with `pnpm --dir apps/web start`;
- put Nginx in front of both services;
- configure TLS and redirect HTTP to HTTPS;
- configure upload persistence;
- create editor accounts;
- create the read-only frontend API token;
- verify CORS from the production website;
- test a published REST request;
- test contact validation and Turnstile;
- test a content update and confirm revalidation;
- confirm PostgreSQL backups and restore procedure.

## 12. Backups and restore

Back up both:

1. PostgreSQL database;
2. `apps/cms/public/uploads/` runtime media.

Example database dump:

```powershell
pg_dump --format=custom --file=kasturii-roadways-$(Get-Date -Format yyyyMMdd).dump $env:DATABASE_NAME
```

Example restore to an empty database:

```powershell
pg_restore --clean --if-exists --dbname=$env:DATABASE_NAME .\kasturii-roadways-20261031.dump
```

Run a nightly dump and upload it to off-server storage. Keep encrypted, rotated copies. Perform at least one restore test before launch and record the result. A database dump without the uploads directory is incomplete.

## 13. Validation and troubleshooting

### Standard checks

```powershell
pnpm run typecheck
pnpm --dir apps/cms build
pnpm --dir apps\web build
git diff --check
```

### CMS will not start

Check:

- PostgreSQL container status;
- `DATABASE_HOST`, port, database, username, and password;
- all Strapi secrets are present;
- Node.js version is 20–24;
- no other process is using port 1337.

### REST returns 403

Check that the API token:

- is sent as `Authorization: Bearer ...`;
- is not expired;
- has `find` and `findOne` permissions;
- is not a full admin token accidentally restricted by a different environment.

### REST returns empty data

Check:

- the entry is published;
- related entries are also published;
- the query includes the required `populate`;
- the frontend is using the correct CMS URL;
- the API token belongs to the same environment.

### Browser reports CORS failure

Check that the exact website origin, including scheme and port, is in `CORS_ORIGINS`. Do not include a trailing path. Restart Strapi after changing environment variables.

### Contact returns 400

Check field lengths, mobile normalization, an empty honeypot, a valid Turnstile token, and `TURNSTILE_SECRET_KEY`. A missing Turnstile secret intentionally causes verification failure.

### Contact returns 429

The configured IP has reached `CONTACT_RATE_LIMIT` within the hourly window. Also check Nginx or upstream rate limits.

### Content update is not visible

Check:

- Strapi logged a revalidation warning;
- `SITE_URL` points to the Next.js website;
- `REVALIDATE_SECRET` matches both applications;
- the tag is in both model allowlists;
- the frontend request uses the same tag when caching CMS data.

## 14. Security and data handling

- Never commit `.env`, API tokens, private keys, database dumps, or customer submissions.
- Never expose `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `APP_KEYS`, `JWT_SECRET`, Turnstile secret, Resend key, or `REVALIDATE_SECRET`.
- Do not put a Strapi read token in a `NEXT_PUBLIC_*` variable.
- Keep the public role empty.
- Keep `contact-submission` fields private.
- Keep PostgreSQL private.
- Use HTTPS in staging and production.
- Do not store payment details, identity documents, passwords, or booking records in this CMS.
- Publish only client-approved routes, contact details, reviews, images, safety claims, and legal text.

## 15. Git and generated files

Commit:

- source code;
- Strapi JSON schemas and components;
- configuration source;
- `package.json` and `pnpm-lock.yaml`;
- `.env.example` files;
- Docker Compose;
- documentation.

Do not commit:

- `.env`, `.env.local`, `.dev.vars`;
- `node_modules/`;
- `.next/`, Strapi build output, or TypeScript build metadata;
- local PostgreSQL volumes;
- `apps/cms/public/uploads/*`;
- database dumps;
- contact submissions or production exports.

## 16. Phase 2 reservation

The booking engine will likely be a separate service with its own tables and API. Strapi remains responsible for reference data that the booking service consumes:

```text
city → stop → route → schedule → coach-type
```

When booking is implemented, the frontend must continue using the `BookingProvider` interface. The UI should not depend directly on Strapi booking tables or URLs.
