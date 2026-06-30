# Analytic Column Management

Controlled column lifecycle management for pharma API QC laboratories.

## Modules

- Masters
- Receipt
- Issuance
- Performance
- Destruction
- Reviews
- Audit
- Settings

## Stack

- Next.js App Router
- TypeScript
- Auth.js
- Neon Postgres
- Drizzle ORM
- Vitest

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Without `DATABASE_URL`, the app runs in local demo mode for UI verification. Production should set `DATABASE_URL` and `AUTH_SECRET`.

## Database

```bash
npm run db:migrate
npm run db:seed
```

## Vercel

Set these environment variables in Vercel:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST=true`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD` (one-time bootstrap only; remove it after seeding)

Deploy as a Next.js project. Run database migration and seed against the Neon database before expecting production login to work.
