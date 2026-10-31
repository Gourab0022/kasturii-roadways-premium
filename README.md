# Kasturii Roadways

Kasturii Roadways is a Next.js website backed by a Strapi 5 CMS.

## Stack

- `apps/web`: Next.js 16, React 19, TypeScript.
- `apps/cms`: Strapi 5, TypeScript, PostgreSQL.
- Local CMS database: PostgreSQL 16 via Docker Compose.

## Install and run

```sh
pnpm install --frozen-lockfile
copy apps\cms\.env.example apps\cms\.env
docker compose -f apps/cms/docker-compose.yml up -d
pnpm --dir apps/cms develop
pnpm --dir apps/web dev
```

Strapi runs at `http://localhost:1337`; the website runs at `http://localhost:3000`. Create an administrator at `http://localhost:1337/admin`, then create a read-only API token. Set `CMS_API_URL=http://localhost:1337/api`, `CMS_API_TOKEN=<read-only-token>`, and `NEXT_PUBLIC_API_URL=/api/cms` in the web environment. The Next.js proxy keeps the Strapi token server-side.

Demo data is idempotent:

```sh
pnpm --dir apps/cms seed
```

## CMS contract

The centralized schema source is [`apps/cms/src/schemas/`](C:/Users/nares/Desktop/Web%20Work/Kasturii%20Roadways/kasturii-roadways-premium/apps/cms/src/schemas/). It contains one flat JSON file per content type, such as `city.json` and `route.json`. Strapi’s native discovery convention remains `src/api/<type>/content-types/<type>/schema.json`; a schema-loader/build step is required before Strapi can load the centralized files.

The flat schema files provide the REST resources used by the site: site setting, cities, routes, coach types, gallery items, amenities, safety features, promo banners, testimonials, FAQs, and legal pages. Draft & Publish is enabled for editorial content; the frontend token is granted read-only permissions and reads published entries only.

`POST /api/contact` validates the documented contact payload, rejects the honeypot, verifies Cloudflare Turnstile, rate-limits by IP, stores a private contact submission, and optionally sends a Resend notification.

Strapi document middleware computes schedule duration and rejects invalid same-day times. It also calls the Next.js `/api/revalidate` endpoint with `x-revalidate-secret` after content changes. Booking entities remain reserved for a future `/api/v1/booking/*` service.

See [`docs/PROJECT-GUIDE.md`](C:/Users/nares/Desktop/Web%20Work/Kasturi%20Roadways/kasturii-roadways-premium/docs/PROJECT-GUIDE.md) for deployment, permissions, environment variables, and API population examples.

## Validation

```sh
pnpm run typecheck
pnpm --dir apps/cms build
pnpm --dir apps/web build
```

Never commit `.env` files, API tokens, database exports, uploads, or customer submissions.
